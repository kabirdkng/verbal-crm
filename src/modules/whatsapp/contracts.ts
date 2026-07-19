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
                  messages: z.array(WhatsAppInboundMessageSchema).optional(),
                  // Cloud API Calling webhooks (field=calls)
                  calls: z
                    .array(
                      z
                        .object({
                          id: z.string().optional(),
                          event: z.string().optional(),
                          direction: z.string().optional(),
                          from: z.string().optional(),
                          to: z.string().optional(),
                          status: z.union([z.string(), z.array(z.string())]).optional(),
                          start_time: z.string().optional(),
                          end_time: z.string().optional(),
                          duration: z.number().optional(),
                          session: z
                            .object({
                              sdp_type: z.string().optional(),
                              sdp: z.string().optional()
                            })
                            .optional(),
                          biz_opaque_callback_data: z.string().optional()
                        })
                        .passthrough()
                    )
                    .optional(),
                  statuses: z
                    .array(
                      z
                        .object({
                          id: z.string().optional(),
                          type: z.string().optional(),
                          status: z.string().optional(),
                          timestamp: z.string().optional(),
                          recipient_id: z.string().optional()
                        })
                        .passthrough()
                    )
                    .optional()
                })
                .passthrough(),
              field: z.string().optional()
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
