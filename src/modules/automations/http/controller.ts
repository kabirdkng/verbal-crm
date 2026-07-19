import { getAuthContext, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { AutomationsService } from "@/modules/automations/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

function toResponse(rule: {
  id: string;
  organizationId: string;
  name: string;
  enabled: boolean;
  matchKeyword: string;
  templateName: string;
  createdAt: Date;
}) {
  return {
    id: rule.id,
    organizationId: rule.organizationId,
    name: rule.name,
    enabled: rule.enabled,
    matchKeyword: rule.matchKeyword,
    templateName: rule.templateName,
    createdAt: rule.createdAt.toISOString()
  };
}

export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}

  async list(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = await getAuthContext(headers);
      const rules = await this.service.list(context);
      return { status: 200, body: { data: rules.map(toResponse) } };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async create(request: JsonRequest): Promise<JsonResponse> {
    try {
      const context = await getAuthContext(request.headers);
      const payload = await request.json();
      const rule = await this.service.create(context, payload);
      return { status: 201, body: { data: toResponse(rule) } };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
