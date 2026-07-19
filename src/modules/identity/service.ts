import { SESSION_TTL_MS, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { getPersistenceMode } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { runWithTenant } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  CreateTenantRequestSchema,
  EnterTenantRequestSchema,
  InviteMemberRequestSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  SwitchOrgRequestSchema,
  UpdateMemberRoleRequestSchema,
  UpdateOrgSettingsRequestSchema
} from "@/modules/identity/contracts";
import { requirePlatformAdmin } from "@/lib/auth";
import type { IdentityRepository } from "@/modules/identity/repository";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly auditLogger: AuditLogger
  ) {}

  async register(payload: unknown): Promise<{
    sessionId: string;
    userId: string;
    organizationId: string;
    role: "admin";
  }> {
    assertRateLimit({ key: "auth:register", limit: 20, windowMs: 60_000 });

    const parsed = RegisterRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid register payload", parsed.error.flatten());
    }

    const existing = await this.repository.findUserByEmail(parsed.data.email);
    if (existing) {
      throw new AppError("CONFLICT", 409, "Email already registered");
    }

    const user = await this.repository.createUser({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: hashPassword(parsed.data.password)
    });

    const organization = await this.repository.createOrganization({
      name: parsed.data.organizationName,
      slug: `${slugify(parsed.data.organizationName)}-${user.id.slice(-6)}`
    });

    await this.repository.createMembership({
      userId: user.id,
      organizationId: organization.id,
      role: "admin"
    });

    const session = await this.repository.createSession({
      userId: user.id,
      organizationId: organization.id,
      role: "admin",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });

    const writeAudit = async () =>
      this.auditLogger.log({
        action: "auth.registered",
        organizationId: organization.id,
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        metadata: { email: user.email }
      });

    if (getPersistenceMode() === "postgres") {
      await runWithTenant(organization.id, writeAudit);
    } else {
      await writeAudit();
    }

    return {
      sessionId: session.id,
      userId: user.id,
      organizationId: organization.id,
      role: "admin"
    };
  }

  async login(payload: unknown): Promise<{
    sessionId: string;
    userId: string;
    organizationId: string;
    role: AuthContext["role"];
    isPlatformAdmin: boolean;
  }> {
    assertRateLimit({ key: "auth:login", limit: 30, windowMs: 60_000 });

    const parsed = LoginRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid login payload", parsed.error.flatten());
    }

    const user = await this.repository.findUserByEmail(parsed.data.email);
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      throw new AppError("UNAUTHORIZED", 401, "Invalid email or password");
    }

    // Platform admin lands in a platform session unless a tenant org is requested.
    if (user.isPlatformAdmin && !parsed.data.organizationId) {
      const platformOrgId = process.env.PLATFORM_HOME_ORG_ID ?? "org_platform";
      let home = await this.repository.findOrganization(platformOrgId);
      if (!home) {
        home = await this.repository.createOrganization({
          id: platformOrgId,
          name: "Platform Control Plane",
          slug: "platform"
        });
      }
      const session = await this.repository.createSession({
        userId: user.id,
        organizationId: home.id,
        role: "platform",
        expiresAt: new Date(Date.now() + SESSION_TTL_MS)
      });
      return {
        sessionId: session.id,
        userId: user.id,
        organizationId: home.id,
        role: "platform" as const,
        isPlatformAdmin: true
      };
    }

    const memberships = await this.repository.listMembershipsForUser(user.id);
    if (memberships.length === 0 && !user.isPlatformAdmin) {
      throw new AppError("FORBIDDEN", 403, "User has no organization membership");
    }

    let membership = parsed.data.organizationId
      ? memberships.find((item) => item.organizationId === parsed.data.organizationId) ?? null
      : memberships[0] ?? null;

    // Platform admin can enter any org without membership.
    if (!membership && user.isPlatformAdmin && parsed.data.organizationId) {
      const org = await this.repository.findOrganization(parsed.data.organizationId);
      if (!org) {
        throw new AppError("NOT_FOUND", 404, "Organization not found");
      }
      const session = await this.repository.createSession({
        userId: user.id,
        organizationId: org.id,
        role: "admin",
        expiresAt: new Date(Date.now() + SESSION_TTL_MS)
      });
      return {
        sessionId: session.id,
        userId: user.id,
        organizationId: org.id,
        role: "admin" as const,
        isPlatformAdmin: true
      };
    }

    if (!membership) {
      throw new AppError("FORBIDDEN", 403, "Not a member of organization");
    }

    const session = await this.repository.createSession({
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });

    const writeAudit = async () =>
      this.auditLogger.log({
        action: "auth.login",
        organizationId: membership.organizationId,
        actorUserId: user.id,
        entityType: "session",
        entityId: session.id
      });

    if (getPersistenceMode() === "postgres") {
      await runWithTenant(membership.organizationId, writeAudit);
    } else {
      await writeAudit();
    }

    return {
      sessionId: session.id,
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      isPlatformAdmin: user.isPlatformAdmin
    };
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      return;
    }
    await this.repository.deleteSession(sessionId);
  }

  async me(context: AuthContext) {
    const user = await this.repository.findUserById(context.userId);
    if (!user) {
      throw new AppError("UNAUTHORIZED", 401, "Session principal not found");
    }

    const organization = await this.repository.findOrganization(context.organizationId);
    const memberships = await this.repository.listMembershipsForUser(user.id);
    const orgs = await this.repository.listOrganizationsByIds(
      memberships.map((m) => m.organizationId)
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isPlatformAdmin: user.isPlatformAdmin
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            aiBudgetUsd: organization.aiBudgetUsd
          }
        : null,
      role: context.role,
      memberships: memberships.map((item) => {
        const org = orgs.find((o) => o.id === item.organizationId);
        return {
          organizationId: item.organizationId,
          role: item.role,
          name: org?.name,
          slug: org?.slug
        };
      })
    };
  }

  async switchOrganization(context: AuthContext, payload: unknown) {
    const parsed = SwitchOrgRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid switch payload", parsed.error.flatten());
    }

    // Platform admins may open any tenant without a membership row.
    if (context.isPlatformAdmin || context.role === "platform") {
      return this.enterTenant(context, { organizationId: parsed.data.organizationId });
    }

    const membership = await this.repository.findMembership(
      context.userId,
      parsed.data.organizationId
    );
    if (!membership) {
      throw new AppError("FORBIDDEN", 403, "Not a member of organization");
    }

    if (context.sessionId) {
      await this.repository.deleteSession(context.sessionId);
    }

    const session = await this.repository.createSession({
      userId: context.userId,
      organizationId: membership.organizationId,
      role: membership.role,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });

    return {
      sessionId: session.id,
      organizationId: membership.organizationId,
      role: membership.role
    };
  }

  async updateSettings(context: AuthContext, payload: unknown) {
    if (context.role !== "admin" && context.role !== "platform" && !context.isPlatformAdmin) {
      throw new AppError("FORBIDDEN", 403, "Only admins can update organization settings");
    }

    const parsed = UpdateOrgSettingsRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid settings payload",
        parsed.error.flatten()
      );
    }

    const org = await this.repository.updateOrganizationBudget(
      context.organizationId,
      parsed.data.aiBudgetUsd
    );

    await this.auditLogger.log({
      action: "org.settings_updated",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "organization",
      entityId: org.id,
      metadata: { aiBudgetUsd: org.aiBudgetUsd }
    });

    return org;
  }

  async listMembers(context: AuthContext) {
    if (context.role === "agent") {
      throw new AppError("FORBIDDEN", 403, "Agents cannot list members");
    }
    return this.repository.listMembers(context.organizationId);
  }

  async inviteMember(context: AuthContext, payload: unknown) {
    requireAdmin(context);
    const parsed = InviteMemberRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid invite payload", parsed.error.flatten());
    }

    let user = await this.repository.findUserByEmail(parsed.data.email);
    const temporaryPassword = parsed.data.temporaryPassword ?? `Tmp-${crypto.randomUUID().slice(0, 10)}`;
    let createdUser = false;

    if (!user) {
      user = await this.repository.createUser({
        email: parsed.data.email,
        name: parsed.data.name?.trim() || parsed.data.email.split("@")[0] || "Member",
        passwordHash: hashPassword(temporaryPassword)
      });
      createdUser = true;
    }

    const existing = await this.repository.findMembership(user.id, context.organizationId);
    if (existing) {
      throw new AppError("CONFLICT", 409, "User is already a member of this organization");
    }

    const membership = await this.repository.createMembership({
      userId: user.id,
      organizationId: context.organizationId,
      role: parsed.data.role
    });

    await this.auditLogger.log({
      action: "member.invited",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "membership",
      entityId: membership.id,
      metadata: { email: user.email, role: membership.role, createdUser }
    });

    return {
      membershipId: membership.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: membership.role,
      temporaryPassword: createdUser ? temporaryPassword : undefined
    };
  }

  async updateMemberRole(context: AuthContext, membershipId: string, payload: unknown) {
    requireAdmin(context);
    const parsed = UpdateMemberRoleRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid role payload", parsed.error.flatten());
    }

    const updated = await this.repository.updateMembershipRole(
      context.organizationId,
      membershipId,
      parsed.data.role
    );
    if (!updated) {
      throw new AppError("NOT_FOUND", 404, "Membership not found");
    }

    await this.auditLogger.log({
      action: "member.role_updated",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "membership",
      entityId: membershipId,
      metadata: { role: parsed.data.role }
    });

    return updated;
  }

  async removeMember(context: AuthContext, membershipId: string) {
    requireAdmin(context);
    if (context.sessionId) {
      // prevent removing self via crude check later using members list
    }
    const members = await this.repository.listMembers(context.organizationId);
    const target = members.find((m) => m.id === membershipId);
    if (!target) {
      throw new AppError("NOT_FOUND", 404, "Membership not found");
    }
    if (target.userId === context.userId) {
      throw new AppError("FORBIDDEN", 403, "Cannot remove yourself");
    }

    const ok = await this.repository.deleteMembership(context.organizationId, membershipId);
    if (!ok) {
      throw new AppError("NOT_FOUND", 404, "Membership not found");
    }

    await this.auditLogger.log({
      action: "member.removed",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "membership",
      entityId: membershipId,
      metadata: { userId: target.userId, email: target.email }
    });
  }

  async listMyOrganizations(context: AuthContext) {
    const user = await this.repository.findUserById(context.userId);
    if (user?.isPlatformAdmin) {
      const all = await this.repository.listAllOrganizations();
      return all
        .filter((o) => o.slug !== "platform")
        .map((o) => ({
          organizationId: o.id,
          role: "admin" as const,
          name: o.name,
          slug: o.slug
        }));
    }

    const memberships = await this.repository.listMembershipsForUser(context.userId);
    const orgs = await this.repository.listOrganizationsByIds(
      memberships.map((m) => m.organizationId)
    );
    return memberships.map((m) => {
      const org = orgs.find((o) => o.id === m.organizationId);
      return {
        organizationId: m.organizationId,
        role: m.role,
        name: org?.name ?? m.organizationId,
        slug: org?.slug ?? ""
      };
    });
  }

  async listTenants(context: AuthContext) {
    requirePlatformAdmin(context);
    const orgs = await this.repository.listAllOrganizations();
    return orgs.filter((o) => o.slug !== "platform");
  }

  async createTenant(context: AuthContext, payload: unknown) {
    requirePlatformAdmin(context);
    const parsed = CreateTenantRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid tenant payload", parsed.error.flatten());
    }

    const slug =
      parsed.data.slug ??
      `${slugify(parsed.data.name)}-${crypto.randomUUID().slice(0, 6)}`;

    const org = await this.repository.createOrganization({
      name: parsed.data.name,
      slug
    });

    if (parsed.data.aiBudgetUsd !== undefined) {
      await this.repository.updateOrganizationBudget(org.id, parsed.data.aiBudgetUsd);
    }

    let owner:
      | {
          userId: string;
          email: string;
          temporaryPassword?: string;
        }
      | undefined;

    if (parsed.data.ownerEmail) {
      let user = await this.repository.findUserByEmail(parsed.data.ownerEmail);
      const temporaryPassword =
        parsed.data.ownerPassword ?? `Tmp-${crypto.randomUUID().slice(0, 10)}`;
      if (!user) {
        user = await this.repository.createUser({
          email: parsed.data.ownerEmail,
          name: parsed.data.ownerName ?? parsed.data.ownerEmail.split("@")[0] ?? "Owner",
          passwordHash: hashPassword(temporaryPassword)
        });
        owner = { userId: user.id, email: user.email, temporaryPassword };
      } else {
        owner = { userId: user.id, email: user.email };
      }
      await this.repository.createMembership({
        userId: user.id,
        organizationId: org.id,
        role: "admin"
      });
    }

    const writeAudit = async () =>
      this.auditLogger.log({
        action: "platform.tenant_created",
        organizationId: org.id,
        actorUserId: context.userId,
        entityType: "organization",
        entityId: org.id,
        metadata: { name: org.name, slug: org.slug, ownerEmail: owner?.email }
      });

    if (getPersistenceMode() === "postgres") {
      await runWithTenant(org.id, writeAudit);
    } else {
      await writeAudit();
    }

    return { organization: org, owner };
  }

  async enterTenant(context: AuthContext, payload: unknown) {
    requirePlatformAdmin(context);
    const parsed = EnterTenantRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid enter payload", parsed.error.flatten());
    }

    const org = await this.repository.findOrganization(parsed.data.organizationId);
    if (!org || org.slug === "platform") {
      throw new AppError("NOT_FOUND", 404, "Tenant not found");
    }

    if (context.sessionId) {
      await this.repository.deleteSession(context.sessionId);
    }

    const session = await this.repository.createSession({
      userId: context.userId,
      organizationId: org.id,
      role: "admin",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });

    return {
      sessionId: session.id,
      organizationId: org.id,
      organizationName: org.name,
      role: "admin" as const
    };
  }

  async returnToPlatform(context: AuthContext) {
    requirePlatformAdmin(context);
    const platformOrgId = process.env.PLATFORM_HOME_ORG_ID ?? "org_platform";
    let home = await this.repository.findOrganization(platformOrgId);
    if (!home) {
      home = await this.repository.createOrganization({
        id: platformOrgId,
        name: "Platform Control Plane",
        slug: "platform"
      });
    }
    if (context.sessionId) {
      await this.repository.deleteSession(context.sessionId);
    }
    const session = await this.repository.createSession({
      userId: context.userId,
      organizationId: home.id,
      role: "platform",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });
    return {
      sessionId: session.id,
      organizationId: home.id,
      role: "platform" as const
    };
  }
}

function requireAdmin(context: AuthContext): void {
  if (context.role !== "admin" && context.role !== "platform" && !context.isPlatformAdmin) {
    throw new AppError("FORBIDDEN", 403, "Only admins can manage members");
  }
}
