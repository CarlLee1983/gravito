---
title: Workflow Demo
description: A hands-on showcase of Dev Loop, Doctor, and testing vitality using an MVC + React Gravito example.
---

# Workflow Demo (Product HQ)

**Goal**: walk through a Gravito Dev Loop using an Enterprise-style MVC + React stack that exercises `bun dev`, `gravito doctor`, `bun run test`, and verification scripts while exercising Auth, Profile, Settings, and Products Golden Paths.

## What this demo shows

- ✅ **Dev Loop KPI**: `bun dev` boots in < 1.5s, watches `routes/`, `controllers/`, `views/`, `i18n`, and `.env`, and reloads UI instantly.  
- 🧪 **Doctor + Health**: `bun gravito doctor` inspects env keys, port, DB, migrations, Redis, and runtime versions, highlighting any actionable fixes.  
- 🧰 **Presets in action**: `examples/workflow-demo` can be bootstrapped from the Enterprise MVC preset (Auth + Profile + Settings + Products) so we always start from a verified Golden Path.  
- 🧪 **Testing**: At least two suites—Auth flow + Products CRUD—run via Gravito’s `HttpTester` to safeguard the workflow.
- 🧱 **Atlas persistence**: `src/database/migrations` contains bills for users, settings, products, and API tokens so the demo runs on real SQL data.

## Quickstart

```bash
cd examples/workflow-demo
bun install --frozen-lockfile
bun gravito db:migrate
bun gravito doctor
bun run dev
```

While the dev server runs you can:

- hit `http://localhost:3001/health` or `/` to see the status page.  
- call `/auth/register` → `/products` endpoints with Postman or curl (Authorization `Bearer <token>`).  
- edit `src/controllers/ProductController.ts` to see Bun watcher reload without restarting.

## Verification script

Run the bundled workflow script to sequentially verify install, doctor, and tests:

```bash
bun run workflow-demo.ts
```

The script performs:

1. `bun install --frozen-lockfile`
2. `bun gravito db:migrate --fresh` (resets and reapplies Atlas migrations)
3. `bun gravito doctor`
4. `bun test`

If any step fails, the script stops and prints the failing stage.

## Workflow script (future)

Under `examples/workflow-demo`, we’ll include a packaged script that:

1. Runs `bun install --frozen-lockfile` to ensure dependencies match `bun.lock`.  
2. Invokes `bun gravito doctor` and summarizes the health report.  
3. Starts `bun dev --watch` while monitoring logs for faster reload feedback.  
4. Executes `bun run test` to confirm Auth + CRUD coverage.  

## Next steps

1. Copy the `enterprise-mvc` template into this folder and tweak it for React + Inertia UI.  
2. Seed the database with sample users/products so every demo run has data to show.  
3. Document the exact commands, expected behaviors, and verification checkboxes in this README.  
4. Optionally add `workflow-demo.ts` to automate the verification steps for presenters.
