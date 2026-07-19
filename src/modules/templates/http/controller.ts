import { getAuthContext, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import {
  CreateTemplateResponseSchema,
  ListTemplatesResponseSchema
} from "@/modules/templates/contracts";
import { TemplatesService } from "@/modules/templates/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  async post(request: JsonRequest): Promise<JsonResponse> {
    try {
      const context = await getAuthContext(request.headers);
      const payload = await request.json();
      const created = await this.service.create(context, payload);
      const body = CreateTemplateResponseSchema.parse({ data: created });
      return { status: 201, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async get(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = await getAuthContext(headers);
      const templates = await this.service.listForOrganization(context);
      const body = ListTemplatesResponseSchema.parse({ data: templates });
      return { status: 200, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
