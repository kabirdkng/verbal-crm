import { z } from "zod";

export const WhatsAppInboundMessageSchema = z.object({
  from: z.string().min(5),
  id: z.string().min(1),
  timestamp: z.string().optional(),
  type: z.string().optional(),
  text: z
    .object({
      body: z.string().min(1)
    })
    .optional(),
  profileName: z.string().optional()
});

export const WhatsAppWebhookPayloadSchema = z.object({
  object: z.string().optional(),
  organizationId: z.string().min(1).optional(),
  entry: z
    .array(
      z.object({
        id: z.string().optional(),
        changes: z
          .array(
            z.object({
              value: z
                .object({
                  metadata: z
                    .object({
                      phone_number_id: z.string().optional(),
                      display_phone_number: z.string().optional()
                    })
                    .optional(),
                  contacts: z
                    .array(
                      z.object({
                        profile: z
                          .object({
                            name: z.string().optional()
                          })
                          .optional(),
                        wa_id: z.string().optional()
                      })
                    )
                    .optional(),
                  messages: z.array(WhatsAppInboundMessageSchema).optional()
                })
                .passthrough()
            })
          )
          .optional()
      })
    )
    .optional(),
  // Simplified test payload (non-Meta envelope)
  message: WhatsAppInboundMessageSchema.optional()
});

export type WhatsAppWebhookPayload = z.infer<typeof WhatsAppWebhookPayloadSchema>;

export const WebhookAckResponseSchema = z.object({
  data: z.object({
    accepted: z.boolean(),
    duplicate: z.boolean(),
    eventId: z.string().nullable(),
    jobId: z.string().nullable()
  })
});
