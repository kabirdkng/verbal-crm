import { createId } from "@/lib/ids";
import { getStore, type NoteRecord } from "@/lib/store";

export type CreateNoteInput = {
  organizationId: string;
  contactId: string;
  authorUserId: string;
  body: string;
};

export interface NotesRepository {
  create(input: CreateNoteInput): Promise<NoteRecord>;
  listByContact(organizationId: string, contactId: string): Promise<NoteRecord[]>;
}

export class InMemoryNotesRepository implements NotesRepository {
  async create(input: CreateNoteInput): Promise<NoteRecord> {
    const record: NoteRecord = {
      id: createId("note"),
      organizationId: input.organizationId,
      contactId: input.contactId,
      authorUserId: input.authorUserId,
      body: input.body,
      createdAt: new Date()
    };
    getStore().notes.push(record);
    return record;
  }

  async listByContact(organizationId: string, contactId: string): Promise<NoteRecord[]> {
    return getStore()
      .notes.filter(
        (item) => item.organizationId === organizationId && item.contactId === contactId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
