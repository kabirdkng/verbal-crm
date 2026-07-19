import { z } from "zod";

export const RegisterRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120),
  organizationName: z.string().trim().min(1).max(120)
});

export const LoginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
  organizationId: z.string().min(1).optional()
});

export const SwitchOrgRequestSchema = z.object({
  organizationId: z.string().min(1)
});

export const UpdateOrgSettingsRequestSchema = z.object({
  aiBudgetUsd: z.number().min(0).max(1_000_000)
});

export const InviteMemberRequestSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["admin", "manager", "agent"]).default("agent"),
  temporaryPassword: z.string().min(8).max(128).optional()
});

export const UpdateMemberRoleRequestSchema = z.object({
  role: z.enum(["admin", "manager", "agent"])
});

export const MeResponseSchema = z.object({
  data: z.object({
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      isPlatformAdmin: z.boolean()
    }),
    organization: z
      .object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        aiBudgetUsd: z.number()
      })
      .nullable(),
    role: z.enum(["admin", "manager", "agent", "platform"]),
    memberships: z.array(
      z.object({
        organizationId: z.string(),
        role: z.enum(["admin", "manager", "agent"]),
        name: z.string().optional(),
        slug: z.string().optional()
      })
    )
  })
});

export const CreateTenantRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  ownerEmail: z.string().trim().email().optional(),
  ownerName: z.string().trim().min(1).max(120).optional(),
  ownerPassword: z.string().min(8).max(128).optional(),
  aiBudgetUsd: z.number().min(0).max(1_000_000).optional()
});

export const EnterTenantRequestSchema = z.object({
  organizationId: z.string().min(1)
});
