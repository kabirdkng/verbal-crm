import { createId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import {
  loadWhatsAppConfig,
  resolvePhoneNumberId,
  type WhatsAppRuntimeConfig
} from "@/modules/whatsapp/config";

export type ConnectCallInput = {
  organizationId: string;
  to: string;
  sdp?: string;
  sdpType?: "offer";
  /** Tracking string returned in terminate webhooks. */
  bizOpaqueCallbackData?: string;
};

export type ConnectCallResult = {
  providerCallId: string;
  status: "initiated" | "failed";
  errorMessage?: string;
  /** Mock/meta may return an answer SDP for WebRTC. */
  answerSdp?: string | null;
};

export type CallControlInput = {
  organizationId: string;
  providerCallId: string;
  sdp?: string;
  sdpType?: "answer" | "offer";
};

export type CallControlResult = {
  success: boolean;
  errorMessage?: string;
};

export type PermissionRequestInput = {
  organizationId: string;
  to: string;
};

export type PermissionRequestResult = {
  providerMessageId: string;
  status: "sent" | "failed";
  errorMessage?: string;
};

export interface WhatsAppCallingClient {
  connect(input: ConnectCallInput): Promise<ConnectCallResult>;
  terminate(input: CallControlInput): Promise<CallControlResult>;
  accept(input: CallControlInput): Promise<CallControlResult>;
  reject(input: CallControlInput): Promise<CallControlResult>;
  requestPermission(input: PermissionRequestInput): Promise<PermissionRequestResult>;
}

export type GraphFetch = typeof fetch;

/** Local mock — simulates WhatsApp voice call signaling without network. */
export class MockWhatsAppCallingClient implements WhatsAppCallingClient {
  readonly connects: ConnectCallInput[] = [];
  readonly controls: Array<{ action: string; input: CallControlInput }> = [];
  readonly permissions: PermissionRequestInput[] = [];

  async connect(input: ConnectCallInput): Promise<ConnectCallResult> {
    this.connects.push(input);
    return {
      providerCallId: createId("wacid"),
      status: "initiated",
      answerSdp: input.sdp
        ? `v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=mock-answer\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n`
        : null
    };
  }

  async terminate(input: CallControlInput): Promise<CallControlResult> {
    this.controls.push({ action: "terminate", input });
    return { success: true };
  }

  async accept(input: CallControlInput): Promise<CallControlResult> {
    this.controls.push({ action: "accept", input });
    return { success: true };
  }

  async reject(input: CallControlInput): Promise<CallControlResult> {
    this.controls.push({ action: "reject", input });
    return { success: true };
  }

  async requestPermission(input: PermissionRequestInput): Promise<PermissionRequestResult> {
    this.permissions.push(input);
    return {
      providerMessageId: createId("wamid_perm"),
      status: "sent"
    };
  }
}

/**
 * Meta Cloud API Calling client.
 * Docs: POST /{phone-number-id}/calls  action=connect|accept|reject|terminate
 * Permission: interactive call_permission_request message.
 */
export class MetaWhatsAppCallingClient implements WhatsAppCallingClient {
  constructor(
    private readonly config: WhatsAppRuntimeConfig = loadWhatsAppConfig(),
    private readonly fetchImpl: GraphFetch = fetch
  ) {}

  private phoneNumberId(organizationId: string): string {
    return resolvePhoneNumberId(this.config, organizationId);
  }

  private async postCalls(
    organizationId: string,
    body: Record<string, unknown>
  ): Promise<{ ok: boolean; json: Record<string, unknown>; status: number }> {
    if (!this.config.accessToken) {
      throw new AppError("INTERNAL_ERROR", 500, "WHATSAPP_ACCESS_TOKEN is not configured");
    }
    const phoneNumberId = this.phoneNumberId(organizationId);
    const url = `https://graph.facebook.com/${this.config.apiVersion}/${phoneNumberId}/calls`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body })
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, json, status: response.status };
  }

  async connect(input: ConnectCallInput): Promise<ConnectCallResult> {
    try {
      if (!input.sdp) {
        return {
          providerCallId: createId("wacid_fail"),
          status: "failed",
          errorMessage:
            "SDP offer is required for Meta business-initiated calls (WebRTC). Provide session.sdp from the agent browser."
        };
      }
      const to = input.to.replace(/\D/g, "");
      const { ok, json, status } = await this.postCalls(input.organizationId, {
        to,
        action: "connect",
        session: { sdp_type: input.sdpType ?? "offer", sdp: input.sdp },
        biz_opaque_callback_data: input.bizOpaqueCallbackData
      });
      if (!ok) {
        const err = json.error as { message?: string } | undefined;
        return {
          providerCallId: createId("wacid_fail"),
          status: "failed",
          errorMessage: err?.message ?? `Meta Calling API error (${status})`
        };
      }
      const calls = json.calls as Array<{ id?: string }> | undefined;
      const providerCallId = calls?.[0]?.id;
      if (!providerCallId) {
        return {
          providerCallId: createId("wacid_fail"),
          status: "failed",
          errorMessage: "Meta Calling API returned no call id"
        };
      }
      return { providerCallId, status: "initiated", answerSdp: null };
    } catch (error) {
      return {
        providerCallId: createId("wacid_fail"),
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Calling connect failed"
      };
    }
  }

  async terminate(input: CallControlInput): Promise<CallControlResult> {
    return this.control(input, "terminate");
  }

  async accept(input: CallControlInput): Promise<CallControlResult> {
    return this.control(input, "accept");
  }

  async reject(input: CallControlInput): Promise<CallControlResult> {
    return this.control(input, "reject");
  }

  private async control(
    input: CallControlInput,
    action: "terminate" | "accept" | "reject"
  ): Promise<CallControlResult> {
    try {
      const body: Record<string, unknown> = {
        call_id: input.providerCallId,
        action
      };
      if (input.sdp) {
        body.session = { sdp_type: input.sdpType ?? "answer", sdp: input.sdp };
      }
      const { ok, json, status } = await this.postCalls(input.organizationId, body);
      if (!ok) {
        const err = json.error as { message?: string } | undefined;
        return {
          success: false,
          errorMessage: err?.message ?? `Meta Calling API ${action} failed (${status})`
        };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : `${action} failed`
      };
    }
  }

  async requestPermission(input: PermissionRequestInput): Promise<PermissionRequestResult> {
    try {
      if (!this.config.accessToken) {
        return {
          providerMessageId: createId("wamid_fail"),
          status: "failed",
          errorMessage: "WHATSAPP_ACCESS_TOKEN is not configured"
        };
      }
      const phoneNumberId = this.phoneNumberId(input.organizationId);
      const to = input.to.replace(/\D/g, "");
      const url = `https://graph.facebook.com/${this.config.apiVersion}/${phoneNumberId}/messages`;
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "interactive",
          interactive: {
            type: "call_permission_request",
            action: {
              name: "call_permission_request"
            },
            body: {
              text: "We'd like permission to call you on WhatsApp about your request. You can accept or decline."
            }
          }
        })
      });
      const json = (await response.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      };
      if (!response.ok) {
        return {
          providerMessageId: createId("wamid_fail"),
          status: "failed",
          errorMessage: json.error?.message ?? `Permission request failed (${response.status})`
        };
      }
      return {
        providerMessageId: json.messages?.[0]?.id ?? createId("wamid_perm"),
        status: "sent"
      };
    } catch (error) {
      return {
        providerMessageId: createId("wamid_fail"),
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Permission request failed"
      };
    }
  }
}

export function createWhatsAppCallingClient(
  config: WhatsAppRuntimeConfig = loadWhatsAppConfig(),
  fetchImpl: GraphFetch = fetch
): WhatsAppCallingClient {
  if (config.mode === "meta") {
    return new MetaWhatsAppCallingClient(config, fetchImpl);
  }
  return new MockWhatsAppCallingClient();
}
