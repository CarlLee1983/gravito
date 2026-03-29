---
phase: 16-core-error-model-foundation
plan: "02"
subsystem: error-model
tags: [error-codes, orbit-packages, atlas, plasma, signal, quasar, as-const-pattern]
dependency_graph:
  requires: [16-01]
  provides: [DatabaseErrorCodes, CacheErrorCodes, MailErrorCodes, QueueErrorCodes]
  affects: [packages/atlas, packages/plasma, packages/signal, packages/quasar]
tech_stack:
  added: []
  patterns: [as-const-error-codes, dot-separated-namespaces, deprecated-backward-compat]
key_files:
  created:
    - packages/atlas/src/errors/codes.ts
    - packages/plasma/src/errors/codes.ts
    - packages/signal/src/errors/codes.ts
    - packages/quasar/src/errors/index.ts
  modified:
    - packages/atlas/src/errors/index.ts
    - packages/plasma/src/index.ts
    - packages/signal/src/index.ts
    - packages/quasar/src/errors/codes.ts
    - packages/quasar/src/index.ts
decisions:
  - "Signal MailErrorCodes exports only const object from index (not type alias) to avoid conflict with existing MailErrorCode enum"
  - "Quasar errors/index.ts created as new barrel export, then added to quasar public API"
metrics:
  duration: "~7 minutes"
  completed_date: "2026-03-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 5
---

# Phase 16 Plan 02: Orbit ErrorCode Const Objects Summary

**One-liner:** Four Orbit packages (atlas, plasma, signal, quasar) receive typed `as const` error code objects with dot-separated namespaces following fortify's established pattern.

## What Was Built

Created structured error code const objects for four key Orbit packages:

| Package | Export Name | Namespace | Codes |
|---------|-------------|-----------|-------|
| `@gravito/atlas` | `DatabaseErrorCodes` | `db.*` | 10 codes |
| `@gravito/plasma` | `CacheErrorCodes` | `redis.*` | 6 codes |
| `@gravito/signal` | `MailErrorCodes` | `mail.*` | 7 codes |
| `@gravito/quasar` | `QueueErrorCodes` | `queue.*` | 6 codes |

All follow fortify's `as const` + derived type pattern:
```typescript
export const XxxErrorCodes = { ... } as const
export type XxxErrorCode = (typeof XxxErrorCodes)[keyof typeof XxxErrorCodes]
```

## Tasks

### Task 1: DatabaseErrorCodes and CacheErrorCodes (Commit: 9f754d53)

- Created `packages/atlas/src/errors/codes.ts` with `DatabaseErrorCodes` (10 codes covering connection, query, constraint, and transaction errors in `db.*` namespace)
- Added `export * from './codes'` to `packages/atlas/src/errors/index.ts`
- Created `packages/plasma/src/errors/codes.ts` with `CacheErrorCodes` (6 codes covering connection, operation, and pool errors in `redis.*` namespace)
- Added `export * from './errors/codes'` to `packages/plasma/src/index.ts`

### Task 2: MailErrorCodes and QueueErrorCodes (Commit: b45928bc)

- Created `packages/signal/src/errors/codes.ts` with `MailErrorCodes` (7 codes in `mail.*` namespace)
- Exported `MailErrorCodes` from `packages/signal/src/index.ts` without conflicting with existing `MailErrorCode` enum
- Updated `packages/quasar/src/errors/codes.ts` to replace numeric `QUASAR_ERR_NNN` pattern with `QueueErrorCodes` (6 codes in `queue.*` namespace)
- Preserved backward-compatible `ErrorCodes` re-export with `@deprecated` annotations in quasar
- Created `packages/quasar/src/errors/index.ts` as barrel export for errors folder
- Added `export * from './errors'` to `packages/quasar/src/index.ts`

## Verification Results

- `bun run typecheck`: 83/83 tasks successful, 0 errors
- `quasar tests`: 247/247 pass, 0 fail (no regressions from renamed codes)
- All acceptance criteria met (verified per-criterion)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Signal MailErrorCode name conflict**
- **Found during:** Task 2
- **Issue:** New `MailErrorCode` type alias in `errors/codes.ts` would conflict with existing `MailErrorCode` enum already exported from `index.ts`
- **Fix:** Used named export `export { MailErrorCodes } from './errors/codes'` instead of `export * from './errors/codes'` to export only the const object without the conflicting type alias
- **Files modified:** `packages/signal/src/index.ts`
- **Commit:** b45928bc

**2. [Rule 2 - Missing Critical Functionality] Quasar errors not in public API**
- **Found during:** Task 2
- **Issue:** Quasar had no `errors/index.ts` barrel file and errors were not exported from the package's main `index.ts`
- **Fix:** Created `packages/quasar/src/errors/index.ts` as barrel and added `export * from './errors'` to `packages/quasar/src/index.ts`
- **Files modified:** `packages/quasar/src/errors/index.ts` (created), `packages/quasar/src/index.ts`
- **Commit:** b45928bc

## Self-Check: PASSED

Files verified:
- `packages/atlas/src/errors/codes.ts` — FOUND
- `packages/plasma/src/errors/codes.ts` — FOUND
- `packages/signal/src/errors/codes.ts` — FOUND
- `packages/quasar/src/errors/codes.ts` — FOUND (updated)
- `packages/quasar/src/errors/index.ts` — FOUND (created)

Commits verified:
- `9f754d53` — Task 1 (DatabaseErrorCodes, CacheErrorCodes)
- `b45928bc` — Task 2 (MailErrorCodes, QueueErrorCodes)
