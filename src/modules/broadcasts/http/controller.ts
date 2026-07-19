import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { BroadcastsService } from "@/modules/broadcasts/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

function toResponse(broadcast: {
  id: string;
  organizationId: string;
  name: string;
  templateName: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: broadcast.id,
    organizationId: broadcast.organizationId,
    name: broadcast.name,
    templateName: broadcast.templateName,
    status: broadcast.status,
    totalRecipients: broadcast.totalRecipients,
    sentCount: broadcast.sentCount,
    failedCount: broadcast.failedCount,
    createdAt: broadcast.createdAt.toISOString(),
    completedAt: broadcast.completedAt?.toISOString() ?? null
  };
}

export class BroadcastsController {
  constructor(private readonly service: BroadcastsService) {}

  async list(headers: HeaderReader): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const items = await this.service.list(context);
        return { status: 200, body: { data: items.map(toResponse) } };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async create(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const broadcast = await this.service.createAndSend(context, payload);
        return { status: 201, body: { data: toResponse(broadcast) } };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
