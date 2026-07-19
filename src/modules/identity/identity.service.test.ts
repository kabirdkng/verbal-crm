import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import { resetStore } from "@/lib/store";
import { InMemoryIdentityRepository } from "@/modules/identity/repository";
import { IdentityService } from "@/modules/identity/service";
import { hashPassword } from "@/lib/password";

describe("IdentityService", () => {
  beforeEach(() => {
    resetStore();
  });

  it("registers a user, org, membership, and session", async () => {
    const service = new IdentityService(new InMemoryIdentityRepository(), new InMemoryAuditLogger());
    const result = await service.register({
      email: "owner@acme.test",
      password: "secure-pass-1",
      name: "Owner",
      organizationName: "Acme"
    });

    expect(result.role).toBe("admin");
    expect(result.sessionId).toMatch(/^ses_/);
    expect(result.organizationId).toMatch(/^org_/);
  });

  it("logs in with valid credentials", async () => {
    const repo = new InMemoryIdentityRepository();
    const service = new IdentityService(repo, new InMemoryAuditLogger());
    const registered = await service.register({
      email: "agent@acme.test",
      password: "secure-pass-1",
      name: "Agent",
      organizationName: "Acme"
    });

    const login = await service.login({
      email: "agent@acme.test",
      password: "secure-pass-1",
      organizationId: registered.organizationId
    });

    expect(login.userId).toBe(registered.userId);
    expect(login.organizationId).toBe(registered.organizationId);
  });

  it("rejects invalid login", async () => {
    const repo = new InMemoryIdentityRepository();
    await repo.createUser({
      email: "x@y.com",
      name: "X",
      passwordHash: hashPassword("right-password")
    });
    const service = new IdentityService(repo, new InMemoryAuditLogger());

    await expect(
      service.login({ email: "x@y.com", password: "wrong-password" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });
});
