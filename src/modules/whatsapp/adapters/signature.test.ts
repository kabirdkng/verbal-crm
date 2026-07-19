import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MetaSignatureValidator } from "@/modules/whatsapp/adapters/signature";

describe("MetaSignatureValidator", () => {
  it("fails closed when signature is required and secret is missing", () => {
    const validator = new MetaSignatureValidator(undefined, true);
    expect(validator.validate("{}", "sha256=abc")).toBe(false);
  });

  it("soft-passes when secret is missing and signatures are not required", () => {
    const validator = new MetaSignatureValidator(undefined, false);
    expect(validator.validate("{}", null)).toBe(true);
  });

  it("accepts a valid X-Hub-Signature-256", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ hello: "world" });
    const digest = createHmac("sha256", secret).update(body).digest("hex");
    const validator = new MetaSignatureValidator(secret, true);
    expect(validator.validate(body, `sha256=${digest}`)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const validator = new MetaSignatureValidator("test-secret", true);
    expect(validator.validate("{}", "sha256=deadbeef")).toBe(false);
  });
});
