import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { resetStore } from "@/lib/store";
import { InMemoryIdentityRepository } from "@/modules/identity/repository";
import { IdentityService } from "@/modules/identity/service";

describe("Identity team management", () => {
  beforeEach(() => {
    resetStore();
  });

  it("invites a member and updates role", async () => {
    const repo = new InMemoryIdentityRepository();
    const service = new IdentityService(repo, new InMemoryAuditLogger());

    const registered = await service.register({
      email: "owner@acme.test",
      password: "secure-pass-1",
      name: "Owner",
      organizationName: "Acme"
    });

    const admin: AuthContext = {
      userId: registered.userId,
      organizationId: registered.organizationId,
      role: "admin",
      sessionId: registered.sessionId
    };

    const invited = await service.inviteMember(admin, {
      email: "agent@acme.test",
      name: "Agent",
      role: "agent"
    });
    expect(invited.temporaryPassword).toBeTruthy();

    const updated = await service.updateMemberRole(admin, invited.membershipId, {
      role: "manager"
    });
    expect(updated.role).toBe("manager");

    const orgs = await service.listMyOrganizations(admin);
    expect(orgs.some((o) => o.organizationId === registered.organizationId)).toBe(true);
  });
});
