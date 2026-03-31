# Phase 30: Static OpenAPI Generation - Research

**Researched:** 2026-03-31
**Domain:** Static OpenAPI 3.1 generation from Zod schema metadata via CLI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `Router.compile()` is the canonical route inventory for OpenAPI generation because it already preserves `RouteOptions.schema` on compiled route records.
- **D-02:** `Route.schema()` remains the registration-time API for attaching Zod schemas; no alternate metadata source is introduced.
- **D-03:** `gravito openapi:generate` remains a build-time CLI command that writes `openapi.json` to the requested output path.
- **D-04:** Routes without schemas are still emitted into the spec with empty request/response bodies instead of being omitted.
- **D-05:** Schema extraction or file generation failures must exit non-zero so CI can gate on them.
- **D-06:** The current `zod-to-json-schema` conversion path is the baseline. A research spike may validate `ts-json-schema-generator` against a real Satellite contract file before any swap is made.
- **D-07:** If conversion is incomplete for a given schema shape, the generator should fail clearly rather than silently dropping the route.

### Claude's Discretion
- Exact OpenAPI component naming and metadata enrichment
- Whether to preserve or normalize operation IDs beyond existing route names
- Error wording for schema extraction failures, as long as the command exits non-zero

### Deferred Ideas (OUT OF SCOPE)
- Runtime `/openapi.json` endpoint and Swagger UI remain future requirements outside this phase
- Application-level dependency graph visualization is deferred to Phase 31
- Any deeper contract DSL beyond Zod is out of scope for this phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DX-01 | Route registration retains Zod input/output schemas as metadata accessible to downstream consumers (OpenAPI generator, documentation tools) | `Router.compile()` already returns `schema` from `RouteOptions`. `Route.schema()` merges successive attachments. Both router-schema.test.ts tests pass. The metadata pipeline is complete and working. |
| DX-02 | Developer can generate static OpenAPI 3.1 spec via `gravito openapi:generate` CLI command, emitting `openapi.json` as build-time artifact | CLI command registered at `packages/cli/src/index.ts` line 954. Generator at `packages/cli/src/commands/openapiGenerate.ts` already writes valid OpenAPI 3.1 structure. Test passes. Critical bug: Zod v4 conversion is silently broken — must migrate to `z.toJSONSchema()`. |
</phase_requirements>

---

## Summary

Phase 30 is primarily a hardening phase: the structural scaffolding (route metadata, CLI command, generator, tests) already exists and test suites pass. However, a critical silent correctness bug invalidates the current schema conversion: `zod-to-json-schema@3.25.2` returns `{}` for all schemas when paired with Zod v4. The existing code falls through to a manual extraction path that forces every property type to `string`, producing structurally valid but semantically wrong output (a `number` field appears as `string` in the spec).

The fix is simple and confirmed working: replace `zodToJsonSchema()` with Zod v4's built-in `z.toJSONSchema()`, which correctly converts all primitive and object types including formats, patterns, and optional markers. This method is first-party, requires no new dependency, and produces valid JSON Schema Draft 2020-12 compatible with OpenAPI 3.1.

The research spike for `ts-json-schema-generator` is **not recommended**: that tool operates on TypeScript source files, not Zod runtime values, and is irrelevant to the Zod-based schema pipeline in Gravito. The correct alternative to evaluate was `@asteasolutions/zod-to-openapi` (supports Zod v4), but `z.toJSONSchema()` native is strictly superior given no dependency overhead.

**Primary recommendation:** Migrate `openapiGenerate.ts` to use `z.toJSONSchema()` from Zod v4, remove the `zod-to-json-schema` dependency, harden error path to throw on extraction failure (D-07), and expand test coverage to cover schema correctness beyond the single existing happy-path test.

---

## Current State Assessment

### What Already Exists (Verified by Running Tests)

