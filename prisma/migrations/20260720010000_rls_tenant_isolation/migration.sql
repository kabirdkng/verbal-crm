-- Tenant isolation RLS backstop for tenant-scoped CRM tables.
-- Application must SET LOCAL app.organization_id via runWithTenant().
-- FORCE ROW LEVEL SECURITY so the app DB role cannot bypass policies.
--
-- NOT covered by RLS (intentionally):
--   users, organizations, sessions — identity bootstrap
--   memberships — users may belong to multiple orgs (listed at login)
--   webhook_events — global provider-event-id idempotency lookup

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes FORCE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts FORCE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_contacts ON contacts;
DROP POLICY IF EXISTS tenant_isolation_conversations ON conversations;
DROP POLICY IF EXISTS tenant_isolation_messages ON messages;
DROP POLICY IF EXISTS tenant_isolation_templates ON message_templates;
DROP POLICY IF EXISTS tenant_isolation_notes ON notes;
DROP POLICY IF EXISTS tenant_isolation_broadcasts ON broadcasts;
DROP POLICY IF EXISTS tenant_isolation_automations ON automation_rules;
DROP POLICY IF EXISTS tenant_isolation_ai_usage ON ai_usage;
DROP POLICY IF EXISTS tenant_isolation_audit ON audit_events;

CREATE POLICY tenant_isolation_contacts ON contacts
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_conversations ON conversations
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_messages ON messages
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_templates ON message_templates
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_notes ON notes
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_broadcasts ON broadcasts
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_automations ON automation_rules
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_ai_usage ON ai_usage
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY tenant_isolation_audit ON audit_events
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));
