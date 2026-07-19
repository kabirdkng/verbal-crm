# Verbal CRM Development Harness

## Purpose
This harness defines the end-to-end workflow, role ownership, and quality gates required to deliver Verbal CRM features safely and consistently.

## Mandatory Guardrails
- Tenant isolation is enforced with both RLS and tenant-safe Prisma extension patterns.
- WhatsApp webhooks are idempotent and deduplicated before downstream processing.
- Webhook handlers acknowledge quickly and enqueue long-running work.
- RBAC and audit logging are included for sensitive actions.
- AI usage is metered per organization and tied to billing controls.

## End-to-End Workflow
1. Intake and scope definition
2. Architecture decision and risk review
3. Sprint planning and task slicing
4. Implementation by vertical slice
5. Test and quality validation
6. UAT sign-off and release readiness
7. Production rollout and post-release monitoring

## Stage Details

### 1) Intake and Scope
Owner: Product Owner
Output:
- Problem statement
- Acceptance criteria
- Non-goals
- KPI target

Entry criteria:
- Business objective and target personas defined.
Exit criteria:
- Acceptance criteria approved.

### 2) Architecture and Risk
Owner: Technical Architect
Output:
- Architecture decision record
- Data boundary and tenancy plan
- Event flow and idempotency design

Entry criteria:
- Approved scope from stage 1.
Exit criteria:
- Architecture sign-off with unresolved risks explicitly listed.

### 3) Sprint Planning
Owner: Scrum Master + Tech Lead
Output:
- Sprint backlog
- Dependency map
- Definition-of-done checklist per story

Entry criteria:
- Architecture sign-off.
Exit criteria:
- Sprint board with owners and due dates.

### 4) Build
Owner: Engineering roles
Output:
- Implemented code with tests
- Migration notes when schema changes occur
- Observability and audit coverage

Entry criteria:
- Planned and assigned tasks.
Exit criteria:
- PR-ready changes with passing quality gates.

### 5) Quality Validation
Owner: QA Automation Engineer
Output:
- Risk matrix
- Automated test evidence
- Coverage gap report

Entry criteria:
- Feature-complete implementation.
Exit criteria:
- Release readiness verdict for automated quality gates.

### 6) UAT
Owner: Manual UAT Coordinator
Output:
- UAT scripts and execution evidence
- Defect report and severity triage
- Sign-off recommendation

Entry criteria:
- QA automation gates passed.
Exit criteria:
- UAT sign-off or documented blockers.

### 7) Release and Operate
Owner: DevOps Engineer
Output:
- Deployment execution record
- Monitoring and alert status
- Rollback readiness confirmation

Entry criteria:
- UAT sign-off.
Exit criteria:
- Stable production release and post-release review.

## Required Artifacts Per Feature
- Product brief with acceptance criteria
- Architecture note with trade-offs
- Implementation task list
- Test plan and evidence
- UAT packet
- Release checklist
- Post-release metrics snapshot

## PR Checklist
- Tenant isolation verified for every data path.
- RBAC checks present.
- Audit logging present for sensitive changes.
- Webhook and event idempotency verified.
- AI cost metering touched where applicable.
- Unit and integration tests updated.
- Documentation updated.

## Incident Readiness
- Feature flags for risky changes.
- Rollback strategy documented.
- Runbook owner assigned.
- Alert thresholds validated.