| Component | File | Status | Test Coverage |
|-----------|------|--------|---------------|
| Schema metadata attachment | `packages/core/src/Route.ts` — `Route.schema()` | Working, 2 tests pass | `router-schema.test.ts` |
| Route compile with schema | `packages/core/src/Router.ts` — `Router.compile()` | Working, schema preserved | `router-schema.test.ts` |
| CLI command registration | `packages/cli/src/index.ts` line 954 | Working | None (CLI entry) |
| Generator implementation | `packages/cli/src/commands/openapiGenerate.ts` | Working structure, **broken conversion** | `openapi-generate.test.ts` (1 test, passes) |
| Generator test | `packages/cli/tests/openapi-generate.test.ts` | Passes, **does not catch type bug** | 5 assertions |

### The Critical Bug

```typescript
// packages/cli/src/commands/openapiGenerate.ts
import { zodToJsonSchema } from 'zod-to-json-schema'

function convertToOpenApi(schema: any): any {
  try {
    const result = zodToJsonSchema(schema, { target: 'openApi3' })
    // With Zod v4: result is always {} — this condition always fails
    if (Object.keys(result).length > 0 && !('$schema' in result && ...)) {
      return result
    }

    // Fallback: manually extract shape but forces ALL types to { type: 'string' }
    // Bug: z.object({ count: z.number() }) → { type: 'object', properties: { count: { type: 'string' } } }
    if (schema && typeof schema === 'object' && '_def' in schema) {
      const shape = typeof schema._def.shape === 'function' ? schema._def.shape() : schema._def.shape
      if (shape) {
        const properties: any = {}
        for (const [key, _value] of Object.entries(shape)) {
          properties[key] = { type: 'string' }  // WRONG: always string
        }
        return { type: 'object', properties, required }
      }
    }
  }
}
```

The existing test only validates a `z.string()` parameter (id), which happens to be correct under the fallback path, masking the bug entirely.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | 4.3.6 (already installed) | Schema runtime + `z.toJSONSchema()` | Zod v4 ships native JSON Schema conversion — no external dependency needed |
| `cac` | ^6.7.14 (already installed) | CLI argument parsing for `openapi:generate` command | Already the CLI framework for `@gravito/pulse` |

### Remove
| Library | Current Version | Action | Reason |
|---------|----------------|--------|--------|
| `zod-to-json-schema` | 3.25.2 | Remove from `packages/cli/package.json` after migration | Incompatible with Zod v4 (returns `{}`), project deprecated by maintainer in Nov 2025 |

### Alternatives Considered and Rejected

| Considered | Verdict | Reason |
|------------|---------|--------|
| `@asteasolutions/zod-to-openapi` 8.5.0 | Rejected | Adds external dep for functionality Zod v4 provides natively; designed for operation-first OpenAPI which adds complexity beyond scope |
| `ts-json-schema-generator` 2.9.0 | Rejected (D-06 spike resolved) | Operates on TypeScript source files, not runtime Zod values; irrelevant to Gravito's runtime schema pipeline; requires tsconfig path scanning |
| `zod-openapi` 5.4.6 | Rejected | Replaces Zod entirely with `openapi()` wrapper — too invasive for a hardening phase |

### Installation Change

```bash
# Remove old dependency
bun remove zod-to-json-schema --cwd packages/cli

# No new deps needed — z.toJSONSchema() is built into Zod v4
```

**Version verification:** `zod` 4.3.6 (installed, `bun pm ls 2>/dev/null | grep zod`). `z.toJSONSchema()` confirmed working in live test above.

---

## Architecture Patterns

### Recommended Project Structure (No Change)

The existing structure is correct. Phase 30 modifies existing files only:

```
packages/
├── core/src/
│   ├── Route.ts              # Route.schema() — no change needed
│   └── Router.ts             # Router.compile() — no change needed
├── core/tests/
│   └── router-schema.test.ts # Add schema correctness tests (currently 2 tests)
└── cli/
    ├── src/commands/
    │   └── openapiGenerate.ts # Main change: migrate to z.toJSONSchema()
    ├── src/index.ts           # openapi:generate command — already registered
    └── tests/
        └── openapi-generate.test.ts # Add: error path tests, type correctness tests
```

### Pattern 1: Zod v4 Native Schema Conversion

**What:** Use `z.toJSONSchema()` to convert any Zod schema to JSON Schema 2020-12
**When to use:** Whenever a Zod schema needs to be serialized to JSON Schema for OpenAPI embedding

