import type { Role } from "@/lib/auth";
import { getPrismaAdmin } from "@/lib/prisma";
import type {
  MembershipRecord,
  OrganizationRecord,
  SessionRecord,
  UserRecord
} from "@/lib/store";
import type { IdentityRepository } from "@/modules/identity/repository";

export class PrismaIdentityRepository implements IdentityRepository {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const row = await getPrismaAdmin().user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
    return row;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    return getPrismaAdmin().user.findUnique({ where: { id: userId } });
  }

  async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
    isPlatformAdmin?: boolean;
  }): Promise<UserRecord> {
    return getPrismaAdmin().user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: input.passwordHash,
        isPlatformAdmin: Boolean(input.isPlatformAdmin)
      }
    });
  }

  async createOrganization(input: {
    name: string;
    slug: string;
    id?: string;
  }): Promise<OrganizationRecord> {
    return getPrismaAdmin().organization.create({
      data: {
        id: input.id,
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
        aiBudgetUsd: Number(process.env.AI_ORG_BUDGET_USD ?? "10")
      }
    });
  }

  async findOrganization(organizationId: string): Promise<OrganizationRecord | null> {
    return getPrismaAdmin().organization.findUnique({ where: { id: organizationId } });
  }

  async listAllOrganizations(): Promise<OrganizationRecord[]> {
    return getPrismaAdmin().organization.findMany({ orderBy: { createdAt: "desc" } });
  }

  async updateOrganizationBudget(
    organizationId: string,
    aiBudgetUsd: number
  ): Promise<OrganizationRecord> {
    return getPrismaAdmin().organization.update({
      where: { id: organizationId },
      data: { aiBudgetUsd }
    });
  }

  async createMembership(input: {
    userId: string;
    organizationId: string;
    role: Role;
  }): Promise<MembershipRecord> {
    const row = await getPrismaAdmin().membership.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        role: input.role
      }
    });
    return { ...row, role: row.role as Role };
  }

  async listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
    const rows = await getPrismaAdmin().membership.findMany({ where: { userId } });
    return rows.map((row) => ({ ...row, role: row.role as Role }));
  }

  async findMembership(
    userId: string,
    organizationId: string
  ): Promise<MembershipRecord | null> {
    const row = await getPrismaAdmin().membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } }
    });
    return row ? { ...row, role: row.role as Role } : null;
  }

  async createSession(input: {
    userId: string;
    organizationId: string;
    role: Role | "platform";
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const row = await getPrismaAdmin().session.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        role: input.role,
        expiresAt: input.expiresAt
      }
    });
    return { ...row, role: row.role as Role | "platform" };
  }

  async findSession(sessionId: string): Promise<SessionRecord | null> {
    const row = await getPrismaAdmin().session.findUnique({ where: { id: sessionId } });
    return row ? { ...row, role: row.role as Role | "platform" } : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await getPrismaAdmin().session.deleteMany({ where: { id: sessionId } });
  }

  async listMembers(
    organizationId: string
  ): Promise<Array<MembershipRecord & { email: string; name: string }>> {
    const rows = await getPrismaAdmin().membership.findMany({
      where: { organizationId },
      include: { user: true }
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId,
      role: row.role as Role,
      createdAt: row.createdAt,
      email: row.user.email,
      name: row.user.name
    }));
  }

  async updateMembershipRole(
    organizationId: string,
    membershipId: string,
    role: Role
  ): Promise<MembershipRecord | null> {
    const existing = await getPrismaAdmin().membership.findFirst({
      where: { id: membershipId, organizationId }
    });
    if (!existing) {
      return null;
    }
    const row = await getPrismaAdmin().membership.update({
      where: { id: membershipId },
      data: { role }
    });
    return { ...row, role: row.role as Role };
  }

  async deleteMembership(organizationId: string, membershipId: string): Promise<boolean> {
    const existing = await getPrismaAdmin().membership.findFirst({
      where: { id: membershipId, organizationId }
    });
    if (!existing) {
      return false;
    }
    await getPrismaAdmin().membership.delete({ where: { id: membershipId } });
    return true;
  }

  async listOrganizationsByIds(ids: string[]): Promise<OrganizationRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    return getPrismaAdmin().organization.findMany({ where: { id: { in: ids } } });
  }
}
