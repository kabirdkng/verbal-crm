-- Tenant AI voice agent context (Vapi)
CREATE TABLE "voice_agent_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "company_name" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "knowledge_base" TEXT NOT NULL DEFAULT '',
    "first_message" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "voice_provider" TEXT NOT NULL DEFAULT '11labs',
    "voice_id" TEXT NOT NULL DEFAULT 'sarah',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "vapi_api_key" TEXT,
    "vapi_phone_number_id" TEXT,
    "vapi_assistant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_agent_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voice_agent_configs_organization_id_key" ON "voice_agent_configs"("organization_id");

ALTER TABLE "voice_agent_configs" ADD CONSTRAINT "voice_agent_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend voice_calls for multi-channel (whatsapp | vapi)
ALTER TABLE "voice_calls" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'whatsapp';
ALTER TABLE "voice_calls" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'whatsapp';
ALTER TABLE "voice_calls" ADD COLUMN "summary" TEXT;
