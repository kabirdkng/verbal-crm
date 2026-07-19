import type { AuditEvent } from "@/lib/audit";
import type { Role } from "@/lib/auth";

export type ContactRecord = {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  tags: string[];
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

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
};

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  aiBudgetUsd: number;
  createdAt: Date;
};

export type MembershipRecord = {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  createdAt: Date;
};

export type SessionRecord = {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  expiresAt: Date;
  createdAt: Date;
};

export type NoteRecord = {
  id: string;
  organizationId: string;
  contactId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
};

export type BroadcastStatus = "draft" | "sending" | "completed" | "failed";

export type BroadcastRecord = {
  id: string;
  organizationId: string;
  name: string;
  templateName: string;
  status: BroadcastStatus;
  createdByUserId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  completedAt: Date | null;
};

export type AutomationRuleRecord = {
  id: string;
  organizationId: string;
  name: string;
  enabled: boolean;
  matchKeyword: string;
  templateName: string;
  createdAt: Date;
};

export type FeatureFlagRecord = {
  key: string;
  organizationId: string | null;
  enabled: boolean;
};

export type RateLimitBucketRecord = {
  key: string;
  count: number;
  windowStart: number;
};

export type AppStore = {
  users: UserRecord[];
  organizations: OrganizationRecord[];
  memberships: MembershipRecord[];
  sessions: SessionRecord[];
  contacts: ContactRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  templates: TemplateRecord[];
  notes: NoteRecord[];
  broadcasts: BroadcastRecord[];
  automationRules: AutomationRuleRecord[];
  webhookEvents: WebhookEventRecord[];
  jobs: QueueJobRecord[];
  auditEvents: AuditEvent[];
  aiUsage: AiUsageRecord[];
  domainEvents: DomainEventRecord[];
  featureFlags: FeatureFlagRecord[];
  rateLimitBuckets: RateLimitBucketRecord[];
};

function createEmptyStore(): AppStore {
  return {
    users: [],
    organizations: [],
    memberships: [],
    sessions: [],
    contacts: [],
    conversations: [],
    messages: [],
    templates: [],
    notes: [],
    broadcasts: [],
    automationRules: [],
    webhookEvents: [],
    jobs: [],
    auditEvents: [],
    aiUsage: [],
    domainEvents: [],
    featureFlags: [],
    rateLimitBuckets: []
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

/** Demo password for seeded user: demo-password */
export const DEMO_PASSWORD = "demo-password";

export function seedDemoData(store: AppStore = getStore()): void {
  if (store.organizations.some((org) => org.id === "org_demo")) {
    return;
  }

  const now = new Date();

  store.organizations.push({
    id: "org_demo",
    name: "Demo Organization",
    slug: "demo",
    aiBudgetUsd: Number(process.env.AI_ORG_BUDGET_USD ?? "10"),
    createdAt: now
  });

  // passwordHash set by seedAuth after crypto available — placeholder replaced in seedAuthDemo
  store.users.push({
    id: "u_demo_admin",
    email: "admin@demo.local",
    name: "Demo Admin",
    passwordHash: "pending",
    createdAt: now
  });

  store.memberships.push({
    id: "mem_demo_admin",
    userId: "u_demo_admin",
    organizationId: "org_demo",
    role: "admin",
    createdAt: now
  });

  store.templates.push({
    id: "tpl_welcome",
    organizationId: "org_demo",
    name: "welcome_followup",
    language: "en",
    body: "Hi {{name}}, thanks for messaging us. How can we help?",
    status: "approved",
    createdAt: now
  });

  store.templates.push({
    id: "tpl_auto",
    organizationId: "org_demo",
    name: "auto_ack",
    language: "en",
    body: "Thanks for your message — an agent will be with you shortly.",
    status: "approved",
    createdAt: now
  });

  store.automationRules.push({
    id: "auto_demo_help",
    organizationId: "org_demo",
    name: "Help keyword auto-ack",
    enabled: true,
    matchKeyword: "help",
    templateName: "auto_ack",
    createdAt: now
  });

  store.featureFlags.push(
    { key: "broadcasts", organizationId: null, enabled: true },
    { key: "automations", organizationId: null, enabled: true },
    { key: "realtime", organizationId: null, enabled: true },
    { key: "analytics", organizationId: null, enabled: true }
  );
}
