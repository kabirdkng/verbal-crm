# ADR-011: Platform admin → tenant flow

## Status
Accepted (2026-07-20)

## Context
Verbal CRM is multi-tenant. Operators need a **platform control plane** that is distinct from tenant CRM workspaces:

- Platform admins create and list tenants, then **enter** a tenant to operate as elevated admin.
- Tenant users only see their memberships and never the platform `/admin` UI.
- Crude header-only org overrides are not a product auth model.

## Decision

### Identity
- `users.is_platform_admin` marks platform super-admins (seed: `platform@verbal.local`).
- Sessions use role `platform` when on the control plane home org (`org_platform`, slug `platform`).
- Entering a tenant issues a new session with role `admin` on that org (no membership required).
- `POST /api/v1/platform/return` restores a `platform` session on the home org.

### APIs
| Route | Purpose |
|-------|---------|
| `GET /api/v1/platform/tenants` | List tenants (excludes platform home) |
| `POST /api/v1/platform/tenants` | Create tenant (+ optional owner) |
| `POST /api/v1/platform/tenants/enter` | Impersonate tenant workspace |
| `POST /api/v1/platform/return` | Exit tenant → control plane |
| `GET /api/v1/org/organizations` | Memberships; platform admins see all tenants |

All platform routes require `requirePlatformAdmin` (`isPlatformAdmin` or role `platform`).

### Frontend routing
1. Login as platform admin → `/admin` (tenant list).
2. Create tenant → stay on control plane.
3. **Enter workspace** → cookie session switches to tenant → `/` CRM shell.
4. **Exit to admin** → platform session restored → `/admin`.
5. Tenant login (`admin@demo.local`) → CRM shell; `/admin` blocked by auth gate.
6. Multi-membership tenant users → `/select-workspace` when needed.

### Shell
- Platform home / `/admin/*` → admin nav (Tenants, Create tenant).
- Tenant workspace → CRM nav + workspace switcher.
- Platform admin in tenant sees “Exit to admin” and optional Admin link.

### Auth preference
Cookie session is authoritative (`credentials: "include"`). Header auth remains a local/dev fallback when `AUTH_ALLOW_HEADERS` allows it.

## Consequences
- Clear operator UX without shared “type any org id” chrome.
- Platform home org is never treated as a CRM tenant in listings.
- RLS still applies inside tenants; identity bootstrap uses system/admin Prisma paths.