```typescript
// Source: Verified against Zod 4.3.6 in project

import { z } from 'zod'

/**
 * Convert a Zod schema to a JSON Schema object suitable for OpenAPI 3.1 embedding.
 * Returns {} if the schema is not a valid Zod schema.
 */
function zodToOpenApiSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || !('_def' in schema)) {
    return {}
  }
  try {
    const result = z.toJSONSchema(schema as z.ZodType)
    // Remove top-level $schema — OpenAPI 3.1 embeds schemas inline, not as standalone docs
    const { $schema, ...rest } = result as Record<string, unknown>
    return rest
  } catch {
    // D-07: Do NOT silently return {} on error — let caller handle
    throw new Error(`Failed to convert Zod schema to JSON Schema: ${String(schema)}`)
  }
}
```

### Pattern 2: Error-Fast on Extraction Failure (D-07)

**What:** Throw CliError with non-zero exit code when schema conversion fails — never silently drop
**When to use:** Wrapping `zodToOpenApiSchema()` calls in the generator loop

```typescript
// In openapiGenerate.ts — generator loop

for (const route of compiledRoutes) {
  if (route.schema?.body) {
    try {
      const bodySchema = zodToOpenApiSchema(route.schema.body)
      operation.requestBody = {
        content: { 'application/json': { schema: bodySchema } }
      }
    } catch (err) {
      // D-07: fail fast, non-zero exit
      throw new CliError(500, CliErrorCodes.SCHEMA_CONVERSION_FAILED, {
        message: `Route ${route.method} ${route.path}: body schema conversion failed — ${String(err)}`,
      })
    }
  }
}
```

### Pattern 3: Reliable Path Parameter Normalization

**What:** Convert Gravito `:param` syntax to OpenAPI `{param}` syntax
**When to use:** For every route path in the spec

```typescript
// Already in openapiGenerate.ts — confirmed correct
const openApiPath = routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
```

### Anti-Patterns to Avoid

- **Silent fallback on conversion error:** Never return `{}` when `z.toJSONSchema()` throws — this hides real contract bugs from CI. Throw and let the process exit non-zero (D-07).
- **Calling `zodToJsonSchema()` from `zod-to-json-schema` with Zod v4:** Always returns `{}`. The library is abandoned as of Nov 2025.
- **Retaining `zod-to-json-schema` as a fallback:** The fallback path forces all property types to `string`, producing a spec that lies about the API contract.
- **Accessing `_def.shape` directly:** Brittle against Zod internal API changes. Use `z.toJSONSchema()` which is a public API.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zod → JSON Schema conversion | Custom `_def` walker that inspects `typeName`, `checks`, etc. | `z.toJSONSchema()` from Zod v4 | Zod internals change between minor versions; hand-rolled walkers miss discriminated unions, branded types, transforms, refinements |
| Path param syntax conversion | Complex regex alternatives | `.replace(/:([A-Za-z0-9_]+)/g, '{$1}')` (already in code) | Simple and correct for standard URL patterns |
| Directory creation before write | Manual `mkdir` + error handling | `fs.mkdir(dir, { recursive: true })` (already in code) | Already handles race conditions and nested paths |

**Key insight:** The only custom code needed is the glue between `Router.compile()` output and the OpenAPI spec structure. Everything else (schema conversion, file I/O) has first-party or stdlib solutions.

---

## Common Pitfalls

### Pitfall 1: Zod v4 + zod-to-json-schema Returns Empty Object

**What goes wrong:** `zodToJsonSchema(schema, { target: 'openApi3' })` returns `{}` for all Zod v4 schemas. The generator appears to work (no crash), but every schema-decorated route produces empty request/response bodies.
**Why it happens:** `zod-to-json-schema` 3.25.x was updated to accept Zod v4 as a peer dep but does not support Zod v4's internals (export `ZodFirstPartyTypeKind` was restructured). The maintainer deprecated the library in November 2025.
**How to avoid:** Remove `zod-to-json-schema` from `packages/cli/package.json`. Use `z.toJSONSchema()` from Zod v4.
**Warning signs:** Test passes but generated `openapi.json` shows `requestBody: { content: { 'application/json': { schema: {} } } }`.

