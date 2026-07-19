import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import {
  ListMessagesResponseSchema,
  SendMessageResponseSchema
} from "@/modules/messages/contracts";
import { MessagesService } from "@/modules/messages/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  async list(headers: HeaderReader, conversationId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const messages = await this.service.listForConversation(context, conversationId);
        const body = ListMessagesResponseSchema.parse({ data: messages });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async send(request: JsonRequest, conversationId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const message = await this.service.sendOutbound(context, conversationId, payload);
        const body = SendMessageResponseSchema.parse({ data: message });
        return { status: 201, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
