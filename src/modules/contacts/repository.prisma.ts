import { normalizePhone } from "@/lib/phone";
import { getDb } from "@/lib/prisma";
import type { Contact } from "@/modules/contacts/domain";
import type { ContactsRepository, CreateContactInput } from "@/modules/contacts/repository";

function toDomain(row: {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): Contact {
  return {
    id: row.id,
    organizationId: row.organizationId,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    tags: row.tags ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class PrismaContactsRepository implements ContactsRepository {
  async create(input: CreateContactInput): Promise<Contact> {
    const row = await getDb().contact.create({
      data: {
        organizationId: input.organizationId,
        fullName: input.fullName,
        phone: normalizePhone(input.phone),
        email: input.email ?? null,
        tags: input.tags ?? []
      }
    });
    return toDomain(row);
  }

  async listByOrganization(organizationId: string): Promise<Contact[]> {
    const rows = await getDb().contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(toDomain);
  }

  async findById(organizationId: string, contactId: string): Promise<Contact | null> {
    const row = await getDb().contact.findFirst({
      where: { id: contactId, organizationId }
    });
    return row ? toDomain(row) : null;
  }

  async findByPhone(organizationId: string, phone: string): Promise<Contact | null> {
    const row = await getDb().contact.findFirst({
      where: { organizationId, phone: normalizePhone(phone) }
    });
    return row ? toDomain(row) : null;
  }

  async findOrCreateByPhone(
    organizationId: string,
    phone: string,
    fullName?: string
  ): Promise<Contact> {
    const existing = await this.findByPhone(organizationId, phone);
    if (existing) {
      return existing;
    }
    return this.create({
      organizationId,
      fullName: fullName?.trim() || `WhatsApp ${normalizePhone(phone)}`,
      phone
    });
  }
}
