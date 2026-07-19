import { SESSION_TTL_MS, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  SwitchOrgRequestSchema,
  UpdateOrgSettingsRequestSchema
} from "@/modules/identity/contracts";
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

    await this.auditLogger.log({
      action: "auth.registered",
      organizationId: organization.id,
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      metadata: { email: user.email }
    });

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

    const memberships = await this.repository.listMembershipsForUser(user.id);
    if (memberships.length === 0) {
      throw new AppError("FORBIDDEN", 403, "User has no organization membership");
    }

    const membership =
      (parsed.data.organizationId
        ? memberships.find((item) => item.organizationId === parsed.data.organizationId)
        : memberships[0]) ?? null;

    if (!membership) {
      throw new AppError("FORBIDDEN", 403, "Not a member of organization");
    }

    const session = await this.repository.createSession({
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });

    await this.auditLogger.log({
      action: "auth.login",
      organizationId: membership.organizationId,
      actorUserId: user.id,
      entityType: "session",
      entityId: session.id
    });

    return {
      sessionId: session.id,
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role
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
    const organization = await this.repository.findOrganization(context.organizationId);
    if (!user || !organization) {
      throw new AppError("UNAUTHORIZED", 401, "Session principal not found");
    }

    const memberships = await this.repository.listMembershipsForUser(user.id);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        aiBudgetUsd: organization.aiBudgetUsd
      },
      role: context.role,
      memberships: memberships.map((item) => ({
        organizationId: item.organizationId,
        role: item.role
      }))
    };
  }

  async switchOrganization(context: AuthContext, payload: unknown) {
    const parsed = SwitchOrgRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid switch payload", parsed.error.flatten());
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
    if (context.role !== "admin") {
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
}
