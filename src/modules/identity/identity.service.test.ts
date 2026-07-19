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

  it("platform admin logs into platform home, lists/creates tenants, enters and returns", async () => {
    const repo = new InMemoryIdentityRepository();
    const service = new IdentityService(repo, new InMemoryAuditLogger());

    await repo.createUser({
      email: "platform@verbal.test",
      name: "Platform",
      passwordHash: hashPassword("secure-pass-1"),
      isPlatformAdmin: true
    });
    await repo.createOrganization({
      id: "org_platform",
      name: "Platform Control Plane",
      slug: "platform"
    });

    const login = await service.login({
      email: "platform@verbal.test",
      password: "secure-pass-1"
    });
    expect(login.role).toBe("platform");
    expect(login.isPlatformAdmin).toBe(true);
    expect(login.organizationId).toBe("org_platform");

    const platformCtx = {
      userId: login.userId,
      organizationId: login.organizationId,
      role: "platform" as const,
      sessionId: login.sessionId,
      isPlatformAdmin: true
    };

    const created = await service.createTenant(platformCtx, {
      name: "Acme Co",
      slug: "acme-co",
      ownerEmail: "owner@acme.test",
      ownerName: "Acme Owner",
      aiBudgetUsd: 25
    });
    expect(created.organization.slug).toBe("acme-co");
    expect(created.owner?.email).toBe("owner@acme.test");
    expect(created.owner?.temporaryPassword).toBeTruthy();

    const tenants = await service.listTenants(platformCtx);
    expect(tenants.some((t) => t.id === created.organization.id)).toBe(true);
    expect(tenants.every((t) => t.slug !== "platform")).toBe(true);

    const entered = await service.enterTenant(platformCtx, {
      organizationId: created.organization.id
    });
    expect(entered.role).toBe("admin");
    expect(entered.organizationId).toBe(created.organization.id);

    const tenantCtx = {
      userId: login.userId,
      organizationId: entered.organizationId,
      role: "admin" as const,
      sessionId: entered.sessionId,
      isPlatformAdmin: true
    };
    const returned = await service.returnToPlatform(tenantCtx);
    expect(returned.role).toBe("platform");
    expect(returned.organizationId).toBe("org_platform");
  });

  it("forbids non-platform users from tenant control plane APIs", async () => {
    const repo = new InMemoryIdentityRepository();
    const service = new IdentityService(repo, new InMemoryAuditLogger());
    const registered = await service.register({
      email: "owner@acme.test",
      password: "secure-pass-1",
      name: "Owner",
      organizationName: "Acme"
    });

    const tenantCtx = {
      userId: registered.userId,
      organizationId: registered.organizationId,
      role: "admin" as const,
      sessionId: registered.sessionId,
      isPlatformAdmin: false
    };

    await expect(service.listTenants(tenantCtx)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403
    });
    await expect(
      service.createTenant(tenantCtx, { name: "Nope" })
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