### Pitfall 2: Existing Test Only Validates String Fields

**What goes wrong:** The single test in `openapi-generate.test.ts` uses only `z.object({ id: z.string() })` and `z.object({ name: z.string() })` — both string fields. The fallback path (which forces all types to `string`) passes these tests, creating a false green state.
**Why it happens:** Tests were written to match behavior of a specific schema shape, not the full type system.
**How to avoid:** Add tests with mixed types: `z.number()`, `z.boolean()`, `z.array()`, optional fields. Verify the generated schema has `type: 'number'` not `type: 'string'` for numeric properties.
**Warning signs:** Tests green but spec incorrect when using non-string field types.

### Pitfall 3: `$schema` Header in Inline JSON Schema

**What goes wrong:** `z.toJSONSchema()` includes `"$schema": "https://json-schema.org/draft/2020-12/schema"` in the top-level result. When embedded inline in OpenAPI path schemas, this extra key is harmless but clutters the output and may confuse some validators.
**How to avoid:** Destructure it out: `const { $schema, ...rest } = z.toJSONSchema(schema)`. Use `rest`.

### Pitfall 4: Silent Exit 0 on Partial Failure

**What goes wrong:** The current `try/catch` in `convertToOpenApi()` returns `{}` on any error — the generator finishes successfully even when schema conversion fails. CI sees exit 0, spec is silently wrong.
**Why it happens:** Defensive catch-all swallows errors.
**How to avoid:** D-07 mandates fail-fast behavior. Throw `CliError` on conversion failure. The outer `catch` in `openapiGenerate()` already calls `process.exit(1)`.

### Pitfall 5: `additionalProperties: false` in OpenAPI Inline Schemas

**What goes wrong:** `z.toJSONSchema()` includes `"additionalProperties": false` by default for `z.object()`. This is valid JSON Schema but may be overly strict in OpenAPI specs for some consumers (OpenAPI 3.1 interprets it correctly, but 3.0 processors may differ).
**How to avoid:** For Phase 30 scope, leave `additionalProperties: false` as-is — it is semantically correct for Zod's strict object default. Flag as documentation note.

---

## Code Examples

Verified patterns from live testing in this project:

### Zod v4 toJSONSchema for OpenAPI Embedding

```typescript
// Source: verified against zod@4.3.6 in gravito-core monorepo

import { z } from 'zod'

// Full schema shapes produce correct types
const bodySchema = z.object({
  title: z.string(),
  count: z.number(),
  active: z.boolean().optional(),
})

const { $schema, ...jsonSchema } = z.toJSONSchema(bodySchema) as any
// Result:
// {
//   "type": "object",
//   "properties": {
//     "title": { "type": "string" },
//     "count": { "type": "number" },    // correctly number, not string
//     "active": { "type": "boolean" }
//   },
//   "required": ["title", "count"],    // active is optional, not in required
//   "additionalProperties": false
// }
```

### Route Schema Metadata Retrieval

```typescript
// Source: packages/core/src/Router.ts Router.compile()

const core = new PlanetCore()
core.router.post('/articles', handler)
  .name('articles.store')
  .schema({
    body: z.object({ title: z.string(), content: z.string() }),
    response: z.object({ id: z.number(), title: z.string() }),
  })

const routes = core.router.compile()
const route = routes.find(r => r.path === '/articles')
// route.schema.body  — Zod schema instance
// route.schema.response — Zod schema instance
// route.name — 'articles.store'
// route.method — 'POST'
```

### Migrated convertToOpenApi Function

```typescript
// Replacement for the broken convertToOpenApi in openapiGenerate.ts

import { z } from 'zod'

function convertToOpenApi(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || !('_def' in schema)) {
    return {}
  }
  try {
    const { $schema, ...rest } = z.toJSONSchema(schema as z.ZodType) as Record<string, unknown>
    if (Object.keys(rest).length === 0) {
      throw new Error('z.toJSONSchema returned empty result')
    }
    return rest
  } catch (err) {
    throw new Error(`Zod schema conversion failed: ${String(err)}`)
  }
}
```

---

## Research Spike: ts-json-schema-generator (D-06 Resolution)

