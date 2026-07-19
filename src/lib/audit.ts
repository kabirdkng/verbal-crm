import { getStore } from "@/lib/store";

export type AuditEvent = {
  action: string;
  organizationId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

export interface AuditLogger {
  log(event: AuditEvent): Promise<void>;
  listByOrganization(organizationId: string): Promise<AuditEvent[]>;
}

export class InMemoryAuditLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    getStore().auditEvents.push({
      ...event,
      createdAt: event.createdAt ?? new Date()
    });
  }

  async listByOrganization(organizationId: string): Promise<AuditEvent[]> {
    return getStore().auditEvents.filter((item) => item.organizationId === organizationId);
  }

  /** Test helper — prefer listByOrganization in production paths */
  get events(): AuditEvent[] {
    return getStore().auditEvents;
  }
}
