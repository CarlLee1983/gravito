---
phase: 30-static-openapi-generation
plan: 01
subsystem: cli
tags: [openapi, zod, cli, schema-metadata, testing]
provides:
  - Zod v4 native `z.toJSONSchema()` conversion for OpenAPI generation
  - `gravito openapi:generate` support for `--title` and `--version`
  - Schema conversion failure handling via `SCHEMA_CONVERSION_FAILED`
  - Regression coverage for schema metadata retention and generated schema types
affects:
  - Phase 31 dependency graph tooling readiness
tech-stack:
  added:
    - bun:test
  patterns:
    - Native Zod JSON Schema conversion instead of `zod-to-json-schema`
    - Fail-fast CLI error propagation for schema extraction failures
    - Per-test isolated temp directories for CLI generation tests
key-files:
  created:
    - .planning/phases/30-static-openapi-generation/30-01-SUMMARY.md
  modified:
    - packages/cli/src/commands/openapiGenerate.ts
    - packages/cli/src/errors/codes.ts
    - packages/cli/src/index.ts
    - packages/cli/package.json
    - packages/cli/tests/openapi-generate.test.ts
    - packages/core/tests/router-schema.test.ts
key-decisions:
  - "Use Zod v4's native z.toJSONSchema() as the only conversion path for OpenAPI output."
  - "Fail fast on schema conversion failures with cli.schema_conversion_failed so CI can detect broken contracts."
  - "Keep routes without schemas in generated output with empty bodies instead of omitting them."
  - "Expose OpenAPI title and version as CLI options to keep the generator configurable."
patterns-established:
  - "OpenAPI generator tests must cover mixed field types, optionality, no-schema routes, and failure paths."
  - "Route schema metadata is validated independently from the CLI generator to preserve source-of-truth separation."
duration: "42min"
completed: 2026-03-31
requirements-completed: [DX-01, DX-02]
---

# Phase 30: static-openapi-generation Summary

**Static OpenAPI generation hardened with Zod v4 native schema conversion, fail-fast error handling, and expanded regression coverage.**

## Performance

- **Duration:** 42 min
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments

- Replaced the broken `zod-to-json-schema` path with Zod v4 native `z.toJSONSchema()` conversion.
- Added `SCHEMA_CONVERSION_FAILED` and converted schema extraction failures into fail-fast CLI errors.
- Exposed `--title` and `--version` on `gravito openapi:generate`.
- Expanded coverage for route metadata retention, mixed schema types, no-schema routes, response schemas, and failure behavior.
- Removed `zod-to-json-schema` from the CLI dependency list.

## Verification

- `bun test packages/core/tests/router-schema.test.ts --timeout=10000`
- `bun test packages/cli/tests/openapi-generate.test.ts --timeout=15000`
- `bun run typecheck` in `packages/cli`
- `bun run typecheck` in `packages/core`
- `bun test packages/cli/tests/ --timeout=15000`

## Files Created/Modified

- `packages/cli/src/commands/openapiGenerate.ts` - Zod v4 conversion, fail-fast error handling, and CLI metadata customization.
- `packages/cli/src/errors/codes.ts` - Added `SCHEMA_CONVERSION_FAILED`.
- `packages/cli/src/index.ts` - Registered `--title` and `--version` options for `openapi:generate`.
- `packages/cli/package.json` - Removed `zod-to-json-schema`.
- `packages/cli/tests/openapi-generate.test.ts` - Added mixed-type, empty-schema, response-schema, and failure-path coverage.
- `packages/core/tests/router-schema.test.ts` - Added metadata retention regression tests.

## Decisions & Deviations

The phase followed the planned OpenAPI hardening path and completed the native Zod conversion migration without adding a new schema library.

## Next Phase Readiness

Phase 30 now satisfies DX-01 and DX-02. Phase 31 can proceed with dependency graph tooling and export validation.
