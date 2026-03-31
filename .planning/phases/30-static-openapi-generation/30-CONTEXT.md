---
phase: "30"
name: "Static OpenAPI Generation"
created: 2026-03-31
---

# Phase 30: Static OpenAPI Generation — Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Route registrations retain Zod schema metadata and Gravito can generate a static OpenAPI 3.1 artifact at build time via `gravito openapi:generate`.

This phase hardens the existing route schema pipeline and CLI output path. It does not introduce a runtime `/openapi.json` endpoint.

</domain>

<decisions>
## Decisions

### Source of Truth
- **D-01:** `Router.compile()` is the canonical route inventory for OpenAPI generation because it already preserves `RouteOptions.schema` on compiled route records.
- **D-02:** `Route.schema()` remains the registration-time API for attaching Zod schemas; no alternate metadata source is introduced.

### CLI Behavior
- **D-03:** `gravito openapi:generate` remains a build-time CLI command that writes `openapi.json` to the requested output path.
- **D-04:** Routes without schemas are still emitted into the spec with empty request/response bodies instead of being omitted.
- **D-05:** Schema extraction or file generation failures must exit non-zero so CI can gate on them.

### Schema Conversion Strategy
- **D-06:** The current `zod-to-json-schema` conversion path is the baseline. A research spike may validate `ts-json-schema-generator` against a real Satellite contract file before any swap is made.
- **D-07:** If conversion is incomplete for a given schema shape, the generator should fail clearly rather than silently dropping the route.

</decisions>

<discretion>
## Discretion Areas

- Exact OpenAPI component naming and metadata enrichment
- Whether to preserve or normalize operation IDs beyond existing route names
- Error wording for schema extraction failures, as long as the command exits non-zero

</discretion>

<deferred>
## Deferred Ideas

- Runtime `/openapi.json` endpoint and Swagger UI remain future requirements outside this phase
- Application-level dependency graph visualization is deferred to Phase 31
- Any deeper contract DSL beyond Zod is out of scope for this phase

</deferred>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` §DX-01, §DX-02
- `packages/core/src/Route.ts` — `Route.schema()` attachment API
- `packages/core/src/Router.ts` — `Router.compile()` route metadata retention
- `packages/core/tests/router-schema.test.ts` — schema metadata regression coverage
- `packages/cli/src/index.ts` — `openapi:generate` CLI registration
- `packages/cli/src/commands/openapiGenerate.ts` — current generator implementation
- `packages/cli/tests/openapi-generate.test.ts` — build-time generation coverage
- `.planning/research/FEATURES.md` — static OpenAPI research and tradeoff notes

</canonical_refs>

<code_context>
## Existing Code Insights

- `Router.compile()` already returns `schema` alongside `method`, `path`, `name`, and `domain`.
- `Route.schema()` merges successive schema attachments, so route definitions can accumulate body/params/query/response metadata.
- `packages/cli/src/commands/openapiGenerate.ts` already performs build-time spec emission, path parameter normalization, and route inclusion even when `schema` is absent.
- `packages/cli/src/index.ts` already exposes `openapi:generate` and `deps:graph` commands, so Phase 30 is primarily about hardening and validating the OpenAPI path.
- `packages/cli/tests/openapi-generate.test.ts` and `packages/core/tests/router-schema.test.ts` already cover the core happy path and metadata retention.

</code_context>

<specifics>
## Specific Ideas

- Run the requested research spike before the planning phase to validate `ts-json-schema-generator` programmatic usage against a real contract file in the monorepo.
- Keep routes without schemas visible in generated output, but leave their request/response bodies empty rather than synthesizing placeholders.
- Treat the CLI output file as a build artifact: create parent directories as needed and fail fast on extraction errors.

</specifics>

<deferred_ideas>
## Deferred Ideas

- Runtime `/openapi.json` serving
- Swagger UI integration
- Dependency graph tooling for Phase 31

</deferred_ideas>

