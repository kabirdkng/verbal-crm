import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getStore } from "@/lib/store";

/**
 * Server-Sent Events stream of domain events for the authenticated organization.
 * Phase 4 realtime — poll-style snapshot stream suitable for local demo.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const context = getAuthContext(request.headers);
    if (!isFeatureEnabled("realtime", context.organizationId)) {
      return new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Realtime disabled" } }), {
        status: 403,
        headers: { "content-type": "application/json" }
      });
    }

    const encoder = new TextEncoder();
    let cursor = getStore().domainEvents.length;
    let closed = false;

    const stream = new ReadableStream({
      start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        send({ type: "connected", organizationId: context.organizationId, at: new Date().toISOString() });

        const interval = setInterval(() => {
          if (closed) {
            clearInterval(interval);
            return;
          }
          const events = getStore().domainEvents;
          while (cursor < events.length) {
            const event = events[cursor]!;
            cursor += 1;
            if (event.organizationId === context.organizationId) {
              send({
                type: event.type,
                id: event.id,
                payload: event.payload,
                createdAt: event.createdAt.toISOString()
              });
            }
          }
        }, 1000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(interval);
          controller.close();
        });
      },
      cancel() {
        closed = true;
      }
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message } }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
}
