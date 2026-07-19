import { createHmac, timingSafeEqual } from "node:crypto";
import { loadWhatsAppConfig } from "@/modules/whatsapp/config";

export interface SignatureValidator {
  validate(rawBody: string, signatureHeader: string | null): boolean;
}

/**
 * Meta X-Hub-Signature-256 validator.
 *
 * - Production / WHATSAPP_REQUIRE_SIGNATURE=true: secret required; missing secret fails closed.
 * - Local demo: soft-pass only when secret is unset and requireSignature is false.
 */
export class MetaSignatureValidator implements SignatureValidator {
  constructor(
    private readonly appSecret: string | undefined = loadWhatsAppConfig().appSecret,
    private readonly requireSignature: boolean = loadWhatsAppConfig().requireSignature
  ) {}

  validate(rawBody: string, signatureHeader: string | null): boolean {
    if (!this.appSecret) {
      // Fail closed when signatures are required (production default).
      return !this.requireSignature;
    }
    if (!signatureHeader?.startsWith("sha256=")) {
      return false;
    }
    const expected = createHmac("sha256", this.appSecret).update(rawBody).digest("hex");
    const provided = signatureHeader.slice("sha256=".length);
    try {
      const expectedBuf = Buffer.from(expected, "utf8");
      const providedBuf = Buffer.from(provided, "utf8");
      if (expectedBuf.length !== providedBuf.length) {
        return false;
      }
      return timingSafeEqual(expectedBuf, providedBuf);
    } catch {
      return false;
    }
  }
}
