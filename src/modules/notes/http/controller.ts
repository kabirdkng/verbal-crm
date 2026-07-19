import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { NotesService } from "@/modules/notes/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class NotesController {
  constructor(private readonly service: NotesService) {}

  async list(headers: HeaderReader, contactId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const notes = await this.service.list(context, contactId);
        return {
          status: 200,
          body: {
            data: notes.map((note) => ({
              id: note.id,
              contactId: note.contactId,
              authorUserId: note.authorUserId,
              body: note.body,
              createdAt: note.createdAt.toISOString()
            }))
          }
        };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async create(request: JsonRequest, contactId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const note = await this.service.create(context, contactId, payload);
        return {
          status: 201,
          body: {
            data: {
              id: note.id,
              contactId: note.contactId,
              authorUserId: note.authorUserId,
              body: note.body,
              createdAt: note.createdAt.toISOString()
            }
          }
        };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
