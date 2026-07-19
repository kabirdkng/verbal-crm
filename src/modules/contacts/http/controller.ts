import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import {
  CreateContactResponseSchema,
  GetContactResponseSchema,
  ListContactsResponseSchema
} from "@/modules/contacts/contracts";
import { ContactsService } from "@/modules/contacts/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  async post(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const created = await this.service.create(context, payload);
        const body = CreateContactResponseSchema.parse({ data: created });
        return { status: 201, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async get(headers: HeaderReader, searchParams?: URLSearchParams): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const contacts = await this.service.listForOrganization(context, {
          q: searchParams?.get("q") ?? undefined,
          tag: searchParams?.get("tag") ?? undefined
        });
        const body = ListContactsResponseSchema.parse({ data: contacts });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async getById(headers: HeaderReader, contactId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const contact = await this.service.getById(context, contactId);
        const body = GetContactResponseSchema.parse({ data: contact });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async patch(request: JsonRequest, contactId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const contact = await this.service.update(context, contactId, payload);
        const body = GetContactResponseSchema.parse({ data: contact });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async delete(headers: HeaderReader, contactId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        await this.service.delete(context, contactId);
        return { status: 204, body: null };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
