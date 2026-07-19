import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { EventBus } from "@/lib/events";
import type { WhatsAppCallingClient } from "@/modules/calling/adapters/client";
import {
  CallActionRequestSchema,
  CallPermissionRequestSchema,
  InitiateCallRequestSchema,
  type CallStatus
} from "@/modules/calling/contracts";
import type { CallRecord, CallsRepository } from "@/modules/calling/repository";
import type { ContactsRepository } from "@/modules/contacts/repository";
import type { ConversationsRepository } from "@/modules/conversations/repository";
import type { MessagesRepository } from "@/modules/messages/repository";
import type { VapiClient } from "@/modules/voice-agent/adapters/vapi";
import type { VoiceAgentService } from "@/modules/voice-agent/service";

function serializeCall(call: CallRecord) {
  return {
    id: call.id,
    organizationId: call.organizationId,
    conversationId: call.conversationId,
    contactId: call.contactId,
    phone: call.phone,
    direction: call.direction,
    status: call.status,
    channel: call.channel,
    provider: call.provider,
    providerCallId: call.providerCallId,
    agentUserId: call.agentUserId,
    answerSdp: call.answerSdp,
    durationSeconds: call.durationSeconds,
    errorMessage: call.errorMessage,
    summary: call.summary,
    startedAt: call.startedAt?.toISOString() ?? null,
    endedAt: call.endedAt?.toISOString() ?? null,
    createdAt: call.createdAt.toISOString()
  };
}

export class CallingService {
  constructor(
    private readonly calls: CallsRepository,
    private readonly client: WhatsAppCallingClient,
    private readonly conversations: ConversationsRepository,
    private readonly contacts: ContactsRepository,
    private readonly messages: MessagesRepository,
    private readonly auditLogger: AuditLogger,
    private readonly eventBus?: EventBus,
    private readonly vapiClient?: VapiClient,
    private readonly voiceAgentService?: VoiceAgentService
  ) {}

  private requireCaller(context: AuthContext): void {
    requireAnyRole(context, ["admin", "manager", "agent"]);
  }

  async list(
    context: AuthContext,
    filters?: { conversationId?: string; contactId?: string }
  ) {
    this.requireCaller(context);
    const rows = await this.calls.listByOrganization(context.organizationId, {
      ...filters,
      limit: 50
    });
    return rows.map(serializeCall);
  }

  async get(context: AuthContext, callId: string) {
    this.requireCaller(context);
    const call = await this.calls.findById(context.organizationId, callId);
    if (!call) {
      throw new AppError("NOT_FOUND", 404, "Call not found");
    }
    return serializeCall(call);
  }

  private async resolveTarget(
    context: AuthContext,
    input: { conversationId?: string; contactId?: string }
  ): Promise<{
    conversationId: string | null;
    contactId: string;
    phone: string;
  }> {
    if (input.conversationId) {
      const conversation = await this.conversations.findById(
        context.organizationId,
        input.conversationId
      );
      if (!conversation) {
        throw new AppError("NOT_FOUND", 404, "Conversation not found");
      }
      return {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        phone: conversation.phone
      };
    }
    if (input.contactId) {
      const contact = await this.contacts.findById(context.organizationId, input.contactId);
      if (!contact) {
        throw new AppError("NOT_FOUND", 404, "Contact not found");
      }
      return {
        conversationId: null,
        contactId: contact.id,
        phone: contact.phone
      };
    }
    throw new AppError("VALIDATION_ERROR", 400, "conversationId or contactId required");
  }

  private async ensureNoActiveCall(organizationId: string, contactId: string): Promise<void> {
    const active = await this.calls.listByOrganization(organizationId, {
      contactId,
      limit: 10
    });
    if (
      active.some((c) =>
        ["initiated", "ringing", "connecting", "active"].includes(c.status)
      )
    ) {
      throw new AppError("CONFLICT", 409, "There is already an active call for this contact");
    }
  }

