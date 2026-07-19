# Git history and repo memory conventions

## Git history
- Prefer small, reviewable commits that match delivery stages (docs → platform → UI → quality).
- Commit message style: `type(scope): summary` using conventional types (`feat`, `fix`, `docs`, `test`, `chore`, `ci`).
- Never commit secrets, `.env`, or production credentials.
- Keep `main` green: `npm test` and `npm run build` must pass before merge.

## When to commit during a feature flow
1. After product/architecture docs land
2. After each vertical backend slice (or one cohesive platform commit)
3. After UI that consumes the APIs
4. After tests/CI/release artifacts
5. After updating `memories/repo` when guardrails change

## Repo memory (`memories/repo`)
Follow `docs/REPO_MEMORY_PLAYBOOK.md`.

Update memory when:
- An ADR is accepted or superseded
- Build/test commands change
- A new integration pitfall is discovered
- Module boundaries move

Memory files are **committed to git** so agents and humans share the same operational facts.
