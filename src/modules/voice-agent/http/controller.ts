import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { VoiceAgentConfigResponseSchema } from "@/modules/voice-agent/contracts";
import { VoiceAgentService } from "@/modules/voice-agent/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class VoiceAgentController {
  constructor(private readonly service: VoiceAgentService) {}

  async get(headers: HeaderReader): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const data = await this.service.get(context);
        const body = VoiceAgentConfigResponseSchema.parse({ data });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async update(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const data = await this.service.update(context, payload);
        const body = VoiceAgentConfigResponseSchema.parse({ data });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
