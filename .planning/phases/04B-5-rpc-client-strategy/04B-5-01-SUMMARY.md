---
phase: 04B-5-rpc-client-strategy
plan: "01"
subsystem: photon
tags: [rpc, deprecation, peer-dependency, hono-migration]
dependency_graph:
  requires: []
  provides: [photon-rpc-client-deprecated, photon-hono-peer-dep]
  affects: [packages/photon, packages/beam]
tech_stack:
  added: []
  patterns: [optional-peer-dependency, deprecated-jsdoc, hc-only-export]
key_files:
  created: []
  modified:
    - packages/photon/src/client.ts
    - packages/photon/package.json
    - packages/photon/tests/exports.test.ts
decisions:
  - "Narrow client.ts from export * to export { hc } only per D-05 strategy"
  - "Add hono as optional peerDependency per D-06"
  - "Update exports test to verify hc-only export (not full hono/client parity)"
metrics:
  duration: "3 minutes (182 seconds)"
  completed: "2026-03-26"
  tasks_completed: 2
  files_modified: 3
---

# Phase 04B-5 Plan 01: RPC Client Strategy Summary

**One-liner:** Formalized RPC client deprecation strategy with @deprecated v2.0 JSDoc targeting v3.0 native replacement, plus hono optional peerDependency signal.

---

## Execution Summary

**Duration:** 182 seconds
**Tasks:** 2/2 completed
**Files modified:** 3
**Commits:** 4

---

## Changes Made

### Task 1: client.ts @deprecated JSDoc (packages/photon/src/client.ts)

**Before:** Generic "Hono compatibility layer" JSDoc with removal timeline "v2.0 (2026 Q3)" and `export * from 'hono/client'`

**After:**
- Precise `@deprecated v2.0` marker with `Removal target: v3.0`
- Explains type-only nature: no runtime code from hono/client executed
- Migration path: "native Gravito RPC type system in v3.0+"
- Changed `export *` to `export { hc }` (narrowed to only what beam needs)
- Includes `@see` links to Gravito RPC docs and Hono hc() helper

**Key change rationale:** Per decision D-05, the export was narrowed from `export *` (which exposed `DetailedError`, `parseResponse`, `hc`) to just `export { hc }`. Beam only uses `hc`, and exposing internal Hono client symbols contradicts the deprecation strategy.

### Task 2: package.json peerDependency (packages/photon/package.json)

**Added to peerDependencies:**
```json
"hono": "^4.12.0"
```

**Added to peerDependenciesMeta:**
```json
"hono": { "optional": true }
```

**Signal:** RPC client functionality requires hono types at compile time, but users don't need to install hono separately (photon already depends on it). Deprecation strategy: v3.0 removes both.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated exports test to match narrowed hc-only export**
- **Found during:** Task 1 verification
- **Issue:** Previous test checked full `hono/client` export parity (3 symbols: `hc`, `DetailedError`, `parseResponse`). After narrowing to `export { hc }`, test failed with 2 missing symbols.
- **Fix:** Updated test to verify `hc` is a function and only `hc` is exported. Added documentation comment explaining deprecation context.
- **Files modified:** `packages/photon/tests/exports.test.ts`
- **Commit:** 5e2285df

**2. [Rule 1 - Bug] Removed unused honoClient import from exports test**
- **Found during:** Full typecheck after test update
- **Issue:** `import * as honoClient from 'hono/client'` became unused after test refactor. TypeScript strict `noUnusedLocals` flagged it with TS6133 error.
- **Fix:** Removed the unused import.
- **Files modified:** `packages/photon/tests/exports.test.ts`
- **Commit:** 13f03ad0

---

## Verification Results

### TypeCheck
- Photon: ✅ 0 errors
- Full framework: ✅ 83/83 packages pass, 0 errors

### Build
- Photon build: ✅ `Photon build completed`

### Tests
- Photon: ✅ 288/288 pass, 0 fail
- Beam: ✅ 163/163 pass, 0 fail

### Exports Verification
- `import { hc } from '@gravito/photon/client'`: ✅ hc is a function
- Client exports: ✅ `['hc']` only

### Health Baseline
- ✅ 93/100 maintained (no regressions)

---

## Git Commits

| Hash | Type | Description |
|------|------|-------------|
| 945d9c1f | feat | Update RPC client with @deprecated v2.0 JSDoc and v3.0 removal target |
| bbcef90f | feat | Add hono as optional peerDependency in photon package.json |
| 5e2285df | fix | Update exports test to match narrowed hc-only RPC client export |
| 13f03ad0 | fix | Remove unused honoClient import from exports test |

---

## Known Stubs

None — all changes are complete and verified.

---

## Self-Check: PASSED

- [x] packages/photon/src/client.ts — modified, contains `@deprecated v2.0` and `Removal target: v3.0`
- [x] packages/photon/package.json — modified, contains `"hono": "^4.12.0"` in peerDependencies
- [x] packages/photon/tests/exports.test.ts — modified, verifies hc-only export
- [x] Commits 945d9c1f, bbcef90f, 5e2285df, 13f03ad0 exist in git log
- [x] 83/83 typecheck pass, 288 photon tests pass, 163 beam tests pass
