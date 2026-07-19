import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignatureValidator {
  validate(rawBody: string, signatureHeader: string | null): boolean;
}

/**
 * Meta X-Hub-Signature-256 validator.
 * When app secret is unset (local/dev), validation is soft-pass for demo.
 */
export class MetaSignatureValidator implements SignatureValidator {
  constructor(private readonly appSecret: string | undefined = process.env.WHATSAPP_APP_SECRET) {}

  validate(rawBody: string, signatureHeader: string | null): boolean {
    if (!this.appSecret) {
      return true;
    }
    if (!signatureHeader?.startsWith("sha256=")) {
      return false;
    }
    const expected = createHmac("sha256", this.appSecret).update(rawBody).digest("hex");
    const provided = signatureHeader.slice("sha256=".length);
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
    } catch {
      return false;
    }
  }
}
