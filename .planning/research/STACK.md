# Stack Research

**Domain:** TypeScript Framework — v2.2.0 Performance Bypass, DX Agility, Bun-Native Integration
**Researched:** 2026-03-30
**Confidence:** HIGH (Bun built-in APIs verified via official docs); MEDIUM (ts-json-schema-generator version pin via npm search)

---

## Scope

This research covers ONLY the new capabilities needed for v2.2.0. The validated stack from
v2.1.0 (Bun runtime, Biome, Turbo, Zod 4, cockatiel, bun-types, mitata, publint, TypeDoc)
is unchanged and not re-researched.

---

## New Capability 1: Fast-Path Routing Bypass

### What is needed

High-frequency routes (health checks, metrics endpoints, static content) need to bypass the full
`BunNativeAdapter.fetch()` pipeline — context pool acquisition, middleware chain compilation,
`executeChain()` async dispatch — and call a raw `(req: Request) => Response` handler directly
inside `Bun.serve.fetch`.

### Stack decision: Zero new dependencies

The Fast-Path mechanism is a **pure internal addition** to `@gravito/core`.

**Rationale:**
- `BunNativeAdapter` already holds the `RadixRouter` reference.
- A parallel `Map<string, (req: Request) => Response | Promise<Response>>` for fast-path registrations costs ~50 LOC.
- The Map lookup at the top of `fetch()` — before `acquireContext()` — is O(1) and eliminates the context pool overhead entirely for registered paths.
- Bun.serve's `static` property only handles pre-computed `Response` objects, not dynamic handlers — not applicable to parametric or async fast-paths.
- ElysiaJS uses JIT compilation via `Function.toString()` (Sucrose component) to achieve similar per-route optimization. That approach adds runtime reflection complexity inappropriate for a compiled TypeScript framework. Gravito's variant is simpler: opt-in registration, no code generation.

**Proposed API surface (no new deps):**

```typescript
// packages/core/src/adapters/bun/BunNativeAdapter.ts
adapter.fastRoute('GET', '/health', (_req) => new Response('ok'))
adapter.fastRoute('GET', '/metrics', async (_req) => new Response(await collectMetrics()))
```

`BunNativeAdapter.fetch()` checks the fast-path Map before acquiring context:

```typescript
const fastKey = `${request.method}:${url.pathname}`
const fastHandler = this.fastRouteMap.get(fastKey)
if (fastHandler) return fastHandler(request)
```

**Integration location:** `packages/core/src/adapters/bun/BunNativeAdapter.ts` only.
New exported type `FastRouteHandler = (req: Request) => Response | Promise<Response>` in
`packages/core/src/http/types.ts`.

**Confidence:** HIGH — zero external dependencies; pure internal design.

---

## New Capability 2: Static OpenAPI Generation from TypeScript Interfaces

### What is needed

A build-time tool that reads TypeScript `interface` / `type` definitions from Satellite
contract files and emits an OpenAPI 3.x YAML/JSON document. Must work programmatically
(invoked from a Gravito CLI/build script), not only as a CLI invocation.

### Recommended: ts-json-schema-generator

| Property | Value |
|----------|-------|
| Package | `ts-json-schema-generator` |
| Version | `^2.9.0` |
| License | MIT |
| Peer dep | TypeScript `^5.x` (TS 5.9.3 already in devDeps) |
| Programmatic API | Yes — `createGenerator(config).createSchema(type)` |
| Output | JSON Schema 7 (compatible with OpenAPI 3.1 `components/schemas`) |

**Why ts-json-schema-generator over alternatives:**

| Tool | Status | Why Not |
|------|--------|---------|
| `typescript-json-schema` (YousefED) | Maintenance mode | Deprecated; its own README recommends tsjsg |
| `@asteasolutions/zod-to-openapi` | Active | Requires all types expressed as Zod schemas first; Satellite contracts use plain TS interfaces |
| `zod-openapi` (samchungy) | Active | Same Zod-first constraint |
| `tsoa` | Active | Requires decorator annotations on controllers; Gravito uses decorator-free design |
| TypeScript Compiler API (manual) | — | 500+ LOC to reimplement what tsjsg already provides |

**Programmatic usage pattern:**

```typescript
import { createGenerator } from 'ts-json-schema-generator'

const generator = createGenerator({
  path: 'packages/*/src/contracts/**/*.ts',
  type: '*',
  tsconfig: 'tsconfig.json',
})
// Returns JSON Schema object for the named type
const schema = generator.createSchema('CreateOrderRequest')
```

