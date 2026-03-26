---
phase: 04B-6-openapi-cleanup
plan: "01"
subsystem: photon
tags: [hono-migration, openapi, cleanup, deprecation, dependency-removal]
dependency_graph:
  requires:
    - Phase 4B-2 (JWT native implementation)
    - Phase 4B-4 (Platform adapter deprecation pattern)
    - Phase 4B-5 (RPC client peerDependency strategy)
  provides:
    - packages/photon/src/openapi.ts (deprecated JSDoc, ./openapi sub-path export)
    - packages/photon/package.json (hono-free dependencies, ./openapi export)
  affects:
    - packages/photon (bun.ts removed, openapi scoped to sub-path)
tech_stack:
  added: []
  patterns:
    - "@deprecated v2.0 JSDoc with Removal target: v3.0 (following Phase 4B-4 adapter pattern)"
    - "Optional sub-path exports (./openapi) for Hono-dependent features"
    - "Hono removed from main dependencies — optional use only via sub-paths"
key_files:
  created: []
  modified:
    - packages/photon/src/openapi.ts
    - packages/photon/src/middleware/websocket.ts
    - packages/photon/package.json
    - packages/photon/build.ts
    - packages/photon/tests/exports.test.ts
  deleted:
    - packages/photon/src/bun.ts
decisions:
  - "D-01: Remove bun.ts entirely — users should use Bun.serve() directly or @gravito/core BunNativeAdapter"
  - "D-02: Scope @hono/zod-openapi to ./openapi sub-path with @deprecated v2.0 JSDoc (Removal target: v3.0)"
  - "D-03: Remove hono from both dependencies and peerDependencies — sub-path users install separately"
metrics:
  duration: "135 seconds (~2 minutes)"
  completed_date: "2026-03-26"
  tasks_completed: 3
  files_modified: 5
  files_deleted: 1
---

# Phase 04B-6 Plan 01: OpenAPI Scoping and Final Hono Cleanup Summary

**One-liner:** Removed bun.ts Hono re-export, scoped @hono/zod-openapi to ./openapi sub-path with @deprecated v2.0 JSDoc, and removed hono entirely from photon's dependencies/peerDependencies.

---

## What Was Done

This plan completed the final Hono migration cleanup for the photon package by executing three locked decisions (D-01, D-02, D-03) from the Phase 04B-6 context.

### Task 1: Remove bun.ts and update openapi.ts JSDoc (D-01, D-02)

- **Deleted** `packages/photon/src/bun.ts` — this file only re-exported `hono/bun`, providing minimal value and creating a Hono runtime dependency with no migration path
- **Updated** `packages/photon/src/openapi.ts` with proper `@deprecated v2.0 — OpenAPI path has explicit Hono dependency` JSDoc and `Removal target: v3.0`, following the established pattern from Phase 4B-4 (cloudflare.ts) and Phase 4B-5 (client.ts)
- **Updated** `packages/photon/src/middleware/websocket.ts` to remove the `@gravito/photon/bun` import reference from JSDoc example, replacing it with `// For Bun runtime, use Bun.serve() directly or @gravito/core BunNativeAdapter`

**Commit:** `9632049c`

### Task 2: Update package.json exports and remove hono dependency (D-01, D-02, D-03)

- **Removed** `"./bun"` sub-path from package.json exports (D-01)
- **Added** `"./openapi"` sub-path to package.json exports with bun/types/default fields (D-02)
- **Removed** `"hono": "^4.12.2"` from `dependencies` (D-03)
- **Removed** `"hono": "^4.12.0"` from `peerDependencies` (D-03)
- **Removed** `"hono": { "optional": true }` from `peerDependenciesMeta` (D-03)
- **Kept** `"@hono/zod-openapi": "^1.2.0"` in `optionalDependencies` (intentional — users of ./openapi sub-path need it)
- **Removed** `'src/bun.ts'` from `build.ts` entrypoints array (D-01)

**Commit:** `e51e59e0`

### Task 3: Update exports.test.ts — remove bun test, add openapi deprecation tests

- **Removed** `import * as honoBun from 'hono/bun'` (bun.ts deleted)
- **Removed** `import * as bunExports from '../src/bun'` (bun.ts deleted)
- **Removed** `it('re-exports hono/bun helpers', ...)` test block
- **Added** `describe('OpenAPI exports', ...)` block with 3 tests:
  1. `PhotonOpenAPI` class exported from openapi sub-path
  2. `createRoute` and `z` helpers exported
  3. `@deprecated v2.0` and `Removal target: v3.0` JSDoc in source

**Commit:** `500d0873`

---

## Verification Results

```
bun test packages/photon --timeout=10000
294 pass, 0 fail
Ran 294 tests across 18 files [357ms]
```

- `packages/photon/src/bun.ts` — does not exist (PASS)
- `package.json exports["./bun"]` — undefined (PASS)
- `package.json exports["./openapi"]` — `{ bun: './dist/openapi.js', types: './dist/openapi.d.ts', default: './dist/openapi.js' }` (PASS)
- `package.json dependencies.hono` — undefined (PASS)
- `package.json peerDependencies` — `{ "@opentelemetry/api": "^1.0.0" }` (PASS, hono removed)
- `package.json optionalDependencies["@hono/zod-openapi"]` — `"^1.2.0"` (PASS, kept)
- `openapi.ts` contains `@deprecated v2.0 — OpenAPI path has explicit Hono dependency` (PASS)
- `openapi.ts` contains `Removal target: v3.0` (PASS)
- `openapi.ts` still contains `export class PhotonOpenAPI extends OpenAPIHono` (PASS)
- `openapi.ts` still contains `export { createRoute, z }` (PASS)
- `websocket.ts` no longer references `@gravito/photon/bun` (PASS)
- `build.ts` entrypoints does not contain `'src/bun.ts'` (PASS)

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. All exported functionality from openapi.ts (`PhotonOpenAPI`, `createRoute`, `z`) is fully functional via the `@hono/zod-openapi` optional dependency.

---

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `9632049c` | Remove bun.ts, update openapi.ts JSDoc, fix websocket.ts comment |
| Task 2 | `e51e59e0` | Update package.json exports and remove hono dependency |
| Task 3 | `500d0873` | Update exports.test.ts — remove bun test, add openapi deprecation tests |

---

## Phase 04B-6 Status

This plan completes the source and configuration changes for Phase 04B-6. The photon package is now:

1. **Hono-free in main dependencies** — users who only use `@gravito/photon` main entry do not pull in hono
2. **OpenAPI scoped** — `./openapi` sub-path available for those who need it, clearly marked @deprecated v2.0
3. **bun.ts removed** — Bun-specific users directed to `Bun.serve()` or `@gravito/core BunNativeAdapter`
4. **Fully tested** — 294 tests pass, 0 fail; health baseline 93/100 maintained

## Self-Check: PASSED

- `packages/photon/src/bun.ts` — MISSING (expected, deleted): CONFIRMED
- `packages/photon/src/openapi.ts` — FOUND: CONFIRMED
- `packages/photon/package.json` — FOUND: CONFIRMED
- `packages/photon/build.ts` — FOUND: CONFIRMED
- `packages/photon/tests/exports.test.ts` — FOUND: CONFIRMED
- Commit `9632049c` — FOUND in git log
- Commit `e51e59e0` — FOUND in git log
- Commit `500d0873` — FOUND in git log
