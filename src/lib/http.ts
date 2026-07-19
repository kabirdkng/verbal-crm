import { toErrorEnvelope } from "@/lib/errors";

export type JsonResponse = {
  status: number;
  body: unknown;
};

export function ok(body: unknown, status = 200): JsonResponse {
  return { status, body };
}

export function fromError(error: unknown): JsonResponse {
  return toErrorEnvelope(error);
}
