---
phase: 30-static-openapi-generation
verified: 2026-03-31T13:00:22+08:00
status: passed
score: 4/4 must-haves verified
---

# Phase 30: static-openapi-generation — Verification

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Zod input/output schema attached at route registration is retrievable as structured metadata from the route registry without booting a server | passed | `Route.ts` exposes `.schema(partial)`; `Router.ts` surfaces `route.schema` on compiled routes; `router-schema.test.ts` passes 5/5 covering body+response, merged multi-call, all four schema types, unnamed routes, and routes without schemas |
| 2 | `gravito openapi:generate` produces `openapi.json` with valid OpenAPI 3.1 structure | passed | `openapiGenerate.ts` uses Zod v4 native `z.toJSONSchema()`; `openapi-generate.test.ts` passes 5/5 covering schema paths, number/boolean/optional field types, and response schema output |
| 3 | Routes without schemas are included with empty request/response bodies, not omitted | passed | `openapi-generate.test.ts` test 3 explicitly verifies the `/plain` route appears in output with no `requestBody` and a normal `200` response |
| 4 | CLI exits with code 0 on success and non-zero on schema extraction failure | passed | `SCHEMA_CONVERSION_FAILED` exists in `codes.ts`; `openapi-generate.test.ts` test 5 verifies a schema conversion failure exits with code 1 |

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/Route.ts` | `.schema()` chain method for attaching Zod schemas | passed | Method merges partial schema objects onto route options |
| `packages/core/src/Router.ts` | `router.compile()` surfaces schema metadata | passed | Compiled route objects include `.schema` |
| `packages/cli/src/commands/openapiGenerate.ts` | CLI command using `z.toJSONSchema()` | passed | Zod v4 native conversion, with `--title` and `--version` support |
| `packages/cli/src/errors/codes.ts` | `SCHEMA_CONVERSION_FAILED` error code | passed | Fail-fast error code for broken schema extraction |
| `packages/core/tests/router-schema.test.ts` | Schema metadata regression tests | passed | 5 tests pass |
| `packages/cli/tests/openapi-generate.test.ts` | CLI generation integration tests | passed | 5 tests pass |

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Route.ts .schema()` | `Router.ts compile()` | Schema property propagation | passed | Schema attached via `.schema()` is readable on compiled route objects |
| `openapiGenerate.ts` | `z.toJSONSchema()` | Zod v4 native API | passed | Direct Zod-to-JSON-Schema conversion without external library |
| `openapiGenerate.ts` | `SCHEMA_CONVERSION_FAILED` | Error code import | passed | Schema conversion failures map to a fail-fast CLI exit |

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| DX-01 | SATISFIED | None |
| DX-02 | SATISFIED | None |

## Result

Passed. Phase 30 delivers Zod schema metadata on route registrations (`DX-01`) and static OpenAPI 3.1 generation via CLI (`DX-02`).

## Evidence

- `bun test packages/core/tests/router-schema.test.ts --timeout=10000` — 5 pass, 0 fail
- `bun test packages/cli/tests/openapi-generate.test.ts --timeout=15000` — 5 pass, 0 fail

