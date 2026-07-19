export type TemplateStatus = "draft" | "pending" | "approved" | "rejected";

export type MessageTemplate = {
  id: string;
  organizationId: string;
  name: string;
  language: string;
  body: string;
  status: TemplateStatus;
  createdAt: Date;
};
