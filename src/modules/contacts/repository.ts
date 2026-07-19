import { createId } from "@/lib/ids";
import { normalizePhone } from "@/lib/phone";
import { getStore, type ContactRecord } from "@/lib/store";
import type { Contact } from "@/modules/contacts/domain";

export type CreateContactInput = {
  organizationId: string;
  fullName: string;
  phone: string;
  email?: string;
  tags?: string[];
};

export interface ContactsRepository {
  create(input: CreateContactInput): Promise<Contact>;
  listByOrganization(organizationId: string): Promise<Contact[]>;
  findById(organizationId: string, contactId: string): Promise<Contact | null>;
  findByPhone(organizationId: string, phone: string): Promise<Contact | null>;
  findOrCreateByPhone(
    organizationId: string,
    phone: string,
    fullName?: string
  ): Promise<Contact>;
}

function toDomain(record: ContactRecord): Contact {
  return {
    id: record.id,
    organizationId: record.organizationId,
    fullName: record.fullName,
    phone: record.phone,
    email: record.email,
    tags: record.tags ?? [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class InMemoryContactsRepository implements ContactsRepository {
  async create(input: CreateContactInput): Promise<Contact> {
    const now = new Date();
    const record: ContactRecord = {
      id: createId("ct"),
      organizationId: input.organizationId,
      fullName: input.fullName,
      phone: normalizePhone(input.phone),
      email: input.email ?? null,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now
    };
    getStore().contacts.push(record);
    return toDomain(record);
  }

  async listByOrganization(organizationId: string): Promise<Contact[]> {
    return getStore()
      .contacts.filter((item) => item.organizationId === organizationId)
      .map(toDomain);
  }

  async findById(organizationId: string, contactId: string): Promise<Contact | null> {
    const record = getStore().contacts.find(
      (item) => item.id === contactId && item.organizationId === organizationId
    );
    return record ? toDomain(record) : null;
  }

  async findByPhone(organizationId: string, phone: string): Promise<Contact | null> {
    const normalized = normalizePhone(phone);
    const record = getStore().contacts.find(
      (item) => item.organizationId === organizationId && item.phone === normalized
    );
    return record ? toDomain(record) : null;
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
