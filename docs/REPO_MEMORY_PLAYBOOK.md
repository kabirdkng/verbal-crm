# Repo Memory Playbook

## Purpose
Keep persistent repository knowledge in `memories/repo/` (project root) so future sessions preserve critical architectural decisions and operational rules.

Memory is **versioned in git** alongside docs. Prefer updating memory in the same PR/commit that changes the underlying behavior.

## What to Store
- Verified build and test commands.
- Module boundaries and ownership rules.
- Architecture decisions that affect safety and correctness.
- Known pitfalls and recurring failure modes.
- Release and rollback conventions.

## What Not to Store
- Secrets or credentials.
- Temporary scratch notes that do not matter after the session.
- Duplicated content that already exists in stable docs without added operational value.

## Update Triggers
- New ADR accepted.
- New critical bug class discovered.
- CI, migration, or deploy process changed.
- Integration provider constraints updated.
- Module map or composition root changes.

## Memory Files (current)
- `memories/repo/architecture-guardrails.md` — non-negotiable design rules
- `memories/repo/build-and-test.md` — verified commands and test notes
- `memories/repo/integration-gotchas.md` — WhatsApp, tenant, AI pitfalls
- `memories/repo/module-map.md` — ownership map for agents

## Related docs
- Stable product/architecture narrative: `docs/product`, `docs/architecture`
- Delivery process: `docs/DEVELOPMENT_HARNESS.md`
- Git conventions: `docs/GIT_AND_MEMORY.md`
- Changelog: `docs/CHANGELOG.md`

## Quality Standard
- Keep bullets short.
- Prefer verified facts over aspirational statements.
- Remove or correct stale guidance quickly.
- Date or reference the verification (e.g. test count, ADR id).