The CONTEXT.md (D-06) requested a spike to validate `ts-json-schema-generator` programmatic API against a real Satellite contract file before any swap.

**Verdict: ts-json-schema-generator is NOT applicable to this phase.**

Reason: `ts-json-schema-generator` works by parsing TypeScript source files at build time via the TypeScript compiler API. It generates JSON Schema from TypeScript interface types and classes. Gravito's schema pipeline uses Zod schema instances at runtime — the schemas are not TypeScript interfaces, they are runtime values created by `z.object({...})`. There is no `.ts` file containing a TypeScript interface definition to point `ts-json-schema-generator` at; the schema lives in memory at `route.schema.body` etc.

The research spike question was a hedge against `zod-to-json-schema` not supporting Zod v4. Since `z.toJSONSchema()` native is available and verified working, no external generator is needed. The D-06 baseline (`zod-to-json-schema`) should be replaced by `z.toJSONSchema()` natively.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `zod-to-json-schema` (external library) | `z.toJSONSchema()` (Zod v4 built-in) | Zod v4.0.0 release (~2025-Q4) | Eliminates external dependency, removes maintenance burden |
| `zodToJsonSchema(schema, { target: 'openApi3' })` | `z.toJSONSchema(schema)` | Now | Correct output for all Zod type shapes, not just ZodString |

**Deprecated/outdated:**
- `zod-to-json-schema`: Maintainer deprecated Nov 2025, incompatible with Zod v4. Remove from `packages/cli/package.json`.
- Manual `_def.shape` walker: Brittle against Zod internals. Remove the fallback entirely.

---

## Open Questions

1. **Should `additionalProperties: false` be stripped from inline OpenAPI schemas?**
   - What we know: Zod v4 includes it by default. OpenAPI 3.1 supports JSON Schema 2020-12 natively so it's valid.
   - What's unclear: Whether downstream spec consumers (Swagger UI, Redoc, contract testing tools) choke on it.
   - Recommendation: Leave as-is for Phase 30 — correct semantics, no evidence of consumer problems. Track as follow-up if users report issues.

2. **Should `openapi:generate` support a `--title` and `--version` flag for the info object?**
   - What we know: Current hardcodes `title: 'Gravito API'` and `version: '1.0.0'`.
   - Recommendation: Discretion area per CONTEXT.md. Add `--title` and `--version` options with sensible defaults. Low effort, high DX value.

---

## Environment Availability

Step 2.6: No external dependencies beyond the monorepo's existing tools. `z.toJSONSchema()` is built into the already-installed `zod@4.3.6`. No new npm packages needed after removing `zod-to-json-schema`.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `zod` (`z.toJSONSchema`) | Schema conversion | ✓ | 4.3.6 | — |
| `node:fs/promises` | File I/O | ✓ | stdlib | — |
| `node:path` | Path resolution | ✓ | stdlib | — |
| `cac` | CLI argument parsing | ✓ | ^6.7.14 (installed) | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in Bun test runner) |
| Config file | none — bun test discovers `tests/` automatically |
| Quick run command | `bun test packages/cli/tests/openapi-generate.test.ts packages/core/tests/router-schema.test.ts --timeout=10000` |
| Full suite command | `bun test packages/cli/tests/ packages/core/tests/ --timeout=15000` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DX-01 | `Router.compile()` preserves Zod schema on route record | unit | `bun test packages/core/tests/router-schema.test.ts` | ✅ (2 tests) |
| DX-01 | `Route.schema()` merges successive schema calls | unit | `bun test packages/core/tests/router-schema.test.ts` | ✅ |
| DX-01 | Schema accessible without booting a server | unit | `bun test packages/core/tests/router-schema.test.ts` | ✅ (PlanetCore instantiated, no serve called) |
| DX-02 | `openapiGenerate()` writes valid OpenAPI 3.1 JSON | integration | `bun test packages/cli/tests/openapi-generate.test.ts` | ✅ (1 test, needs expansion) |
| DX-02 | Routes with Zod schemas produce correct type annotations | integration | `bun test packages/cli/tests/openapi-generate.test.ts` | ❌ Wave 0 — add number/boolean type assertions |
| DX-02 | Routes without schemas produce empty bodies, not omission | integration | `bun test packages/cli/tests/openapi-generate.test.ts` | ❌ Wave 0 |
| DX-02 | Schema extraction failure exits non-zero | integration | `bun test packages/cli/tests/openapi-generate.test.ts` | ❌ Wave 0 |
| DX-02 | CLI exits 0 on success | smoke | `bun test packages/cli/tests/openapi-generate.test.ts` | ✅ (implicit in current test) |