  async initiate(context: AuthContext, payload: unknown) {
    this.requireCaller(context);
    const parsed = InitiateCallRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid call payload",
        parsed.error.flatten()
      );
    }

    if (parsed.data.channel === "vapi") {
      return this.initiateVapi(context, parsed.data);
    }
    return this.initiateWhatsApp(context, parsed.data);
  }

  private async initiateWhatsApp(
    context: AuthContext,
    data: {
      conversationId?: string;
      contactId?: string;
      sdp?: string;
    }
  ) {
    const target = await this.resolveTarget(context, data);
    await this.ensureNoActiveCall(context.organizationId, target.contactId);

    const call = await this.calls.create({
      organizationId: context.organizationId,
      conversationId: target.conversationId,
      contactId: target.contactId,
      phone: target.phone,
      direction: "business_initiated",
      status: "initiated",
      channel: "whatsapp",
      provider: "whatsapp",
      agentUserId: context.userId
    });

    const result = await this.client.connect({
      organizationId: context.organizationId,
      to: target.phone,
      sdp: data.sdp,
      sdpType: "offer",
      bizOpaqueCallbackData: call.id
    });

    if (result.status === "failed") {
      const failed = await this.calls.update(context.organizationId, call.id, {
        status: "failed",
        errorMessage: result.errorMessage ?? "Call connect failed",
        endedAt: new Date()
      });
      await this.auditLogger.log({
        action: "call.failed",
        organizationId: context.organizationId,
        actorUserId: context.userId,
        entityType: "voice_call",
        entityId: call.id,
        metadata: { error: result.errorMessage, channel: "whatsapp" }
      });
      return serializeCall(failed!);
    }

    const isMock = !data.sdp || result.answerSdp !== undefined;
    const nextStatus: CallStatus = isMock && !data.sdp ? "active" : "ringing";
    const updated = await this.calls.update(context.organizationId, call.id, {
      providerCallId: result.providerCallId,
      status: nextStatus,
      answerSdp: result.answerSdp ?? null,
      startedAt: nextStatus === "active" ? new Date() : null
    });

    if (target.conversationId) {
      await this.messages.create({
        organizationId: context.organizationId,
        conversationId: target.conversationId,
        contactId: target.contactId,
        direction: "outbound",
        body:
          nextStatus === "active"
            ? "📞 Voice call connected (WhatsApp)"
            : "📞 Outbound WhatsApp voice call started",
        status: "sent",
        providerMessageId: result.providerCallId,
        createdByUserId: context.userId
      });
    }

    await this.auditLogger.log({
      action: "call.initiated",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "voice_call",
      entityId: call.id,
      metadata: {
        providerCallId: result.providerCallId,
        phone: target.phone,
        status: nextStatus,
        channel: "whatsapp"
      }
    });

    this.eventBus?.publish({
      organizationId: context.organizationId,
      type: "call.updated",
      payload: { callId: call.id, status: nextStatus, channel: "whatsapp" }
    });

    return serializeCall(updated!);
  }

  /**
   * Place an AI voice call via Vapi using the tenant's voice agent context.
   */
  private async initiateVapi(
    context: AuthContext,
    data: { conversationId?: string; contactId?: string }
  ) {
    if (!this.vapiClient || !this.voiceAgentService) {
      throw new AppError("INTERNAL_ERROR", 500, "Vapi calling is not configured");
    }

    const target = await this.resolveTarget(context, data);
    await this.ensureNoActiveCall(context.organizationId, target.contactId);

    const voiceConfig = await this.voiceAgentService.getInternal(context.organizationId);
    if (!voiceConfig.enabled) {
      throw new AppError(
        "FORBIDDEN",
        403,
        "AI voice agent is disabled. Enable it under Settings → AI voice agent."
      );
    }

    const contact = await this.contacts.findById(context.organizationId, target.contactId);
    let conversationContext = "";
    if (target.conversationId) {
      const msgs = await this.messages.listByConversation(
        context.organizationId,
        target.conversationId
      );
      conversationContext = msgs
        .slice(-12)
        .map((m) => `${m.direction === "inbound" ? "Customer" : "Agent"}: ${m.body}`)
        .join("\n");
    }

    const call = await this.calls.create({
      organizationId: context.organizationId,
      conversationId: target.conversationId,
      contactId: target.contactId,
      phone: target.phone,
      direction: "business_initiated",
      status: "initiated",
      channel: "vapi",
      provider: "vapi",
      agentUserId: context.userId
    });

    const result = await this.vapiClient.createOutboundCall({
      to: target.phone,
      config: voiceConfig,
      callId: call.id,
      contactName: contact?.fullName,
      conversationContext,
      apiKey: voiceConfig.vapiApiKey,
      phoneNumberId: voiceConfig.vapiPhoneNumberId,
      assistantId: voiceConfig.vapiAssistantId
    });

    if (result.status === "failed") {
      const failed = await this.calls.update(context.organizationId, call.id, {
        status: "failed",
        errorMessage: result.errorMessage ?? "Vapi call failed",
        endedAt: new Date()
      });
      await this.auditLogger.log({
        action: "call.failed",
        organizationId: context.organizationId,
        actorUserId: context.userId,
        entityType: "voice_call",
        entityId: call.id,
        metadata: { error: result.errorMessage, channel: "vapi" }
      });
      return serializeCall(failed!);
    }

    // Mock Vapi connects immediately; live Vapi reports via webhook.
    const nextStatus: CallStatus = "active";
    const updated = await this.calls.update(context.organizationId, call.id, {
      providerCallId: result.providerCallId,
      status: nextStatus,
      startedAt: new Date()
    });

    if (target.conversationId) {
      await this.messages.create({
        organizationId: context.organizationId,
        conversationId: target.conversationId,
        contactId: target.contactId,
        direction: "outbound",
        body: `🤖 AI voice call started via Vapi (${voiceConfig.agentName})`,
        status: "sent",
        providerMessageId: result.providerCallId,
        createdByUserId: context.userId
      });
    }

    await this.auditLogger.log({
      action: "call.initiated",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "voice_call",
      entityId: call.id,
      metadata: {
        providerCallId: result.providerCallId,
        phone: target.phone,
        status: nextStatus,
        channel: "vapi",
        agentName: voiceConfig.agentName
      }
    });

    this.eventBus?.publish({
      organizationId: context.organizationId,
      type: "call.updated",
      payload: { callId: call.id, status: nextStatus, channel: "vapi" }
    });

    return serializeCall(updated!);
  }

  async requestPermission(context: AuthContext, payload: unknown) {
    this.requireCaller(context);
    const parsed = CallPermissionRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid permission request",
        parsed.error.flatten()
      );
    }
    const target = await this.resolveTarget(context, parsed.data);
    const result = await this.client.requestPermission({
      organizationId: context.organizationId,
      to: target.phone
    });
    if (result.status === "failed") {
      throw new AppError(
        "INTERNAL_ERROR",
        502,
        result.errorMessage ?? "Failed to send call permission request"
      );
    }

    if (target.conversationId) {
      await this.messages.create({
        organizationId: context.organizationId,
        conversationId: target.conversationId,
        contactId: target.contactId,
        direction: "outbound",
        body: "📞 Call permission request sent — customer can allow WhatsApp voice calls.",
        status: "sent",
        providerMessageId: result.providerMessageId,
        createdByUserId: context.userId
      });
    }

    const call = await this.calls.create({
      organizationId: context.organizationId,
      conversationId: target.conversationId,
      contactId: target.contactId,
      phone: target.phone,
      direction: "business_initiated",
      status: "permission_pending",
      channel: "whatsapp",
      provider: "whatsapp",
      providerCallId: result.providerMessageId,
      agentUserId: context.userId
    });

    await this.auditLogger.log({
      action: "call.permission_requested",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "voice_call",
      entityId: call.id,
      metadata: { phone: target.phone }
    });

    return serializeCall(call);
  }

  async terminate(context: AuthContext, callId: string, payload: unknown = {}) {
    this.requireCaller(context);
    CallActionRequestSchema.safeParse(payload);
    const call = await this.calls.findById(context.organizationId, callId);
    if (!call) {
      throw new AppError("NOT_FOUND", 404, "Call not found");
    }
    if (["completed", "failed", "rejected", "missed"].includes(call.status)) {
      return serializeCall(call);
    }

    // WhatsApp Meta terminate only; Vapi ends via user hangup / dashboard / webhook
    if (
      call.channel === "whatsapp" &&
      call.providerCallId &&
      call.status !== "permission_pending"
    ) {
      const result = await this.client.terminate({
        organizationId: context.organizationId,
        providerCallId: call.providerCallId
      });
      if (!result.success) {
        throw new AppError(
          "INTERNAL_ERROR",
          502,
          result.errorMessage ?? "Failed to terminate call"
        );
      }
    }

    const endedAt = new Date();
    const durationSeconds =
      call.startedAt != null
        ? Math.max(0, Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000))
        : 0;
    const updated = await this.calls.update(context.organizationId, call.id, {
      status: "completed",
      endedAt,
      durationSeconds
    });

    if (call.conversationId) {
      const label = call.channel === "vapi" ? "AI voice call" : "Call";
      await this.messages.create({
        organizationId: context.organizationId,
        conversationId: call.conversationId,
        contactId: call.contactId,
        direction: "outbound",
        body: `📞 ${label} ended${durationSeconds ? ` (${durationSeconds}s)` : ""}`,
        status: "sent",
        createdByUserId: context.userId
      });
    }

    await this.auditLogger.log({
      action: "call.terminated",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "voice_call",
      entityId: call.id,
      metadata: { durationSeconds, channel: call.channel }
    });

    return serializeCall(updated!);
  }

  async accept(context: AuthContext, callId: string, payload: unknown = {}) {
    this.requireCaller(context);
    const parsed = CallActionRequestSchema.safeParse(payload);
    const call = await this.calls.findById(context.organizationId, callId);
    if (!call) {
      throw new AppError("NOT_FOUND", 404, "Call not found");
    }
    if (call.channel === "vapi") {
      throw new AppError("VALIDATION_ERROR", 400, "Vapi AI calls are answered by the voice agent");
    }
    if (!call.providerCallId) {
      throw new AppError("VALIDATION_ERROR", 400, "Call has no provider id");
    }
    const result = await this.client.accept({
      organizationId: context.organizationId,
      providerCallId: call.providerCallId,
      sdp: parsed.success ? parsed.data.sdp : undefined,
      sdpType: parsed.success ? parsed.data.sdpType : "answer"
    });
    if (!result.success) {
      throw new AppError("INTERNAL_ERROR", 502, result.errorMessage ?? "Accept failed");
    }
    const updated = await this.calls.update(context.organizationId, call.id, {
      status: "active",
      agentUserId: context.userId,
      startedAt: call.startedAt ?? new Date()
    });
    await this.auditLogger.log({
      action: "call.accepted",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "voice_call",
      entityId: call.id
    });
    return serializeCall(updated!);
  }

  async reject(context: AuthContext, callId: string) {
    this.requireCaller(context);
    const call = await this.calls.findById(context.organizationId, callId);
    if (!call) {
      throw new AppError("NOT_FOUND", 404, "Call not found");
    }
    if (call.channel === "whatsapp" && call.providerCallId) {
      await this.client.reject({
        organizationId: context.organizationId,
        providerCallId: call.providerCallId
      });
    }
    const updated = await this.calls.update(context.organizationId, call.id, {
      status: "rejected",
      endedAt: new Date(),
      agentUserId: context.userId
    });
    await this.auditLogger.log({
      action: "call.rejected",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "voice_call",
      entityId: call.id
    });
    return serializeCall(updated!);
  }

  /**
   * Process Meta calls webhook events (connect/status/terminate).
   */
  async handleProviderEvent(input: {
    organizationId: string;
    providerCallId: string;
    event: string;
    status?: string;
    direction?: string;
    phone?: string;
    answerSdp?: string | null;
    durationSeconds?: number | null;
    startTime?: Date | null;
    endTime?: Date | null;
  }): Promise<CallRecord | null> {
    let call = await this.calls.findByProviderCallId(input.providerCallId);

    if (!call && input.event === "connect" && input.direction === "USER_INITIATED") {
      const phone = input.phone ?? "unknown";
      const contact = await this.contacts.findOrCreateByPhone(
        input.organizationId,
        phone,
        phone
      );
      call = await this.calls.create({
        organizationId: input.organizationId,
        conversationId: null,
        contactId: contact.id,
        phone: contact.phone,
        direction: "user_initiated",
        status: "ringing",
        channel: "whatsapp",
        provider: "whatsapp",
        providerCallId: input.providerCallId,
        answerSdp: input.answerSdp ?? null
      });
    }

    if (!call) {
      return null;
    }

    let status: CallStatus = call.status;
    if (input.event === "connect" && call.direction === "user_initiated") {
      status = "ringing";
    } else if (input.event === "connect") {
      status = "connecting";
    } else if (input.status === "RINGING") {
      status = "ringing";
    } else if (input.status === "ACCEPTED") {
      status = "active";
    } else if (input.status === "REJECTED") {
      status = "rejected";
    } else if (input.event === "terminate") {
      status = input.status?.toUpperCase() === "FAILED" ? "failed" : "completed";
    }

    const terminal = ["completed", "failed", "rejected", "missed"].includes(status);
    const updated = await this.calls.update(call.organizationId, call.id, {
      status,
      answerSdp: input.answerSdp ?? call.answerSdp,
      startedAt:
        input.startTime ??
        (status === "active" ? (call.startedAt ?? new Date()) : call.startedAt),
      endedAt: input.endTime ?? (terminal ? new Date() : call.endedAt),
      durationSeconds: input.durationSeconds ?? call.durationSeconds
    });

    return updated;
  }

  /**
   * Vapi server webhook (end-of-call-report, status-update).
   */
  async handleVapiWebhook(payload: unknown): Promise<{ ok: true; callId?: string }> {
    type VapiMessage = {
      type?: string;
      call?: {
        id?: string;
        metadata?: { verbalCallId?: string; organizationId?: string };
        endedReason?: string;
      };
      status?: string;
      durationSeconds?: number;
      summary?: string;
      transcript?: string;
      analysis?: { summary?: string };
    };

    const body = payload as VapiMessage & { message?: VapiMessage };
    const message: VapiMessage = body.message ?? body;
    const providerCallId = message.call?.id;
    const verbalCallId = message.call?.metadata?.verbalCallId;
    const type = message.type;

    let call: CallRecord | null = null;
    if (verbalCallId) {
      call = await this.calls.findByInternalId(verbalCallId);
    }
    if (!call && providerCallId) {
      call = await this.calls.findByProviderCallId(providerCallId);
    }
    if (!call) {
      return { ok: true };
    }

    const summary =
      message.summary ??
      message.analysis?.summary ??
      (message.transcript ? message.transcript.slice(0, 2000) : null);

    if (type === "end-of-call-report" || type === "hang" || message.status === "ended") {
      const duration =
        typeof message.durationSeconds === "number" ? message.durationSeconds : null;
      await this.calls.update(call.organizationId, call.id, {
        status: "completed",
        endedAt: new Date(),
        durationSeconds: duration ?? call.durationSeconds,
        summary: summary ?? call.summary
      });

      if (call.conversationId && summary) {
        await this.messages.create({
          organizationId: call.organizationId,
          conversationId: call.conversationId,
          contactId: call.contactId,
          direction: "outbound",
          body: `🤖 Vapi call summary:\n${summary}`,
          status: "sent",
          providerMessageId: providerCallId ?? null
        });
      }

      await this.auditLogger.log({
        action: "call.vapi_completed",
        organizationId: call.organizationId,
        actorUserId: call.agentUserId ?? "system",
        entityType: "voice_call",
        entityId: call.id,
        metadata: { providerCallId, hasSummary: Boolean(summary) }
      });
    } else if (message.status === "in-progress" || type === "status-update") {
      await this.calls.update(call.organizationId, call.id, {
        status: "active",
        startedAt: call.startedAt ?? new Date()
      });
    }

    return { ok: true, callId: call.id };
  }
}

export { serializeCall };
