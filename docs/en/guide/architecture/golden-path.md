---
title: Golden Path
description: What every Gravito preset ships with—routes, directories, feature slice, and tests that prove the path works end-to-end.
---

# Golden Path

Every Gravito preset is more than a demo—it is a **Golden Path** that proves the stack from `routes/` down to tests is working. When you generate a preset, expect the following structure and artifacts to be present out of the box:

## 1. Routes / App / Database

- **`routes/`** contains clearly named route files (`api.ts`, `web.ts`, `ws.ts`) that map to controllers in `app/controllers`.
- **`app/`** houses services, controllers, requests, resources, and view adapters. Feature slices live inside `app/features/<feature>`.
- **`database/`** includes migrations, seeders, and domain models powered by Atlas. The migrations folder is bootstrapped with at least one base migration (`create_users_table.ts` that matches the Auth feature).
- Each preset also includes a `gravito.config.ts` (or `gravito.config.mjs`) that wires the routes, orbits, and middleware together.

## 2. Feature Slice: Auth + Profile + Settings

The Golden Path feature slice is composed of:

- **Auth**: Registration, login, logout, password reset, and email verification flows using Sentinel/Fortify. Controllers, form requests, and events are already wired in.
- **Profile**: A `ProfileController` with GET/PUT endpoints, DTO validation, and service logic that reads the authenticated user.
- **Settings**: A settings panel that persists preferences (e.g., theme, notifications) via Atlas models and exposes a RESTful CRUD surface.

Each slice includes the matching views (Inertia or Prism), API routes, and service layer so the developer can trace a request from the HTTP layer all the way through persistence and back.

## 3. Tests for Every Route

The Golden Path enforces two categories of automated tests per preset:

1. **Auth flow test**: Ensures registration/login/logout work and guard middleware blocks access when appropriate.
2. **CRUD flow test**: Covers at least one resource (typically settings or profiles) including create/read/update/delete cycles.

Tests live under `tests/http` or `tests/feature` and use Gravito's `HttpTester` to simulate requests. Because they run in a Bun-native environment, the Dev Loop stays tight even with guards in place.

## 4. Verification Checklist

Before you call a preset “ready”, the Golden Path asks you to verify:

- `bun dev` boots, watches, and typechecks all routes + controllers.  
- `bun test` exercises the Auth + CRUD suites without flakiness.  
- `bun gravito doctor` reports a healthy stack (env keys, DB connection, Redis, migrations, Node/Bun).  
- Every important directory (`routes/`, `app/`, `database/`, `tests/`) is referenced in the Config Contract, so Orbits have predictable wiring.

Hit the [Presets guide](./presets.md) to see which preset adds which folders plus the [Config Contract guide](./config-contract.md) for naming conventions that keep the Golden Path consistent.
