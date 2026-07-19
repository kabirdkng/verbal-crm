export type MessageDirection = "inbound" | "outbound";
export type MessageChannel = "whatsapp";
export type MessageStatus = "received" | "queued" | "sent" | "failed" | "delivered";

export type Message = {
  id: string;
  organizationId: string;
  conversationId: string;
  contactId: string;
  direction: MessageDirection;
  channel: MessageChannel;
  body: string;
  status: MessageStatus;
  providerMessageId: string | null;
  templateName: string | null;
  createdAt: Date;
  createdByUserId: string | null;
};
