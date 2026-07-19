import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import type { ContactsRepository } from "@/modules/contacts/repository";
import type { ConversationsRepository } from "@/modules/conversations/repository";
import type { MessagesRepository } from "@/modules/messages/repository";
import type { NotesRepository } from "@/modules/notes/repository";
import type { TemplatesRepository } from "@/modules/templates/repository";
import type { AiUsageRepository } from "@/modules/ai/repository";

export class ExportService {
  constructor(
    private readonly contacts: ContactsRepository,
    private readonly conversations: ConversationsRepository,
    private readonly messages: MessagesRepository,
    private readonly notes: NotesRepository,
    private readonly templates: TemplatesRepository,
    private readonly aiUsage: AiUsageRepository,
    private readonly auditLogger: AuditLogger
  ) {}

  async exportOrganization(context: AuthContext) {
    requireAnyRole(context, ["admin"]);
    const orgId = context.organizationId;

    const contactList = await this.contacts.listByOrganization(orgId);
    const conversationList = await this.conversations.listByOrganization(orgId);
    const templateList = await this.templates.listByOrganization(orgId);
    const usage = await this.aiUsage.listByOrganization(orgId);

    const notesByContact = [];
    for (const contact of contactList) {
      const notes = await this.notes.listByContact(orgId, contact.id);
      notesByContact.push({ contactId: contact.id, notes });
    }

    const messagesByConversation = [];
    for (const conversation of conversationList) {
      const msgs = await this.messages.listByConversation(orgId, conversation.id);
      messagesByConversation.push({ conversationId: conversation.id, messages: msgs });
    }

    await this.auditLogger.log({
      action: "org.data_exported",
      organizationId: orgId,
      actorUserId: context.userId,
      entityType: "organization",
      entityId: orgId,
      metadata: {
        contacts: contactList.length,
        conversations: conversationList.length
      }
    });

    return {
      exportedAt: new Date().toISOString(),
      organizationId: orgId,
      contacts: contactList,
      conversations: conversationList,
      messagesByConversation,
      notesByContact,
      templates: templateList,
      aiUsage: usage
    };
  }
}
