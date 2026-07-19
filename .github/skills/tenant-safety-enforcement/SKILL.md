---
name: tenant-safety-enforcement
description: "Use when designing or reviewing tenant-scoped schema, repositories, or APIs. Covers RLS policy design, tenant-safe Prisma extension usage, and leakage prevention checks."
---
# Tenant Safety Enforcement Skill

## Use When
- Adding tenant-scoped tables
- Implementing repositories or services over tenant data
- Reviewing cross-tenant leakage risk

## Required Outcomes
1. Every tenant-scoped table includes organizationId and supporting indexes.
2. RLS policies exist for tenant-scoped tables.
3. ORM access goes through tenant-safe repository or extension path.
4. Tests include negative cross-tenant access cases.

## Checklist
- Confirm tenant boundary for each touched model.
- Confirm query path cannot bypass organization filter.
- Confirm elevated admin paths are explicit and audited.
- Confirm security and QA artifacts are updated.

## Output Format
1. Tenant risk summary
2. Required schema and policy updates
3. Required repository and service updates
4. Test additions
5. Residual risks
