-- Tenant isolation RLS backstop for Postgres/Neon.
-- Apply after prisma migrate. App must SET app.organization_id per request.

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_contacts ON contacts
  USING (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_conversations ON conversations
  USING (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_messages ON messages
  USING (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_templates ON message_templates
  USING (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_notes ON notes
  USING (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_broadcasts ON broadcasts
  USING (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_automations ON automation_rules
  USING (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_ai_usage ON ai_usage
  USING (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_audit ON audit_events
  USING (organization_id = current_setting('app.organization_id', true));
