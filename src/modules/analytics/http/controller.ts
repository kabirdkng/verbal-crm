import { getAuthContext, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { AnalyticsService } from "@/modules/analytics/service";

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  async overview(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = getAuthContext(headers);
      const data = await this.service.overview(context);
      return { status: 200, body: { data } };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
