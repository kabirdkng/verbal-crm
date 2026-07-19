---
description: "Use when implementing schema, repositories, services, or APIs that access tenant-scoped data. Enforces organization isolation with RLS and tenant-safe Prisma patterns."
applyTo: "**/*.{ts,tsx,sql,prisma}"
---
# Tenant Safety Instructions

- Assume every domain table is tenant-scoped unless explicitly global.
- Include organizationId in schema design and indexes for tenant-scoped records.
- Enforce Postgres RLS policies on tenant-scoped tables.
- Use tenant-safe repository helpers; avoid direct prisma model access.
- For every create/read/update/delete path, verify tenant filters are present.
- Add negative tests proving cross-tenant reads and writes are blocked.
- Add audit logs for sensitive tenant data operations.
- Document any intentional cross-tenant admin operation and require elevated role checks.
