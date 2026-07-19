export type ConversationStatus = "open" | "pending" | "closed";

export type Conversation = {
  id: string;
  organizationId: string;
  contactId: string;
  phone: string;
  status: ConversationStatus;
  lastMessageAt: Date | null;
  lastInboundAt: Date | null;
  assignedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
