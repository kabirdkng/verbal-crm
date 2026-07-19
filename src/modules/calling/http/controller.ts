import { withTenantAuth, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { CallListResponseSchema, CallResponseSchema } from "@/modules/calling/contracts";
import { CallingService } from "@/modules/calling/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
  url?: string;
};

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class CallingController {
  constructor(private readonly service: CallingService) {}

  async list(headers: HeaderReader, searchParams: URLSearchParams): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const data = await this.service.list(context, {
          conversationId: searchParams.get("conversationId") ?? undefined,
          contactId: searchParams.get("contactId") ?? undefined
        });
        const body = CallListResponseSchema.parse({ data });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async get(headers: HeaderReader, callId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const data = await this.service.get(context, callId);
        const body = CallResponseSchema.parse({ data });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async initiate(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const data = await this.service.initiate(context, payload);
        const body = CallResponseSchema.parse({ data });
        return { status: 201, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async requestPermission(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const data = await this.service.requestPermission(context, payload);
        const body = CallResponseSchema.parse({ data });
        return { status: 201, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async terminate(request: JsonRequest, callId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json().catch(() => ({}));
        const data = await this.service.terminate(context, callId, payload);
        const body = CallResponseSchema.parse({ data });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async accept(request: JsonRequest, callId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json().catch(() => ({}));
        const data = await this.service.accept(context, callId, payload);
        const body = CallResponseSchema.parse({ data });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async reject(headers: HeaderReader, callId: string): Promise<JsonResponse> {
    try {
      return await withTenantAuth(headers, async (context) => {
        const data = await this.service.reject(context, callId);
        const body = CallResponseSchema.parse({ data });
        return { status: 200, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async simulateInboundVapi(request: JsonRequest): Promise<JsonResponse> {
    try {
      return await withTenantAuth(request.headers, async (context) => {
        const payload = await request.json();
        const data = await this.service.simulateInboundVapi(context, payload);
        const body = CallResponseSchema.parse({ data });
        return { status: 201, body };
      });
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
