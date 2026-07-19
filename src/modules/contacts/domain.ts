export type Contact = {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
};
