import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { loadVapiConfig } from "@/modules/voice-agent/config";
import { VoiceAgentConfigUpdateSchema } from "@/modules/voice-agent/contracts";
import type { VoiceAgentConfigRepository } from "@/modules/voice-agent/repository";
import type { IdentityRepository } from "@/modules/identity/repository";

export class VoiceAgentService {
  constructor(
    private readonly repository: VoiceAgentConfigRepository,
    private readonly auditLogger: AuditLogger,
    private readonly identityRepository?: IdentityRepository
  ) {}

  private requireRead(context: AuthContext): void {
    requireAnyRole(context, ["admin", "manager", "agent"]);
  }

  private requireWrite(context: AuthContext): void {
    if (context.role !== "admin" && context.role !== "platform" && !context.isPlatformAdmin) {
      throw new AppError("FORBIDDEN", 403, "Only admins can update voice agent context");
    }
  }

  async get(context: AuthContext) {
    this.requireRead(context);
    const org = this.identityRepository
      ? await this.identityRepository.findOrganization(context.organizationId)
      : null;
    const config = await this.repository.getOrCreate(
      context.organizationId,
      org?.name
    );
    return this.serialize(config);
  }

  /** Internal: full config including secrets for call placement. */
  async getInternal(organizationId: string) {
    const org = this.identityRepository
      ? await this.identityRepository.findOrganization(organizationId)
      : null;
    return this.repository.getOrCreate(organizationId, org?.name);
  }

  async update(context: AuthContext, payload: unknown) {
    this.requireWrite(context);
    const parsed = VoiceAgentConfigUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid voice agent config",
        parsed.error.flatten()
      );
    }
    const config = await this.repository.update(context.organizationId, parsed.data);
    await this.auditLogger.log({
      action: "voice_agent.updated",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "voice_agent_config",
      entityId: config.id,
      metadata: {
        enabled: config.enabled,
        agentName: config.agentName
      }
    });
    return this.serialize(config);
  }

  private serialize(config: Awaited<ReturnType<VoiceAgentConfigRepository["getOrCreate"]>>) {
    const runtime = loadVapiConfig();
    return {
      id: config.id,
      organizationId: config.organizationId,
      enabled: config.enabled,
      companyName: config.companyName,
      agentName: config.agentName,
      systemPrompt: config.systemPrompt,
      knowledgeBase: config.knowledgeBase,
      firstMessage: config.firstMessage,
      language: config.language,
      voiceProvider: config.voiceProvider,
      voiceId: config.voiceId,
      model: config.model,
      hasVapiApiKey: Boolean(config.vapiApiKey || runtime.apiKey),
      vapiPhoneNumberId: config.vapiPhoneNumberId ?? runtime.phoneNumberId ?? null,
      vapiAssistantId: config.vapiAssistantId ?? runtime.assistantId ?? null,
      vapiMode: runtime.mode,
      platformPhoneConfigured: Boolean(runtime.phoneNumberId || config.vapiPhoneNumberId),
      updatedAt: config.updatedAt.toISOString()
    };
  }
}
