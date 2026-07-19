-- WhatsApp voice calling records (business + user initiated)
CREATE TABLE "voice_calls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "contact_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider_call_id" TEXT,
    "agent_user_id" TEXT,
    "answer_sdp" TEXT,
    "duration_seconds" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_calls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "voice_calls_organization_id_contact_id_idx" ON "voice_calls"("organization_id", "contact_id");
CREATE INDEX "voice_calls_organization_id_conversation_id_idx" ON "voice_calls"("organization_id", "conversation_id");
CREATE INDEX "voice_calls_provider_call_id_idx" ON "voice_calls"("provider_call_id");

ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tenant RLS
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_voice_calls ON voice_calls;
CREATE POLICY tenant_isolation_voice_calls ON voice_calls
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));
