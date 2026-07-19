import { toErrorEnvelope } from "@/lib/errors";
import { WebhookAckResponseSchema } from "@/modules/whatsapp/contracts";
import { WhatsAppIngestService } from "@/modules/whatsapp/ingest.service";

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class WhatsAppWebhookController {
  constructor(
    private readonly ingestService: WhatsAppIngestService,
    private readonly verifyToken: string = process.env.WHATSAPP_VERIFY_TOKEN ?? "verbal-crm-dev"
  ) {}

  verify(query: URLSearchParams): JsonResponse {
    const mode = query.get("hub.mode");
    const token = query.get("hub.verify_token");
    const challenge = query.get("hub.challenge");

    if (mode === "subscribe" && token === this.verifyToken && challenge) {
      return { status: 200, body: challenge };
    }

    return {
      status: 403,
      body: {
        error: {
          code: "FORBIDDEN",
          message: "Webhook verification failed"
        }
      }
    };
  }

  async post(
    rawBody: string,
    payload: unknown,
    signatureHeader: string | null,
    organizationIdHeader: string | null
  ): Promise<JsonResponse> {
    try {
      const result = await this.ingestService.ingest(
        rawBody,
        payload,
        signatureHeader,
        organizationIdHeader
      );
      const body = WebhookAckResponseSchema.parse({ data: result });
      return { status: 200, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
