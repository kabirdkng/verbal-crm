import { getAuthContext, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import {
  AiUsageResponseSchema,
  SuggestReplyResponseSchema
} from "@/modules/ai/contracts";
import { AiService } from "@/modules/ai/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class AiController {
  constructor(private readonly service: AiService) {}

  async suggest(request: JsonRequest): Promise<JsonResponse> {
    try {
      const context = await getAuthContext(request.headers);
      const payload = await request.json();
      const result = await this.service.suggestReply(context, payload);
      const body = SuggestReplyResponseSchema.parse({ data: result });
      return { status: 200, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async usage(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = await getAuthContext(headers);
      const result = await this.service.listUsage(context);
      const body = AiUsageResponseSchema.parse({ data: result });
      return { status: 200, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
