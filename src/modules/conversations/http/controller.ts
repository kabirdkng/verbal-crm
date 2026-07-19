import { getAuthContext, type HeaderReader } from "@/lib/auth";
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
      const context = getAuthContext(request.headers);
      const payload = await request.json();
      const created = await this.service.create(context, payload);
      const body = CreateConversationResponseSchema.parse({ data: created });
      return { status: 201, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async get(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = getAuthContext(headers);
      const conversations = await this.service.listForOrganization(context);
      const body = ListConversationsResponseSchema.parse({ data: conversations });
      return { status: 200, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async getById(headers: HeaderReader, conversationId: string): Promise<JsonResponse> {
    try {
      const context = getAuthContext(headers);
      const conversation = await this.service.getById(context, conversationId);
      const body = GetConversationResponseSchema.parse({ data: conversation });
      return { status: 200, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