**JSON Schema to OpenAPI bridge:**
OpenAPI 3.1 adopted JSON Schema as its type system. The root definitions from
`ts-json-schema-generator` map directly to `components/schemas`. A lightweight
hand-written mapper (~100 LOC) converts the `$defs` block to OpenAPI paths/operations.
No additional library is needed for this transformation.

**Install scope:** `devDependencies` only — in the new `@gravito/openapi-gen` package
(or `packages/forge` if tooling consolidation is preferred). Not a runtime dependency.

**Confidence:** MEDIUM — version 2.9.0 confirmed via npm search (19 days ago at research
time); programmatic API confirmed via GitHub README review. TypeScript 5.x peer dep
confirmed via project test matrix (uses TS 5.x internally).

---

## New Capability 3: Lite Satellite / Inline Plugin System

### What is needed

Allow `gravito.config.ts` to declare anonymous, lightweight "satellites" without creating a
full `packages/` directory. These are functional callbacks that receive the framework core
and register routes/services inline, similar to Elysia's inline plugin pattern.

### Stack decision: Zero new dependencies

The Lite Satellite pattern maps directly to the existing `ServiceProvider` / `GravitoOrbit`
extension points already in `@gravito/core`.

**Proposed `InlinePlugin` type (no new deps):**

```typescript
// New export in packages/core/src/PlanetCore.ts
export type InlinePlugin = (core: PlanetCore) => void | Promise<void>

// Usage in gravito.config.ts
export default defineConfig({
  plugins: [
    async (core) => {
      const router = core.make('router')
      router.get('/ping', (ctx) => ctx.json({ pong: true }))
    }
  ]
})
```

**Implementation:**
`GravitoServer.create()` processes `config.plugins` array after orbit installation,
calling each `InlinePlugin` with the `PlanetCore` instance. This is a 10-line addition to
`GravitoServer.ts`.

**Pattern reference (ElysiaJS inline plugin):**
Elysia's inline plugin is a function `(app: Elysia) => Elysia` — the inspiration.
Gravito's variant is `(core: PlanetCore) => void | Promise<void>` — simpler because
`PlanetCore` is mutable (orbits register themselves via side effects already).

**What NOT to use:**
Rollup/Vite plugin interfaces are the wrong abstraction level (bundler, not HTTP framework).
No external plugin registry or IoC extension is needed — `PlanetCore` already is the registry.

**Integration location:** `packages/core/src/GravitoServer.ts` (process plugins after orbits)
and `packages/core/src/PlanetCore.ts` (optional `plugin()` method for chaining).
New exported type `InlinePlugin` in `packages/core/src/index.ts`.

**Confidence:** HIGH — zero external dependencies; pure API design over existing primitives.

---

## New Capability 4: Bun-Native API Abstractions

### 4a. File System (Bun.file / Bun.write / Bun.Glob)

**Current state:** `RuntimeAdapter` in `@gravito/core` already covers `readFile`, `writeFile`,
`appendFile`, `exists`, `stat`, `deleteFile`, `mkdir` (node:fs/promises fallback), `readDir`
(node:fs/promises fallback).

**Gap:** `Bun.Glob` scan is not yet exposed through `RuntimeAdapter`. All directory-walk
operations fall back to `node:fs/promises` even when Bun is available.

**Recommendation:** Add `glob(pattern: string, options?: { cwd?: string }): AsyncIterable<string>`
to the `RuntimeAdapter` interface. Bun implementation: `new Bun.Glob(pattern).scan({ cwd })`.
Node fallback: `node:fs/promises` `readdir` with manual filtering.

**Bun.file / Bun.write key facts (verified from official docs):**
- `Bun.file(path)` returns a lazy `BunFile`; no disk I/O until `.text()`, `.json()`, `.arrayBuffer()`, or `.stream()` is called.
- `Bun.write(destination, data)` uses `copy_file_range` (Linux) / `clonefile` (macOS) for maximum throughput.
- Both already used in `adapter-bun.ts` — no change needed.
- `Bun.Glob` provides `scan()` (async iterator) and `scanSync()` (sync iterator) — these are the missing piece.

**Stack decision:** Zero new dependencies. `Bun.Glob` is built into Bun.

### 4b. Crypto (Bun.CryptoHasher)

**Current state:** No `RuntimeCryptoAdapter` exists. Callers use `node:crypto` directly or
Web Crypto API (`globalThis.crypto.subtle`), bypassing the runtime abstraction layer.

**Gap:** Cache key generation, request signing, HMAC verification — all scattered.

