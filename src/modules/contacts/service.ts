import { requireAnyRole, type AuthContext } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import type { AuditLogger } from "@/lib/audit";
import {
  CreateContactRequestSchema,
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
      email: parsed.data.email
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

  async listForOrganization(context: AuthContext): Promise<ContactResponse[]> {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    const records = await this.repository.listByOrganization(context.organizationId);
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

  private toResponse(contact: Contact): ContactResponse {
    return {
      id: contact.id,
      organizationId: contact.organizationId,
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email,
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
