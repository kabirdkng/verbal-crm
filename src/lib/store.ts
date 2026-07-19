import type { AuditEvent } from "@/lib/audit";

export type ContactRecord = {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationStatus = "open" | "pending" | "closed";

export type ConversationRecord = {
  id: string;
  organizationId: string;
  contactId: string;
  phone: string;
  status: ConversationStatus;
  lastMessageAt: Date | null;
  lastInboundAt: Date | null;
  assignedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageDirection = "inbound" | "outbound";
export type MessageChannel = "whatsapp";
export type MessageStatus = "received" | "queued" | "sent" | "failed" | "delivered";

export type MessageRecord = {
  id: string;
  organizationId: string;
  conversationId: string;
  contactId: string;
  direction: MessageDirection;
  channel: MessageChannel;
  body: string;
  status: MessageStatus;
  providerMessageId: string | null;
  templateName: string | null;
  createdAt: Date;
  createdByUserId: string | null;
};

export type TemplateStatus = "draft" | "pending" | "approved" | "rejected";

export type TemplateRecord = {
  id: string;
  organizationId: string;
  name: string;
  language: string;
  body: string;
  status: TemplateStatus;
  createdAt: Date;
};

export type WebhookEventStatus = "received" | "duplicate" | "queued" | "processed" | "failed";

export type WebhookEventRecord = {
  id: string;
  organizationId: string | null;
  provider: "whatsapp";
  providerEventId: string;
  status: WebhookEventStatus;
  payload: unknown;
  errorMessage: string | null;
  createdAt: Date;
  processedAt: Date | null;
};

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed";

export type QueueJobRecord = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: QueueJobStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AiUsageRecord = {
  id: string;
  organizationId: string;
  feature: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
  actorUserId: string;
  createdAt: Date;
};

export type DomainEventRecord = {
  id: string;
  organizationId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type AppStore = {
  contacts: ContactRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  templates: TemplateRecord[];
  webhookEvents: WebhookEventRecord[];
  jobs: QueueJobRecord[];
  auditEvents: AuditEvent[];
  aiUsage: AiUsageRecord[];
  domainEvents: DomainEventRecord[];
};

function createEmptyStore(): AppStore {
  return {
    contacts: [],
    conversations: [],
    messages: [],
    templates: [],
    webhookEvents: [],
    jobs: [],
    auditEvents: [],
    aiUsage: [],
    domainEvents: []
  };
}

const globalForStore = globalThis as typeof globalThis & {
  __verbalCrmStore?: AppStore;
};

export function getStore(): AppStore {
  if (!globalForStore.__verbalCrmStore) {
    globalForStore.__verbalCrmStore = createEmptyStore();
  }
  return globalForStore.__verbalCrmStore;
}

export function resetStore(): void {
  globalForStore.__verbalCrmStore = createEmptyStore();
}

export function seedDemoData(store: AppStore = getStore()): void {
  if (store.templates.some((t) => t.organizationId === "org_demo")) {
    return;
  }

  const now = new Date();
  store.templates.push({
    id: "tpl_welcome",
    organizationId: "org_demo",
    name: "welcome_followup",
    language: "en",
    body: "Hi {{name}}, thanks for messaging us. How can we help?",
    status: "approved",
    createdAt: now
  });
}
