import { requireAnyRole, type AuthContext } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import type { AuditLogger } from "@/lib/audit";
import {
  CreateContactRequestSchema,
  UpdateContactRequestSchema,
  type ContactResponse,
  type CreateContactRequest
} from "@/modules/contacts/contracts";
import type { ContactsRepository } from "@/modules/contacts/repository";
import type { Contact } from "@/modules/contacts/domain";

export class ContactsService {
  constructor(
    private readonly repository: ContactsRepository,
    private readonly auditLogger: AuditLogger
  ) {}

  async create(context: AuthContext, payload: unknown): Promise<ContactResponse> {
    requireAnyRole(context, ["admin", "manager"]);

    const parsed = CreateContactRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid contact payload", parsed.error.flatten());
    }

    const created = await this.repository.create({
      organizationId: context.organizationId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      tags: parsed.data.tags
    });

    await this.auditLogger.log({
      action: "contact.created",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "contact",
      entityId: created.id,
      metadata: {
        phone: created.phone,
        hasEmail: Boolean(created.email)
      }
    });

    return this.toResponse(created);
  }

  async listForOrganization(
    context: AuthContext,
    query?: { q?: string; tag?: string }
  ): Promise<ContactResponse[]> {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    let records = await this.repository.listByOrganization(context.organizationId);
    if (query?.q) {
      const q = query.q.toLowerCase();
      records = records.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false)
      );
    }
    if (query?.tag) {
      records = records.filter((c) => c.tags.includes(query.tag!));
    }
    return records.map((record) => this.toResponse(record));
  }

  async getById(context: AuthContext, contactId: string): Promise<ContactResponse> {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    const record = await this.repository.findById(context.organizationId, contactId);
    if (!record) {
      throw new AppError("NOT_FOUND", 404, "Contact not found");
    }
    return this.toResponse(record);
  }

  async update(
    context: AuthContext,
    contactId: string,
    payload: unknown
  ): Promise<ContactResponse> {
    requireAnyRole(context, ["admin", "manager"]);
    const parsed = UpdateContactRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid contact update", parsed.error.flatten());
    }
    if (Object.keys(parsed.data).length === 0) {
      throw new AppError("VALIDATION_ERROR", 400, "No fields to update");
    }

    const updated = await this.repository.update(context.organizationId, contactId, parsed.data);
    if (!updated) {
      throw new AppError("NOT_FOUND", 404, "Contact not found");
    }

    await this.auditLogger.log({
      action: "contact.updated",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "contact",
      entityId: updated.id,
      metadata: parsed.data as Record<string, unknown>
    });

    return this.toResponse(updated);
  }

  async delete(context: AuthContext, contactId: string): Promise<void> {
    requireAnyRole(context, ["admin", "manager"]);
    const ok = await this.repository.delete(context.organizationId, contactId);
    if (!ok) {
      throw new AppError("NOT_FOUND", 404, "Contact not found");
    }
    await this.auditLogger.log({
      action: "contact.deleted",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "contact",
      entityId: contactId
    });
  }

  private toResponse(contact: Contact): ContactResponse {
    return {
      id: contact.id,
      organizationId: contact.organizationId,
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email,
      tags: contact.tags ?? [],
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString()
    };
  }
}

export function buildCreateContactPayload(
  fullName: string,
  phone: string,
  email?: string
): CreateContactRequest {
  return {
    fullName,
    phone,
    email
  };
}