**Recommended addition:** New `RuntimeCryptoAdapter` interface in `packages/core/src/runtime/`:

```typescript
export interface RuntimeCryptoAdapter {
  hash(algorithm: string, data: string | Uint8Array, encoding?: 'hex' | 'base64'): string
  hmac(algorithm: string, key: string | Uint8Array, data: string | Uint8Array, encoding?: 'hex' | 'base64'): string
  randomUUID(): string
  randomBytes(size: number): Uint8Array
}
```

**Bun.CryptoHasher supported algorithms** (verified from official Bun docs, 2026-02-26):
General: `blake2b256`, `blake2b512`, `md4`, `md5`, `ripemd160`, `sha1`, `sha224`, `sha256`,
`sha384`, `sha512`, `sha512-224`, `sha512-256`, `sha3-224`, `sha3-256`, `sha3-384`, `sha3-512`,
`shake128`, `shake256`

HMAC-capable subset: `blake2b512`, `md5`, `sha1`, `sha224`, `sha256`, `sha384`, `sha512-224`,
`sha512-256`

Bun implementation uses `new Bun.CryptoHasher(algorithm, key?)`.
Node/Deno/unknown fallback uses `node:crypto` `createHash`/`createHmac`.

**Stack decision:** Zero new dependencies. All native to Bun + `node:crypto` fallback.

### 4c. Password (Bun.password — Sentinel auto-detection)

**Current state:** `getPasswordAdapter()` in `@gravito/core` already wraps `Bun.password`.
`HashManager` in `@gravito/sentinel` calls it via `getPasswordAdapter()`.

**Gap:** The detection precedence in `adapter-bun.ts` needs audit to confirm `Bun.password`
is preferred over any Node.js bcrypt library when `typeof Bun !== 'undefined'`. Currently
`HashManager` supports `bcrypt` and `argon2id` via the adapter — the abstraction is correct;
only the auto-detection guard needs verification.

**Bun.password API (verified from official Bun docs):**
- Algorithms: `argon2id` (default), `argon2i`, `argon2d`, `bcrypt`
- `Bun.password.hash(password, options?)` — async
- `Bun.password.hashSync(password, options?)` — sync
- `Bun.password.verify(password, hash)` — auto-detects algorithm from hash encoding
- `Bun.password.verifySync(password, hash)` — sync variant
- Salt is automatic. No separate salt management needed.

**Recommendation:** Audit `adapter-bun.ts` password section. Verify `typeof Bun?.password !== 'undefined'`
guard is in place. No new package needed.

**Stack decision:** Zero new dependencies.

### 4d. Test Utilities (bun:test)

**Current state:** All packages already use `bun:test`. No shared test utilities package exists.

**Gap:** Every package reimplements the same patterns: mock `PlanetCore`, mock `GravitoContext`,
fixture builders, in-memory adapters.

**Recommendation:** Create `packages/testing` with:
- Re-export of `bun:test` (pass-through)
- `createMockCore()` — returns a minimal `PlanetCore` for unit tests
- `createMockContext(method, path)` — returns a minimal `GravitoContext` for handler tests
- `createMockContainer()` — returns a minimal IoC container with test bindings

`bun:test` is built into Bun (no install). The `@gravito/testing` package has zero external
dependencies — pure TypeScript utilities.

**Stack decision:** Zero new dependencies. New internal package only.

---

## New Capability 5: Dependency Tree Visualization

### Recommended: madge (likely already installed)

| Property | Value |
|----------|-------|
| Package | `madge` |
| Version | `^8.0.0` |
| License | MIT |
| Output | JSON, DOT (Graphviz), image (requires Graphviz binary) |
| Programmatic API | Yes |

**Why madge:**
`scripts/generate-dependency-graph.ts` is already referenced in `CLAUDE.md` troubleshooting
under "Circular Dependencies" — madge is almost certainly already a root devDependency.

**Verify before installing:**
```bash
cat package.json | grep madge
```

If already present, no change needed. If absent, add to root `devDependencies`.

**Confidence:** MEDIUM — version from npm page reference; existence in repo inferred from
CLAUDE.md script reference but not directly verified in root `package.json`.

---

## Summary: Net New Dependencies

| Package | Version | Scope | Capability | Confidence |
|---------|---------|-------|-----------|------------|
| `ts-json-schema-generator` | `^2.9.0` | `devDependencies` in `@gravito/openapi-gen` | OpenAPI generation from TS interfaces | MEDIUM |
| `madge` | `^8.0.0` | root `devDependencies` (if not already installed) | Dependency tree visualization | MEDIUM |

