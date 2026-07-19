import { InMemoryAuditLogger } from "@/lib/audit";
import { InMemoryEventBus } from "@/lib/events";
import { InMemoryJobQueue } from "@/lib/queue";
import { seedDemoData } from "@/lib/store";
import { AiController } from "@/modules/ai/http/controller";
import { MockAiProvider } from "@/modules/ai/adapters/provider";
import { InMemoryAiUsageRepository } from "@/modules/ai/repository";
import { AiService } from "@/modules/ai/service";
import { AuditController } from "@/modules/audit/http/controller";
import { ContactsController } from "@/modules/contacts/http/controller";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { ContactsService } from "@/modules/contacts/service";
import { ConversationsController } from "@/modules/conversations/http/controller";
import { InMemoryConversationsRepository } from "@/modules/conversations/repository";
import { ConversationsService } from "@/modules/conversations/service";
import { MessagesController } from "@/modules/messages/http/controller";
import { InMemoryMessagesRepository } from "@/modules/messages/repository";
import { MessagesService } from "@/modules/messages/service";
import { TemplatesController } from "@/modules/templates/http/controller";
import { InMemoryTemplatesRepository } from "@/modules/templates/repository";
import { TemplatesService } from "@/modules/templates/service";
import { MetaSignatureValidator } from "@/modules/whatsapp/adapters/signature";
import { MockWhatsAppSender } from "@/modules/whatsapp/adapters/sender";
import { WhatsAppWebhookController } from "@/modules/whatsapp/http/controller";
import { WhatsAppIngestService } from "@/modules/whatsapp/ingest.service";
import { InMemoryWebhookEventsRepository } from "@/modules/whatsapp/repository";
import { WhatsAppInboundWorker } from "@/modules/whatsapp/worker";

seedDemoData();

const auditLogger = new InMemoryAuditLogger();
const eventBus = new InMemoryEventBus();
const queue = new InMemoryJobQueue();

const contactsRepository = new InMemoryContactsRepository();
const conversationsRepository = new InMemoryConversationsRepository();
const messagesRepository = new InMemoryMessagesRepository();
const templatesRepository = new InMemoryTemplatesRepository();
const webhookEventsRepository = new InMemoryWebhookEventsRepository();
const aiUsageRepository = new InMemoryAiUsageRepository();

const whatsAppSender = new MockWhatsAppSender();
const aiProvider = new MockAiProvider();
const signatureValidator = new MetaSignatureValidator();

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
const aiService = new AiService(
  aiProvider,
  aiUsageRepository,
  conversationsRepository,
  messagesRepository,
  contactsRepository,
  auditLogger
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
  eventBus
);

/** Process pending WhatsApp jobs (Phase 1: sync drain after enqueue in route or worker API). */
export async function drainWhatsAppQueue(): Promise<number> {
  return queue.processAll((job) => inboundWorker.handle(job));
}

export const contactsController = new ContactsController(contactsService);
export const conversationsController = new ConversationsController(conversationsService);
export const messagesController = new MessagesController(messagesService);
export const templatesController = new TemplatesController(templatesService);
export const whatsAppWebhookController = new WhatsAppWebhookController(ingestService);
export const aiController = new AiController(aiService);
export const auditController = new AuditController(auditLogger);

export const appContainer = {
  auditLogger,
  eventBus,
  queue,
  contactsRepository,
  conversationsRepository,
  messagesRepository,
  templatesRepository,
  webhookEventsRepository,
  aiUsageRepository,
  whatsAppSender,
  inboundWorker,
  drainWhatsAppQueue
};
