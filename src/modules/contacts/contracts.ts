import { z } from "zod";

export const CreateContactRequestSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(32),
  email: z.string().trim().email().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional()
});

export const ContactResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ListContactsResponseSchema = z.object({
  data: z.array(ContactResponseSchema)
});

export const CreateContactResponseSchema = z.object({
  data: ContactResponseSchema
});

export const GetContactResponseSchema = z.object({
  data: ContactResponseSchema
});

export type CreateContactRequest = z.infer<typeof CreateContactRequestSchema>;
export type ContactResponse = z.infer<typeof ContactResponseSchema>;
