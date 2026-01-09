---
title: DX Verification Workflow
description: How to validate Gravito’s Developer Experience pillars using the workflow demo.
---

# DX Verification Workflow

This page explains how we prove the Gravito DX pillars (Dev loop, Doctor, Presets, Golden Path, and Config Contract) remain healthy using the **workflow demo** and supporting scripts.

## 1. Run the workflow demo script

```bash
cd examples/workflow-demo
bun run workflow-demo.ts
```

The script already covers the key checkpoints:

- **Install**: `bun install --frozen-lockfile` ensures predictable dependencies.
- **.build CLI**: `bun run build` inside `packages/cli` produces the `gravito` binary that ships the updated `doctor`/`db:migrate` behavior.
- **Atlas migrations**: `bun gravito db:migrate --fresh` (via the local CLI) rebuilds the `users`, `api_tokens`, `products`, and `settings` schema defined in `src/database/migrations/000_initial.ts`. The new `MigrationDriver`/`AtlasMigrationDriver` ensures this works even without `drizzle.config.ts`.
- **Doctor**: `gravito doctor` validates `.env`, `PORT`, the DB connection, migration status, Redis keys, permissions, and both Node/Bun versions. Use the freshly built CLI so the doctor output confirms the local changes instead of an upstream release that still requires `gravito.lock.json`.
- **Tests**: `bun test` runs the Auth + Products suites under `tests/http`, proving the Golden Path APIs behave as expected.

When the script succeeds, you know the `gravito doctor` automation, Atlas-driven persistence, and verification suites are still wired together.

## 2. Manual checkpoints

You can break the steps apart if you prefer to triage a signal:

1. `bun gravito db:migrate --fresh` – ensures migrations apply cleanly and any previous data is reset. Monitor `examples/workflow-demo/src/database/migrations` for schema changes.
2. `bun gravito doctor` – run this after rebuilding `packages/cli`; it will current-run the new doctor checks that tolerate missing Drizzle files and highlight root causes/impacts for env or connection issues.
3. `bun test` (inside `examples/workflow-demo`) – re-running the Auth + CRUD suites quickly confirms the entire HTTP stack is still intact.

## 3. Automating future verifications

- Encourage presenters or CI jobs to call `bun run workflow-demo.ts`. The script already prints the step that failed so you can fix the atomic stage (install, migrations, doctor, or tests).
- Make sure every new Golden Path feature adds a test under `examples/workflow-demo/tests/http` so the `bun test` step reflects real behavior.
- If you add or modify migrations, update the Atlas migration driver or add new files under `src/database/migrations` and confirm `bun gravito db:migrate --fresh` still converges.

## Related guides

- [Better Than Laravel: Five DX Pillars](./dx-pillars.md) – see the pillar descriptions we’re validating.
- [Config Contract](./config-contract.md) – the doctor checks rely on consistent key naming so we can surface issues before runtime.
