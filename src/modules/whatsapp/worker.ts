import type { EventBus } from "@/lib/events";
import type { QueueJobRecord } from "@/lib/store";
import type { AutomationsService } from "@/modules/automations/service";
import type { ContactsRepository } from "@/modules/contacts/repository";
import type { ConversationsRepository } from "@/modules/conversations/repository";
import type { MessagesRepository } from "@/modules/messages/repository";
import type { InboundMessageJobPayload } from "@/modules/whatsapp/ingest.service";
import type { WebhookEventsRepository } from "@/modules/whatsapp/repository";

export class WhatsAppInboundWorker {
  constructor(
    private readonly contactsRepository: ContactsRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly webhookEvents: WebhookEventsRepository,
    private readonly eventBus: EventBus,
    private readonly automationsService?: AutomationsService
  ) {}

  async handle(job: QueueJobRecord): Promise<void> {
    if (job.type !== "whatsapp.inbound_message") {
      return;
    }

    const payload = job.payload as InboundMessageJobPayload;
    const { organizationId, providerMessageId, from, body, profileName, webhookEventId } =
      payload;

    try {
      const existingMessage = await this.messagesRepository.findByProviderMessageId(
        organizationId,
        providerMessageId
      );
      if (existingMessage) {
        await this.webhookEvents.updateStatus(webhookEventId, "processed");
        return;
      }

      const contact = await this.contactsRepository.findOrCreateByPhone(
        organizationId,
        from,
        profileName
      );

      let conversation = await this.conversationsRepository.findOpenByContact(
        organizationId,
        contact.id
      );
      if (!conversation) {
        conversation = await this.conversationsRepository.create({
          organizationId,
          contactId: contact.id,
          phone: contact.phone
        });
      }

      const now = new Date();
      const message = await this.messagesRepository.create({
        organizationId,
        conversationId: conversation.id,
        contactId: contact.id,
        direction: "inbound",
        body,
        status: "received",
        providerMessageId,
        createdByUserId: null
      });

      await this.conversationsRepository.touchInbound(organizationId, conversation.id, now);

      await this.eventBus.publish({
        organizationId,
        type: "message.inbound",
        payload: {
          messageId: message.id,
          conversationId: conversation.id,
          contactId: contact.id,
          providerMessageId
        }
      });

      if (this.automationsService) {
        const fired = await this.automationsService.runForInbound({
          organizationId,
          phone: contact.phone,
          body
        });
        if (fired > 0) {
          await this.eventBus.publish({
            organizationId,
            type: "automation.fired",
            payload: { conversationId: conversation.id, count: fired }
          });
        }
      }

      await this.webhookEvents.updateStatus(webhookEventId, "processed");
    } catch (error) {
      await this.webhookEvents.updateStatus(
        webhookEventId,
        "failed",
        error instanceof Error ? error.message : "Worker failure"
      );
      throw error;
    }
  }
}
