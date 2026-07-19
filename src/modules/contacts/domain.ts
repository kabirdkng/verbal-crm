export type Contact = {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};
