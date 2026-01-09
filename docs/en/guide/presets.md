---
title: Presets
description: Define the four curated Gravito presets (minimal, app, realtime, worker) that deliver production-ready Golden Paths.
---

# Presets

Gravito avoids decision paralysis by shipping **curated presets** instead of a grab bag of optional packages. Each preset is a verified Golden Path that bundles routes, application layers, database artifacts, the Auth + Profile + Settings feature slice, and tests (at minimum an Auth flow and a CRUD flow). Pick a preset, and you get an observable, maintainable, extensible starting point.

| Preset | Use case | Core orbits & packages | What ships |
|--------|----------|------------------------|------------|
| `minimal` | API / edge / micro-services | Gravito Core + Atlas + Spectrum (optional) | `routes/api.ts`, `controllers/api/*`, `tests/http/api.test.ts`, zero frontend, all about `bun dev` + `bun test` loops. |
| `app` | Traditional web + Inertia | Gravito Core + Atlas + Ion + Prism + Inertia Bridge | Full MVC stack with `routes/web.ts`, `views/`, Inertia React or Vue entry, `app/services`, and Auth/Profile/Settings feature slice wired through controllers and views. |
| `realtime` | WebSocket broadcasting + Echo-style UX | `@gravito/ripple`, `@gravito/echo`, Atlas, Spectrum | `routes/ws.ts`, `handlers/broadcast.ts`, Presence + Private channels, integrated auth, and `tests/websocket` that verify event delivery. |
| `worker` | Queue-first background jobs | `@gravito/stream`, Stasis/Redis, Atlas, Monitor | Worker entry `src/workers/**`, `jobs/`, Stream Job dispatch + Queue orchestration + graceful shutdown, plus `tests/jobs` covering retries and failure handling. |

Each preset also produces:

- `routes/`, `app/`, and `database/` with a consistent folder layout plus the Auth/Profile/Settings feature slice.  
- A `gravito.config.ts` (or `.mjs`) that wires orbits, middleware, and shared settings while adhering to the Config Contract.  
- Scripts for `bun dev` and `bun test` so the Dev Loop stays under 1.5s cold start with live reload.  
- Tests verifying the Golden Path (Auth + CRUD) using `HttpTester`.

These presets are ready-to-run codebases. When you need to extend a preset, follow the [Golden Path guide](./golden-path.md) to see the routes + tests you must keep green, then consult the [Config Contract guide](./config-contract.md) to stay consistent with naming and logging.