### Sampling Rate
- **Per task commit:** `bun test packages/core/tests/router-schema.test.ts packages/cli/tests/openapi-generate.test.ts --timeout=10000`
- **Per wave merge:** `bun test packages/cli/tests/ packages/core/tests/ --timeout=15000`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/cli/tests/openapi-generate.test.ts` — expand with: (a) routes without schemas still in output, (b) number/boolean field type assertions, (c) schema extraction failure throws and exits non-zero
- [ ] `packages/core/tests/router-schema.test.ts` — currently 2 tests — verify body/params/query/response all preserved independently (add test for unnamed route schema access)

*(Existing test files exist — only new test cases need to be added, not new files)*

---

## Project Constraints (from CLAUDE.md)

| Constraint | Application to Phase 30 |
|-----------|-------------------------|
| TypeScript strict mode — `noUnusedLocals`, `noUnusedParameters` | Remove `_value` unused variable from the `for...of` loop in `convertToOpenApi` fallback when deleting it |
| No `@ts-ignore` without comment | Not needed for this phase |
| Satellite isolation — no direct cross-satellite imports | Not applicable (generator is CLI tooling, not Satellite code) |
| No circular dependencies | CLI depends on core; no new dep edges introduced |
| Code style: 100 chars, 2-space indent, single quotes, no semicolons, ES5 trailing comma | Apply to all edits in `openapiGenerate.ts` |
| Commit messages in English | Use `feat: [cli] migrate OpenAPI schema conversion to z.toJSONSchema()` pattern |
| Target test coverage 75%+ | Existing CLI test coverage unknown — expanding test cases improves coverage toward target |
| All Bun API via adapter-bun.ts only | Not applicable — no Bun.xxx calls in OpenAPI generator |
| Immutability — no mutation | `spec` object is built by assignment, not mutation of shared state. Acceptable (local construction pattern). |

---

## Sources

### Primary (HIGH confidence)
- `packages/core/src/Route.ts` — `Route.schema()` implementation, confirmed working
- `packages/core/src/Router.ts` — `Router.compile()` schema preservation, confirmed working
- `packages/cli/src/commands/openapiGenerate.ts` — current generator, bug confirmed via live execution
- `packages/cli/tests/openapi-generate.test.ts` — existing test, confirmed passes (1 test)
- `packages/core/tests/router-schema.test.ts` — existing tests, confirmed passes (2 tests)
- Live execution: `bun test packages/cli/tests/openapi-generate.test.ts` — 1 pass, 5 assertions
- Live execution: `bun test packages/core/tests/router-schema.test.ts` — 2 pass, 6 assertions
- Live execution: `z.toJSONSchema(z.object({...}))` — verified correct output including `number`, optional fields

### Secondary (MEDIUM confidence)
- [zod-to-json-schema npm page](https://www.npmjs.com/package/zod-to-json-schema) — deprecation noted Nov 2025
- [zod-to-json-schema incompatibility with Zod v4 (GitHub issue)](https://github.com/vercel/ai/issues/7189) — confirms `ZodFirstPartyTypeKind` export break
- `npm view zod-to-json-schema peerDependencies` — `{ zod: '^3.25.28 || ^4' }` (declares Zod v4 compat but does not deliver it)
- `npm view @asteasolutions/zod-to-openapi version` — 8.5.0, Zod v4 peer dep (verified)

### Tertiary (LOW confidence)
- None — all findings verified against codebase or live execution

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via live `bun test` and `npm view`
- Architecture: HIGH — reading existing source files, not speculation
- Pitfalls: HIGH — bugs confirmed by live execution, not inference
- Bug root cause: HIGH — reproduced with minimal script, confirmed fix works

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable ecosystem — Zod v4 API is stable, Bun test runner stable)
