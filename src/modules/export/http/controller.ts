import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { ExportService } from "@/modules/export/service";

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class ExportController {
  constructor(private readonly service: ExportService) {}

  async exportOrg(headers: HeaderReader): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const data = await this.service.exportOrganization(context);
        return { status: 200, body: { data } };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
