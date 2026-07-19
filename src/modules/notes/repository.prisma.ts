import { getDb } from "@/lib/prisma";
import type { NoteRecord } from "@/lib/store";
import type { CreateNoteInput, NotesRepository } from "@/modules/notes/repository";

export class PrismaNotesRepository implements NotesRepository {
  async create(input: CreateNoteInput): Promise<NoteRecord> {
    return getDb().note.create({
      data: {
        organizationId: input.organizationId,
        contactId: input.contactId,
        authorUserId: input.authorUserId,
        body: input.body
      }
    });
  }

  async listByContact(organizationId: string, contactId: string): Promise<NoteRecord[]> {
    return getDb().note.findMany({
      where: { organizationId, contactId },
      orderBy: { createdAt: "desc" }
    });
  }
}
