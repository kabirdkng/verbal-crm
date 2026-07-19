import { createId } from "@/lib/ids";
import {
  getStore,
  type CallChannel,
  type CallDirection,
  type CallProvider,
  type CallRecord,
  type CallStatus
} from "@/lib/store";

export type { CallRecord, CallStatus, CallDirection, CallChannel, CallProvider };

export type CreateCallInput = {
  organizationId: string;
  conversationId: string | null;
  contactId: string;
  phone: string;
  direction: CallDirection;
  status: CallStatus;
  channel?: CallChannel;
  provider?: CallProvider;
  providerCallId?: string | null;
  agentUserId?: string | null;
  answerSdp?: string | null;
  errorMessage?: string | null;
  summary?: string | null;
};

export type CallUpdatePatch = Partial<
  Pick<
    CallRecord,
    | "status"
    | "providerCallId"
    | "answerSdp"
    | "durationSeconds"
    | "errorMessage"
    | "summary"
    | "startedAt"
    | "endedAt"
    | "agentUserId"
  >
>;

export interface CallsRepository {
  create(input: CreateCallInput): Promise<CallRecord>;
  update(
    organizationId: string,
    callId: string,
    patch: CallUpdatePatch
  ): Promise<CallRecord | null>;
  findById(organizationId: string, callId: string): Promise<CallRecord | null>;
  findByInternalId(callId: string): Promise<CallRecord | null>;
  findByProviderCallId(providerCallId: string): Promise<CallRecord | null>;
  listByOrganization(
    organizationId: string,
    filters?: { conversationId?: string; contactId?: string; limit?: number }
  ): Promise<CallRecord[]>;
}

export class InMemoryCallsRepository implements CallsRepository {
  async create(input: CreateCallInput): Promise<CallRecord> {
    const now = new Date();
    const row: CallRecord = {
      id: createId("call"),
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
      durationSeconds: null,
      errorMessage: input.errorMessage ?? null,
      summary: input.summary ?? null,
      startedAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now
    };
    getStore().calls.push(row);
    return row;
  }

  async update(
    organizationId: string,
    callId: string,
    patch: CallUpdatePatch
  ): Promise<CallRecord | null> {
    const row = getStore().calls.find(
      (item) => item.id === callId && item.organizationId === organizationId
    );
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: new Date() });
    return row;
  }

  async findById(organizationId: string, callId: string): Promise<CallRecord | null> {
    return (
      getStore().calls.find(
        (item) => item.id === callId && item.organizationId === organizationId
      ) ?? null
    );
  }

  async findByInternalId(callId: string): Promise<CallRecord | null> {
    return getStore().calls.find((item) => item.id === callId) ?? null;
  }

  async findByProviderCallId(providerCallId: string): Promise<CallRecord | null> {
    return getStore().calls.find((item) => item.providerCallId === providerCallId) ?? null;
  }

  async listByOrganization(
    organizationId: string,
    filters?: { conversationId?: string; contactId?: string; limit?: number }
  ): Promise<CallRecord[]> {
    let rows = getStore().calls.filter((item) => item.organizationId === organizationId);
    if (filters?.conversationId) {
      rows = rows.filter((item) => item.conversationId === filters.conversationId);
    }
    if (filters?.contactId) {
      rows = rows.filter((item) => item.contactId === filters.contactId);
    }
    rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (filters?.limit) {
      rows = rows.slice(0, filters.limit);
    }
    return rows;
  }
}