**All other capabilities use zero new dependencies.** Fast-Path routing, Lite Satellite,
Bun-native fs/crypto/password, and test utilities are implemented entirely with Bun built-ins
and existing Gravito framework primitives.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tsoa` | Requires decorators on controllers; Gravito is decorator-free | `ts-json-schema-generator` (static TS analysis) |
| `@asteasolutions/zod-to-openapi` | Requires types written as Zod schemas; breaks TS-first Satellite contracts | `ts-json-schema-generator` |
| `zod-openapi` (samchungy) | Same Zod-first constraint | `ts-json-schema-generator` |
| `elysia` | Not replacing Photon; fast-path pattern is borrowed inspiration only | Internal `BunNativeAdapter.fastRoute()` |
| `bcryptjs` or `argon2` (npm) | Bun.password natively provides argon2+bcrypt at C speed | `Bun.password` via existing `getPasswordAdapter()` |
| `node:crypto` direct usage | Bypasses runtime abstraction layer | New `RuntimeCryptoAdapter` via `getRuntimeCryptoAdapter()` |
| `skott` | Less stable API; CLAUDE.md references existing madge scripts | `madge` |
| `openapi-typescript` or `hey-api` | These generate TypeScript from OpenAPI specs (reverse direction); we need OpenAPI from TypeScript | `ts-json-schema-generator` |
| Any OpenTelemetry additions | Out of scope for v2.2.0 | Existing `@gravito/monitor` / observability orbit |

---

## Version Compatibility

| Package | Requires | Notes |
|---------|---------|-------|
| `ts-json-schema-generator ^2.9.0` | TypeScript `^5.x` | TS 5.9.3 already in devDeps — compatible |
| `madge ^8.0.0` | Node 18+ or Bun | Bun-compatible (uses Node APIs) |
| `Bun.CryptoHasher` | Bun 1.0+ | Already target runtime; available since Bun 1.0 |
| `Bun.password` | Bun 1.0+ | Already used via `getPasswordAdapter()` |
| `Bun.Glob` | Bun 1.x | Available in current Bun release |
| `bun:test` | Bun 1.x | Already in use across all packages |

---

## Integration Points Summary

| Capability | File(s) Changed | New File(s) |
|-----------|----------------|-------------|
| Fast-Path | `packages/core/src/adapters/bun/BunNativeAdapter.ts` | None |
| Fast-Path type | `packages/core/src/http/types.ts` | None |
| OpenAPI gen | — | `packages/openapi-gen/src/index.ts` |
| Inline Plugin type | `packages/core/src/PlanetCore.ts`, `packages/core/src/GravitoServer.ts`, `packages/core/src/index.ts` | None |
| RuntimeCryptoAdapter | `packages/core/src/runtime/types.ts` | `packages/core/src/runtime/crypto.ts`, `packages/core/src/runtime/adapter-bun-crypto.ts` |
| Bun.Glob in RuntimeAdapter | `packages/core/src/runtime/types.ts`, `packages/core/src/runtime/adapter-bun.ts` | None |
| Test utilities | — | `packages/testing/src/index.ts` |

---

## Sources

- Bun Hashing docs: https://bun.com/docs/runtime/hashing — HIGH (official, verified 2026-02-26)
- Bun File I/O docs: https://bun.com/docs/runtime/file-io — HIGH (official, verified)
- Bun CryptoHasher reference: https://bun.com/reference/bun/CryptoHasher — HIGH (official)
- Bun.password reference: https://bun.com/reference/bun/password — HIGH (official)
- Bun.Glob reference: https://bun.com/reference/bun/Glob — HIGH (official, via search)
- ts-json-schema-generator GitHub: https://github.com/vega/ts-json-schema-generator — MEDIUM (programmatic API confirmed; version via npm search)
- ts-json-schema-generator npm: https://www.npmjs.com/package/ts-json-schema-generator — MEDIUM (v2.9.0, 19 days prior to research)
- ElysiaJS JIT Compiler (pattern reference only): https://elysiajs.com/internal/jit-compiler — MEDIUM (inspiration, not adopted)
- ElysiaJS inline plugin pattern: https://elysiajs.com/essential/plugin — MEDIUM (pattern reference)
- madge npm: https://www.npmjs.com/package/madge — MEDIUM (version 8 from npm page; prior script reference in CLAUDE.md)

---
*Stack research for: Gravito Core v2.2.0 Framework Evolution*
*Researched: 2026-03-30*
