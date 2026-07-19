import { getDb, getPrismaAdmin } from "@/lib/prisma";
import type {
  CallChannel,
  CallDirection,
  CallProvider,
  CallRecord,
  CallStatus,
  CallsRepository,
  CallUpdatePatch,
  CreateCallInput
} from "@/modules/calling/repository";

function mapRow(row: {
  id: string;
  organizationId: string;
  conversationId: string | null;
  contactId: string;
  phone: string;
  direction: string;
  status: string;
  channel: string;
  provider: string;
  providerCallId: string | null;
  agentUserId: string | null;
  answerSdp: string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
  summary: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CallRecord {
  return {
    ...row,
    direction: row.direction as CallDirection,
    status: row.status as CallStatus,
    channel: row.channel as CallChannel,
    provider: row.provider as CallProvider
  };
}

export class PrismaCallsRepository implements CallsRepository {
  async create(input: CreateCallInput): Promise<CallRecord> {
    const row = await getDb().voiceCall.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        contactId: input.contactId,
        phone: input.phone,
        direction: input.direction,
        status: input.status,
        channel: input.channel ?? "whatsapp",
        provider: input.provider ?? "whatsapp",
        providerCallId: input.providerCallId ?? null,
        agentUserId: input.agentUserId ?? null,
        answerSdp: input.answerSdp ?? null,
        errorMessage: input.errorMessage ?? null,
        summary: input.summary ?? null
      }
    });
    return mapRow(row);
  }

  async update(
    organizationId: string,
    callId: string,
    patch: CallUpdatePatch
  ): Promise<CallRecord | null> {
    const existing = await getDb().voiceCall.findFirst({
      where: { id: callId, organizationId }
    });
    if (!existing) return null;
    const row = await getDb().voiceCall.update({
      where: { id: callId },
      data: patch
    });
    return mapRow(row);
  }

  async findById(organizationId: string, callId: string): Promise<CallRecord | null> {
    const row = await getDb().voiceCall.findFirst({
      where: { id: callId, organizationId }
    });
    return row ? mapRow(row) : null;
  }

  async findByInternalId(callId: string): Promise<CallRecord | null> {
    const row = await getPrismaAdmin().voiceCall.findUnique({ where: { id: callId } });
    return row ? mapRow(row) : null;
  }

  async findByProviderCallId(providerCallId: string): Promise<CallRecord | null> {
    const row = await getPrismaAdmin().voiceCall.findFirst({
      where: { providerCallId }
    });
    return row ? mapRow(row) : null;
  }

  async listByOrganization(
    organizationId: string,
    filters?: { conversationId?: string; contactId?: string; limit?: number }
  ): Promise<CallRecord[]> {
    const rows = await getDb().voiceCall.findMany({
      where: {
        organizationId,
        ...(filters?.conversationId ? { conversationId: filters.conversationId } : {}),
        ...(filters?.contactId ? { contactId: filters.contactId } : {})
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 50
    });
    return rows.map(mapRow);
  }
}
