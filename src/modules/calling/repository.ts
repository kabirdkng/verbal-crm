import { createId } from "@/lib/ids";
import { getStore, type CallDirection, type CallRecord, type CallStatus } from "@/lib/store";

export type { CallRecord, CallStatus, CallDirection };

export interface CallsRepository {
  create(input: {
    organizationId: string;
    conversationId: string | null;
    contactId: string;
    phone: string;
    direction: CallDirection;
    status: CallStatus;
    providerCallId?: string | null;
    agentUserId?: string | null;
    answerSdp?: string | null;
    errorMessage?: string | null;
  }): Promise<CallRecord>;
  update(
    organizationId: string,
    callId: string,
    patch: Partial<
      Pick<
        CallRecord,
        | "status"
        | "providerCallId"
        | "answerSdp"
        | "durationSeconds"
        | "errorMessage"
        | "startedAt"
        | "endedAt"
        | "agentUserId"
      >
    >
  ): Promise<CallRecord | null>;
  findById(organizationId: string, callId: string): Promise<CallRecord | null>;
  findByProviderCallId(providerCallId: string): Promise<CallRecord | null>;
  listByOrganization(
    organizationId: string,
    filters?: { conversationId?: string; contactId?: string; limit?: number }
  ): Promise<CallRecord[]>;
}

export class InMemoryCallsRepository implements CallsRepository {
  async create(input: {
    organizationId: string;
    conversationId: string | null;
    contactId: string;
    phone: string;
    direction: CallDirection;
    status: CallStatus;
    providerCallId?: string | null;
    agentUserId?: string | null;
    answerSdp?: string | null;
    errorMessage?: string | null;
  }): Promise<CallRecord> {
    const now = new Date();
    const row: CallRecord = {
      id: createId("call"),
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      contactId: input.contactId,
      phone: input.phone,
      direction: input.direction,
      status: input.status,
      providerCallId: input.providerCallId ?? null,
      agentUserId: input.agentUserId ?? null,
      answerSdp: input.answerSdp ?? null,
      durationSeconds: null,
      errorMessage: input.errorMessage ?? null,
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
    patch: Partial<
      Pick<
        CallRecord,
        | "status"
        | "providerCallId"
        | "answerSdp"
        | "durationSeconds"
        | "errorMessage"
        | "startedAt"
        | "endedAt"
        | "agentUserId"
      >
    >
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
