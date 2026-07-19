import { getStore, type DomainEventRecord } from "@/lib/store";

export type DomainEventInput = {
  organizationId: string;
  type: string;
  payload: Record<string, unknown>;
};

export interface EventBus {
  publish(event: DomainEventInput): Promise<DomainEventRecord>;
  listByOrganization(organizationId: string): Promise<DomainEventRecord[]>;
}

export class InMemoryEventBus implements EventBus {
  async publish(event: DomainEventInput): Promise<DomainEventRecord> {
    const record: DomainEventRecord = {
      id: `evt_${crypto.randomUUID()}`,
      organizationId: event.organizationId,
      type: event.type,
      payload: event.payload,
      createdAt: new Date()
    };
    getStore().domainEvents.push(record);
    return record;
  }

  async listByOrganization(organizationId: string): Promise<DomainEventRecord[]> {
    return getStore().domainEvents.filter((item) => item.organizationId === organizationId);
  }
}
