import { z } from "zod";

export const CreateTemplateRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9_]+$/, "Template name must be snake_case"),
  language: z.string().trim().min(2).max(10).default("en"),
  body: z.string().trim().min(1).max(1024),
  status: z.enum(["draft", "pending", "approved", "rejected"]).default("draft")
});

export const TemplateResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  language: z.string(),
  body: z.string(),
  status: z.enum(["draft", "pending", "approved", "rejected"]),
  createdAt: z.string()
});

export const ListTemplatesResponseSchema = z.object({
  data: z.array(TemplateResponseSchema)
});

export const CreateTemplateResponseSchema = z.object({
  data: TemplateResponseSchema
});

export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;
export type TemplateResponse = z.infer<typeof TemplateResponseSchema>;
