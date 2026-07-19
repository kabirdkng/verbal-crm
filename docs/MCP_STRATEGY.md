# MCP Strategy for Verbal CRM

## Goal
Use MCP servers only where they improve delivery speed, safety, or operational confidence. Keep defaults simple and add MCP integrations incrementally.

## Recommended MCP Adoption

### Phase 1 (Immediate)
1. Database and migrations support
- Purpose: schema governance, migration reliability, and visibility.
- Recommendation: use Prisma MCP tools already available in this environment for migration status and controlled migration operations.
- Usage policy: migration actions require explicit naming and release notes.

2. Documentation and planning support
- Purpose: architecture consistency and quality check workflows.
- Recommendation: keep workspace skills and agents as primary mechanism; no external MCP required.

### Phase 2 (When codebase grows)
1. Issue and project management MCP
- Purpose: map sprint tasks and defects directly to implementation artifacts.
- Candidate: Jira or GitHub project MCP (if your org already uses one).

2. Monitoring and incident MCP
- Purpose: faster triage for production errors and traces.
- Candidate: Sentry MCP endpoint or internal observability MCP proxy.

3. Messaging provider operations MCP
- Purpose: template status, webhook diagnostics, and send-failure analysis.
- Candidate: internal MCP adapter over Meta Graph API and provider logs.

## MCP Decision Rules
- Add MCP only if it removes repeated manual steps across sprints.
- Prefer read-only capabilities first; gate mutating operations.
- Require explicit auth and auditability for write actions.
- Keep fallback CLI/API path documented in case MCP is unavailable.

## Security Rules for MCP
- Never expose secrets in prompts or generated artifacts.
- Scope credentials by environment and least privilege.
- Log MCP actions for production-impacting operations.
- Review MCP tool permissions quarterly.

## Suggested Next MCPs for This Project
1. GitHub issues and PR metadata MCP.
2. Sentry incident lookup MCP.
3. Internal WhatsApp operations MCP adapter.

## Minimal Rollout Plan
1. Enable one read-only MCP integration in dev.
2. Run two sprints and measure cycle-time improvement.
3. Add write operations with approval guardrails.
4. Expand to staging and production with audit logs.
