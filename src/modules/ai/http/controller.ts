import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import {
  AiAssistResponseSchema,
  AiBudgetResponseSchema,
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

  async assist(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const result = await this.service.assist(context, payload);
        const body = AiAssistResponseSchema.parse({ data: result });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async suggest(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const result = await this.service.suggestReply(context, payload);
        const body = SuggestReplyResponseSchema.parse({ data: result });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async usage(headers: HeaderReader): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const result = await this.service.listUsage(context);
        const body = AiUsageResponseSchema.parse({ data: result });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async budget(headers: HeaderReader): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const result = await this.service.getBudget(context);
        const body = AiBudgetResponseSchema.parse({ data: result });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
