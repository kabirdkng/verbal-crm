import { InMemoryAuditLogger } from "@/lib/audit";
import { PrismaAuditLogger } from "@/lib/audit.prisma";
import { getPersistenceMode, getQueueMode } from "@/lib/config";
import { InMemoryEventBus } from "@/lib/events";
import { InMemoryJobQueue } from "@/lib/queue";
import { RedisJobQueue } from "@/lib/queue-redis";
import { AnalyticsController } from "@/modules/analytics/http/controller";
import { AnalyticsService } from "@/modules/analytics/service";
import { AiController } from "@/modules/ai/http/controller";
import { MockAiProvider } from "@/modules/ai/adapters/provider";
import { InMemoryAiUsageRepository } from "@/modules/ai/repository";
import { PrismaAiUsageRepository } from "@/modules/ai/repository.prisma";
import { AiService } from "@/modules/ai/service";
import { AuditController } from "@/modules/audit/http/controller";
import { AutomationsController } from "@/modules/automations/http/controller";
import { AutomationsService } from "@/modules/automations/service";
import { BroadcastsController } from "@/modules/broadcasts/http/controller";
import { BroadcastsService } from "@/modules/broadcasts/service";
import { ContactsController } from "@/modules/contacts/http/controller";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { PrismaContactsRepository } from "@/modules/contacts/repository.prisma";
import { ContactsService } from "@/modules/contacts/service";
import { ConversationsController } from "@/modules/conversations/http/controller";
import { InMemoryConversationsRepository } from "@/modules/conversations/repository";
import { PrismaConversationsRepository } from "@/modules/conversations/repository.prisma";
import { ConversationsService } from "@/modules/conversations/service";
import { IdentityController } from "@/modules/identity/http/controller";
import { InMemoryIdentityRepository } from "@/modules/identity/repository";
import { PrismaIdentityRepository } from "@/modules/identity/repository.prisma";
import { ensureDemoSeed } from "@/modules/identity/seed";
import { IdentityService } from "@/modules/identity/service";
import { MessagesController } from "@/modules/messages/http/controller";
import { InMemoryMessagesRepository } from "@/modules/messages/repository";
import { PrismaMessagesRepository } from "@/modules/messages/repository.prisma";
import { MessagesService } from "@/modules/messages/service";
import { NotesController } from "@/modules/notes/http/controller";
import { InMemoryNotesRepository } from "@/modules/notes/repository";
import { PrismaNotesRepository } from "@/modules/notes/repository.prisma";
import { NotesService } from "@/modules/notes/service";
import { TemplatesController } from "@/modules/templates/http/controller";
import { InMemoryTemplatesRepository } from "@/modules/templates/repository";
import { PrismaTemplatesRepository } from "@/modules/templates/repository.prisma";
import { TemplatesService } from "@/modules/templates/service";
import { MetaSignatureValidator } from "@/modules/whatsapp/adapters/signature";
import { MockWhatsAppSender } from "@/modules/whatsapp/adapters/sender";
import { WhatsAppWebhookController } from "@/modules/whatsapp/http/controller";
import { WhatsAppIngestService } from "@/modules/whatsapp/ingest.service";
import { InMemoryWebhookEventsRepository } from "@/modules/whatsapp/repository";
import { PrismaWebhookEventsRepository } from "@/modules/whatsapp/repository.prisma";
import { WhatsAppInboundWorker } from "@/modules/whatsapp/worker";

const persistence = getPersistenceMode();
const queueMode = getQueueMode();

if (persistence === "memory") {
  ensureDemoSeed();
}

const auditLogger =
  persistence === "postgres" ? new PrismaAuditLogger() : new InMemoryAuditLogger();
const eventBus = new InMemoryEventBus();
const queue = queueMode === "redis" ? new RedisJobQueue() : new InMemoryJobQueue();

const identityRepository =
  persistence === "postgres"
    ? new PrismaIdentityRepository()
    : new InMemoryIdentityRepository();
const contactsRepository =
  persistence === "postgres"
    ? new PrismaContactsRepository()
    : new InMemoryContactsRepository();
const conversationsRepository =
  persistence === "postgres"
    ? new PrismaConversationsRepository()
    : new InMemoryConversationsRepository();
const messagesRepository =
  persistence === "postgres"
    ? new PrismaMessagesRepository()
    : new InMemoryMessagesRepository();
const templatesRepository =
  persistence === "postgres"
    ? new PrismaTemplatesRepository()
    : new InMemoryTemplatesRepository();
const webhookEventsRepository =
  persistence === "postgres"
    ? new PrismaWebhookEventsRepository()
    : new InMemoryWebhookEventsRepository();
const aiUsageRepository =
  persistence === "postgres"
    ? new PrismaAiUsageRepository()
    : new InMemoryAiUsageRepository();
const notesRepository =
  persistence === "postgres" ? new PrismaNotesRepository() : new InMemoryNotesRepository();

const whatsAppSender = new MockWhatsAppSender();
const aiProvider = new MockAiProvider();
const signatureValidator = new MetaSignatureValidator();

const identityService = new IdentityService(identityRepository, auditLogger);
const contactsService = new ContactsService(contactsRepository, auditLogger);
const conversationsService = new ConversationsService(
  conversationsRepository,
  contactsRepository,
  auditLogger
);
const messagesService = new MessagesService(
  messagesRepository,
  conversationsRepository,
  templatesRepository,
  whatsAppSender,
  auditLogger,
  eventBus
);
const templatesService = new TemplatesService(templatesRepository, auditLogger);
const notesService = new NotesService(notesRepository, contactsRepository, auditLogger);
const automationsService = new AutomationsService(
  templatesRepository,
  whatsAppSender,
  auditLogger
);
const broadcastsService = new BroadcastsService(
  contactsRepository,
  templatesRepository,
  whatsAppSender,
  auditLogger
);
const analyticsService = new AnalyticsService();
const aiService = new AiService(
  aiProvider,
  aiUsageRepository,
  conversationsRepository,
  messagesRepository,
  contactsRepository,
  auditLogger,
  Number(process.env.AI_ORG_BUDGET_USD ?? "10"),
  identityRepository
);

const ingestService = new WhatsAppIngestService(
  webhookEventsRepository,
  queue,
  signatureValidator
);

const inboundWorker = new WhatsAppInboundWorker(
  contactsRepository,
  conversationsRepository,
  messagesRepository,
  webhookEventsRepository,
  eventBus,
  automationsService
);

export async function drainWhatsAppQueue(): Promise<number> {
  return queue.processAll((job) => inboundWorker.handle(job));
}

export const identityController = new IdentityController(identityService);
export const contactsController = new ContactsController(contactsService);
export const conversationsController = new ConversationsController(conversationsService);
export const messagesController = new MessagesController(messagesService);
export const templatesController = new TemplatesController(templatesService);
export const notesController = new NotesController(notesService);
export const broadcastsController = new BroadcastsController(broadcastsService);
export const automationsController = new AutomationsController(automationsService);
export const analyticsController = new AnalyticsController(analyticsService);
export const whatsAppWebhookController = new WhatsAppWebhookController(ingestService);
export const aiController = new AiController(aiService);
export const auditController = new AuditController(auditLogger);

export const appContainer = {
  persistence,
  queueMode,
  auditLogger,
  eventBus,
  queue,
  identityRepository,
  contactsRepository,
  conversationsRepository,
  messagesRepository,
  templatesRepository,
  webhookEventsRepository,
  aiUsageRepository,
  notesRepository,
  whatsAppSender,
  inboundWorker,
  automationsService,
  drainWhatsAppQueue
};
