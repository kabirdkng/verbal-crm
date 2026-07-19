import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { z } from "zod";
import type { ContactsRepository } from "@/modules/contacts/repository";
import type { NotesRepository } from "@/modules/notes/repository";

const CreateNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000)
});

export class NotesService {
  constructor(
    private readonly repository: NotesRepository,
    private readonly contactsRepository: ContactsRepository,
    private readonly auditLogger: AuditLogger
  ) {}

  async create(context: AuthContext, contactId: string, payload: unknown) {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    const parsed = CreateNoteSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid note payload", parsed.error.flatten());
    }

    const contact = await this.contactsRepository.findById(context.organizationId, contactId);
    if (!contact) {
      throw new AppError("NOT_FOUND", 404, "Contact not found");
    }

    const note = await this.repository.create({
      organizationId: context.organizationId,
      contactId,
      authorUserId: context.userId,
      body: parsed.data.body
    });

    await this.auditLogger.log({
      action: "note.created",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "note",
      entityId: note.id,
      metadata: { contactId }
    });

    return note;
  }

  async list(context: AuthContext, contactId: string) {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    const contact = await this.contactsRepository.findById(context.organizationId, contactId);
    if (!contact) {
      throw new AppError("NOT_FOUND", 404, "Contact not found");
    }
    return this.repository.listByContact(context.organizationId, contactId);
  }
}
