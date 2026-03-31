# Phase 30: Static OpenAPI Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 30-static-openapi-generation
**Areas discussed:** Route metadata source, CLI output contract, schema conversion strategy, failure policy

## Route Metadata Source

| Option | Description | Selected |
|--------|-------------|----------|
| `Router.compile()` metadata | Reuse the existing compiled route inventory that already carries `schema` | ✓ |
| New route registry API | Add a separate metadata store for OpenAPI consumers | |
| Read from adapter internals | Walk the HTTP adapter route table directly | |

**Decision:** Reuse `Router.compile()` metadata.
**Reason:** It is already present, already schema-aware, and avoids duplicating route state.

## CLI Output Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Build-time artifact | `gravito openapi:generate` writes `openapi.json` to disk | ✓ |
| Runtime endpoint | Serve `/openapi.json` from the app at request time | |
| Hybrid | Generate a file and also expose a runtime endpoint | |

**Decision:** Build-time artifact only.
**Reason:** This phase is scoped to static generation and the runtime endpoint is explicitly deferred.

## Schema Conversion Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `zod-to-json-schema` baseline | Preserve the current conversion path and harden it | ✓ |
| Switch to `ts-json-schema-generator` | Use TypeScript contracts as the generation source | |
| Switch to `@asteasolutions/zod-to-openapi` | Adopt an OpenAPI-native Zod workflow | |

**Decision:** Keep the current baseline for now.
**Reason:** The generator already exists; the research spike will validate whether a replacement is justified.

## Failure Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Fail fast | Exit non-zero on extraction/generation errors | ✓ |
| Best effort | Warn and continue with partial output | |
| Silent fallback | Emit a spec even if schemas are missing or malformed | |

**Decision:** Fail fast.
**Reason:** The CLI is intended for CI/build pipelines, so partial output would be misleading.

## Deferred Ideas

- Runtime `/openapi.json` and Swagger UI stay out of this phase.
- Dependency graph generation is tracked for Phase 31.
