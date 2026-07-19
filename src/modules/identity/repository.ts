import { createId } from "@/lib/ids";
import type { Role } from "@/lib/auth";
import {
  getStore,
  type MembershipRecord,
  type OrganizationRecord,
  type SessionRecord,
  type UserRecord
} from "@/lib/store";

export interface IdentityRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;
  createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord>;
  createOrganization(input: { name: string; slug: string }): Promise<OrganizationRecord>;
  findOrganization(organizationId: string): Promise<OrganizationRecord | null>;
  updateOrganizationBudget(organizationId: string, aiBudgetUsd: number): Promise<OrganizationRecord>;
  createMembership(input: {
    userId: string;
    organizationId: string;
    role: Role;
  }): Promise<MembershipRecord>;
  listMembershipsForUser(userId: string): Promise<MembershipRecord[]>;
  findMembership(userId: string, organizationId: string): Promise<MembershipRecord | null>;
  createSession(input: {
    userId: string;
    organizationId: string;
    role: Role;
    expiresAt: Date;
  }): Promise<SessionRecord>;
  findSession(sessionId: string): Promise<SessionRecord | null>;
  deleteSession(sessionId: string): Promise<void>;
  listMembers(organizationId: string): Promise<
    Array<MembershipRecord & { email: string; name: string }>
  >;
}

export class InMemoryIdentityRepository implements IdentityRepository {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    return getStore().users.find((user) => user.email === normalized) ?? null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    return getStore().users.find((user) => user.id === userId) ?? null;
  }

  async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const user: UserRecord = {
      id: createId("usr"),
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      createdAt: new Date()
    };
    getStore().users.push(user);
    return user;
  }

  async createOrganization(input: {
    name: string;
    slug: string;
  }): Promise<OrganizationRecord> {
    const org: OrganizationRecord = {
      id: createId("org"),
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      aiBudgetUsd: Number(process.env.AI_ORG_BUDGET_USD ?? "10"),
      createdAt: new Date()
    };
    getStore().organizations.push(org);
    return org;
  }

  async findOrganization(organizationId: string): Promise<OrganizationRecord | null> {
    return getStore().organizations.find((org) => org.id === organizationId) ?? null;
  }

  async updateOrganizationBudget(
    organizationId: string,
    aiBudgetUsd: number
  ): Promise<OrganizationRecord> {
    const org = getStore().organizations.find((item) => item.id === organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }
    org.aiBudgetUsd = aiBudgetUsd;
    return org;
  }

  async createMembership(input: {
    userId: string;
    organizationId: string;
    role: Role;
  }): Promise<MembershipRecord> {
    const membership: MembershipRecord = {
      id: createId("mem"),
      userId: input.userId,
      organizationId: input.organizationId,
      role: input.role,
      createdAt: new Date()
    };
    getStore().memberships.push(membership);
    return membership;
  }

  async listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
    return getStore().memberships.filter((item) => item.userId === userId);
  }

  async findMembership(
    userId: string,
    organizationId: string
  ): Promise<MembershipRecord | null> {
    return (
      getStore().memberships.find(
        (item) => item.userId === userId && item.organizationId === organizationId
      ) ?? null
    );
  }

  async createSession(input: {
    userId: string;
    organizationId: string;
    role: Role;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const session: SessionRecord = {
      id: createId("ses"),
      userId: input.userId,
      organizationId: input.organizationId,
      role: input.role,
      expiresAt: input.expiresAt,
      createdAt: new Date()
    };
    getStore().sessions.push(session);
    return session;
  }

  async findSession(sessionId: string): Promise<SessionRecord | null> {
    return getStore().sessions.find((item) => item.id === sessionId) ?? null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const store = getStore();
    store.sessions = store.sessions.filter((item) => item.id !== sessionId);
  }

  async listMembers(
    organizationId: string
  ): Promise<Array<MembershipRecord & { email: string; name: string }>> {
    const memberships = getStore().memberships.filter(
      (item) => item.organizationId === organizationId
    );
    return memberships.map((membership) => {
      const user = getStore().users.find((item) => item.id === membership.userId);
      return {
        ...membership,
        email: user?.email ?? "unknown",
        name: user?.name ?? "Unknown"
      };
    });
  }
}
