import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import {
  CreateConversationResponseSchema,
  GetConversationResponseSchema,
  ListConversationsResponseSchema
} from "@/modules/conversations/contracts";
import { ConversationsService } from "@/modules/conversations/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  async post(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const created = await this.service.create(context, payload);
        const body = CreateConversationResponseSchema.parse({ data: created });
        return { status: 201, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async get(headers: HeaderReader, searchParams?: URLSearchParams): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const conversations = await this.service.listForOrganization(context, {
          status: searchParams?.get("status") ?? undefined,
          assigned: (searchParams?.get("assigned") as "me" | "unassigned" | "any" | null) ?? undefined,
          q: searchParams?.get("q") ?? undefined
        });
        const body = ListConversationsResponseSchema.parse({ data: conversations });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async getById(headers: HeaderReader, conversationId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const conversation = await this.service.getById(context, conversationId);
        const body = GetConversationResponseSchema.parse({ data: conversation });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async patch(request: JsonRequest, conversationId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = (await request.json()) as {
          assignedUserId?: string | null;
          status?: "open" | "pending" | "closed";
        };

        let conversation;
        if (payload.assignedUserId !== undefined) {
          conversation = await this.service.assign(
            context,
            conversationId,
            payload.assignedUserId
          );
        } else if (payload.status) {
          conversation = await this.service.setStatus(context, conversationId, payload.status);
        } else {
          conversation = await this.service.getById(context, conversationId);
        }

        const body = GetConversationResponseSchema.parse({ data: conversation });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
