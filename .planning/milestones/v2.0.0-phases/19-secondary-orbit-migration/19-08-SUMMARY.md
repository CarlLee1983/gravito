---
phase: 19-secondary-orbit-migration
plan: "08"
subsystem: cosmos, sentinel
tags: [error-model, exception-migration, batch-5]
dependency_graph:
  requires: [19-01, 19-02, 19-03, 19-04]
  provides: [cosmos.CosmosError, sentinel.SentinelError]
  affects: [cosmos, sentinel]
tech_stack:
  added: []
  patterns: [CosmosError extends SystemException, SentinelError extends AuthException]
key_files:
  created:
    - packages/cosmos/src/errors/CosmosError.ts
    - packages/cosmos/src/errors/codes.ts
    - packages/cosmos/src/errors/index.ts
    - packages/cosmos/tests/contract/cosmos-errors.contract.test.ts
    - packages/sentinel/src/errors/SentinelError.ts
    - packages/sentinel/src/errors/codes.ts
    - packages/sentinel/src/errors/index.ts
    - packages/sentinel/tests/contract/sentinel-errors.contract.test.ts
  modified:
    - packages/cosmos/src/I18nService.ts
    - packages/cosmos/src/loader.ts
    - packages/cosmos/src/loaders/FileSystemLoader.ts
    - packages/cosmos/src/loaders/EdgeKVLoader.ts
    - packages/cosmos/src/loaders/Json5Loader.ts
    - packages/cosmos/src/loaders/RemoteLoader.ts
    - packages/cosmos/src/index.ts
    - packages/sentinel/src/AuthManager.ts
    - packages/sentinel/src/guards/SessionGuard.ts
    - packages/sentinel/src/index.ts
decisions:
  - "CosmosError extends SystemException: cosmos is a general system utility (i18n), not a domain or auth module"
  - "SentinelError extends AuthException: sentinel is the authentication/security domain"
  - "5 exempt packages (chromatic, ion, enterprise, ether, spectrum) confirmed 0 bare throws — no changes needed"
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-28"
  tasks: 1
  files: 18
---

# Phase 19 Plan 08: Batch 5 LOW Priority Migration (cosmos + sentinel) Summary

Cosmos and sentinel migrated to structured GravitoException subclasses. 18 bare throws replaced. 5 exempt packages confirmed clean.

## What Was Built

**cosmos** — i18n/translation orbit:
- `CosmosError extends SystemException` with 9 `cosmos.*` namespaced error codes
- Replaced 9 bare `throw new Error()` across `I18nService.ts`, `loader.ts`, `FileSystemLoader.ts`, `EdgeKVLoader.ts`, `Json5Loader.ts`, `RemoteLoader.ts`
- Contract test: 7 tests, all pass

**sentinel** — authentication orbit:
- `SentinelError extends AuthException` with 8 `sentinel.*` namespaced error codes
- Replaced 9 bare `throw new Error()` across `AuthManager.ts` (6 throws) and `SessionGuard.ts` (3 throws)
- Contract test: 8 tests, all pass

**5 exempt packages confirmed** — chromatic, ion, enterprise, ether, spectrum all verified 0 bare throws.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Migrate cosmos and sentinel; confirm 5 exempt packages | Done | 5c7ffc18 |

## Test Results

| Package | Before | After | Change |
|---------|--------|-------|--------|
| cosmos | 120 pass, 0 fail | 120 pass, 0 fail | +7 contract tests |
| sentinel | 112 pass, 1 fail (pre-existing) | 112 pass, 1 fail (pre-existing) | +8 contract tests |

Note: The 1 sentinel failure (`jwt-guard-comprehensive.test.ts`) is pre-existing and unrelated to this migration (verified by stash test).

## Error Codes Introduced

### CosmosErrorCodes (cosmos.*)

| Code | Usage |
|------|-------|
| `cosmos.missing_translation` | I18nService — `onMissingKey: 'throw'` handler |
| `cosmos.loader_failed` | General loader failure |
| `cosmos.unsupported_format` | JSON5 parsing when neither Bun.JSON5 nor json5 npm available |
| `cosmos.file_not_found` | FileSystemLoader — file not found |
| `cosmos.file_read_failed` | FileSystemLoader — read error |
| `cosmos.http_error` | RemoteLoader — HTTP non-2xx status |
| `cosmos.edge_runtime_unsupported` | FileSystemLoader/Json5Loader — Edge Runtime guard |
| `cosmos.kv_put_unsupported` | EdgeKVLoader — storage has no put() |
| `cosmos.kv_delete_unsupported` | EdgeKVLoader — storage has no delete() |

### SentinelErrorCodes (sentinel.*)

| Code | Usage |
|------|-------|
| `sentinel.guard_not_defined` | AuthManager — guard name not in config |
| `sentinel.guard_driver_unsupported` | AuthManager — driver not session/jwt/token/custom |
| `sentinel.guard_creator_not_found` | AuthManager — custom guard creator not registered |
| `sentinel.provider_not_defined` | AuthManager — provider name not in config |
| `sentinel.provider_not_found` | AuthManager — provider not found for guard |
| `sentinel.provider_driver_unsupported` | AuthManager — provider driver not registered |
| `sentinel.session_repo_not_configured` | SessionGuard — logoutOtherDevices/logoutAllDevices |
| `sentinel.invalid_password` | SessionGuard — logoutOtherDevices password verification |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
