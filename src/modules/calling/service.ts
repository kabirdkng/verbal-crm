import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
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
import type { EventBus } from "@/lib/events";

function serializeCall(call: CallRecord) {
  return {
    id: call.id,
    organizationId: call.organizationId,
    conversationId: call.conversationId,
    contactId: call.contactId,
    phone: call.phone,
    direction: call.direction,
    status: call.status,
    providerCallId: call.providerCallId,
    agentUserId: call.agentUserId,
    answerSdp: call.answerSdp,
    durationSeconds: call.durationSeconds,
    errorMessage: call.errorMessage,
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
    private readonly eventBus?: EventBus
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

    const target = await this.resolveTarget(context, parsed.data);
    const active = await this.calls.listByOrganization(context.organizationId, {
      contactId: target.contactId,
      limit: 10
    });
    if (
      active.some((c) =>
        ["initiated", "ringing", "connecting", "active"].includes(c.status)
      )
    ) {
      throw new AppError("CONFLICT", 409, "There is already an active call for this contact");
    }

    const call = await this.calls.create({
      organizationId: context.organizationId,
      conversationId: target.conversationId,
      contactId: target.contactId,
      phone: target.phone,
      direction: "business_initiated",
      status: "initiated",
      agentUserId: context.userId
    });

    const result = await this.client.connect({
      organizationId: context.organizationId,
      to: target.phone,
      sdp: parsed.data.sdp,
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
        metadata: { error: result.errorMessage }
      });
      return serializeCall(failed!);
    }

    // Mock path: simulate ring → active immediately so demos work without WebRTC.
    const isMock = !parsed.data.sdp || result.answerSdp !== undefined;
    const nextStatus: CallStatus = isMock && !parsed.data.sdp ? "active" : "ringing";
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
        body: nextStatus === "active"
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
        status: nextStatus
      }
    });

    this.eventBus?.publish({
      organizationId: context.organizationId,
      type: "call.updated",
      payload: { callId: call.id, status: nextStatus }
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

    if (call.providerCallId && call.status !== "permission_pending") {
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
      status: call.status === "permission_pending" ? "completed" : "completed",
      endedAt,
      durationSeconds
    });

    if (call.conversationId) {
      await this.messages.create({
        organizationId: context.organizationId,
        conversationId: call.conversationId,
        contactId: call.contactId,
        direction: "outbound",
        body: `📞 Call ended${durationSeconds ? ` (${durationSeconds}s)` : ""}`,
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
      metadata: { durationSeconds }
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
    if (call.providerCallId) {
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
   * Safe for mock tests; uses providerCallId correlation.
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
}

export { serializeCall };
