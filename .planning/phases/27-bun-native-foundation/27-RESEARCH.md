# Phase 27: Bun-Native Foundation - Research

**Researched:** 2026-03-30
**Domain:** Bun runtime native APIs, runtime adapter pattern, boot-time capability reporting
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUN-01 | Sentinel HashManager uses `Bun.password` natively on Bun runtime for hash/verify operations (not Node.js bcryptjs shim) | `getPasswordAdapter()` in `packages/core/src/runtime/index.ts` already calls `Bun.password` on Bun — confirmed working in Bun 1.3.10. HashManager calls `getPasswordAdapter()`. Integration test must assert argon2id hash prefix `$argon2id$`. |
| BUN-02 | RuntimeCryptoAdapter uses `Bun.CryptoHasher` for non-password hashing (SHA-256, SHA-512, BLAKE2b) on Bun runtime | `NativeHasher` in `packages/core/src/ffi/NativeHasher.ts` already uses `Bun.CryptoHasher`. SHA-512 and BLAKE2b support confirmed in Bun 1.3.10. Needs a new `RuntimeCryptoAdapter` facade or test asserting `NativeHasher.getStatus().runtime === 'bun-crypto-hasher'`. |
| BUN-03 | NativeOrbitDetector utility allows any Orbit to query available Bun capabilities at boot time via structured API | Does NOT exist yet. New file needed: `packages/core/src/runtime/NativeOrbitDetector.ts`. Returns typed `NativeFeatures` object. All `Bun.xxx` calls must remain inside `adapter-bun.ts`. |
| PERF-03 | Framework logs Bun-native capability report at boot time showing which APIs are active | `PlanetCore.boot()` currently logs nothing about native capabilities. Needs hook in the boot sequence to call `NativeOrbitDetector.detectBunCapabilities()` and log the report. |
</phase_requirements>

---

## Summary

Phase 27 establishes the Bun-native foundation for the v2.2.0 milestone. The work splits into three tracks: (1) confirming that existing Bun.password and Bun.CryptoHasher code paths are actually exercised and covered by integration tests asserting the native code path, (2) creating the new `NativeOrbitDetector` utility that centralises all runtime capability queries, and (3) wiring a boot-time capability report into `PlanetCore.boot()`.

Crucially, the codebase already has partial implementations. `getPasswordAdapter()` in `packages/core/src/runtime/index.ts` already uses `Bun.password` on the Bun runtime — but there is no integration test that asserts the argon2id algorithm is used rather than a Node.js fallback. Similarly, `NativeHasher` already uses `Bun.CryptoHasher` — but SHA-512 and BLAKE2b are not currently in its `HashAccelerator` interface (only `sha256` and `hmacSha256`). Both gaps need new tests or an interface extension.

The `NativeOrbitDetector` class is the only genuinely new abstraction: it does not exist yet, and it is the architectural anchor that allows any Orbit to introspect native capabilities without importing `Bun` directly.

**Primary recommendation:** Create `NativeOrbitDetector` in `packages/core/src/runtime/`, extend `NativeHasher` to cover SHA-512/BLAKE2b, add integration tests for argon2id native path, hook the capability report into `PlanetCore.boot()`, and export all new symbols from `packages/core/src/index.ts`.

---

## Project Constraints (from CLAUDE.md)

### Critical Constraints (must enforce)

- **All Bun.xxx calls must go through `adapter-bun.ts` (or a dedicated guard)** — direct `Bun.xxx` outside `adapter-bun.ts` causes `ReferenceError` in Node CI. `NativeOrbitDetector` must NOT call `Bun.xxx` directly; it must call detection helpers already in `packages/core/src/runtime/detection.ts` or `adapter-bun.ts`.
- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters`, no `@ts-ignore` without comment.
- **No circular dependencies** — pre-push hook enforces this. Adding `NativeOrbitDetector` to `packages/core/src/runtime/` keeps it in the same module, so circular dependency risk is low.
- **Code style** — 100 chars wide, 2-space indent, single quotes, no semicolons, ES5 trailing commas.
- **Commit messages in English** — e.g. `feat: [core] add NativeOrbitDetector and boot capability report`.
- **File size** — 200-400 lines typical, 800 max.
- **Immutability** — no object mutation; `NativeFeatures` must be a readonly object.
- **Test coverage target** — 75%+ for `@gravito/core`, existing tests pass.

---

## Standard Stack

### Core (existing, used directly)

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `Bun.password.hash/verify` | global Bun API | argon2id / bcrypt password hashing | Already wired in `getPasswordAdapter()`, needs integration test |
| `Bun.CryptoHasher` | global Bun API | SHA-256, SHA-512, BLAKE2b non-password hashing | Already in `NativeHasher`, needs SHA-512/BLAKE2b extension |
| `Bun.Glob` | global Bun API | File globbing — used in capability report flag | Confirmed available in Bun 1.3.10 |
| `getRuntimeKind()` | `packages/core/src/runtime/detection.ts` | Runtime detection (bun/node/deno/unknown) | HIGH confidence, already used everywhere |
| `PlanetCore.boot()` | `packages/core/src/PlanetCore.ts` | Framework boot entry point | Boot hook location for capability report |
| `ConsoleLogger` | `packages/core/src/Logger.ts` | `logger.info(message)` — boot report output | Simple interface: `info(msg, ...args)` |

### New (to be created)

| Component | Target Location | Purpose |
|-----------|----------------|---------|
| `NativeOrbitDetector` | `packages/core/src/runtime/NativeOrbitDetector.ts` | Structured Bun capability query — returns `NativeFeatures` |
| `NativeFeatures` (type) | same file or `types.ts` | Typed boolean flags for each Bun API |
| Boot capability log call | `PlanetCore.ts` (boot/constructor) | `logger.info(formatCapabilityReport(features))` |

**Installation:** No new npm packages required. All Bun APIs are built into the runtime.

### Verified Bun API Availability (Bun 1.3.10)

```
Bun.password.hash      ✓ available
Bun.password.verify    ✓ available
Bun.CryptoHasher       ✓ available
  sha256               ✓ supported
  sha512               ✓ supported
  blake2b256           ✓ supported
  blake2b512           ✓ supported
Bun.Glob               ✓ available
Bun.version            ✓ "1.3.10"
```

All checked with `bun -e "..."` against the installed Bun 1.3.10. Confidence: HIGH.

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
packages/core/src/
└── runtime/
    ├── NativeOrbitDetector.ts   # NEW: detectBunCapabilities() → NativeFeatures
    ├── adapter-bun.ts           # MODIFY: add sha512/blake2b to BunCryptoHasher (or leave in NativeHasher)
    ├── detection.ts             # no change needed
    └── index.ts                 # MODIFY: export NativeOrbitDetector, NativeFeatures

packages/core/src/
└── ffi/
    └── NativeHasher.ts          # MODIFY: extend HashAccelerator for sha512/blake2b

packages/core/src/
└── PlanetCore.ts                # MODIFY: call NativeOrbitDetector + logger at boot

packages/core/src/
└── index.ts                     # MODIFY: export NativeOrbitDetector, NativeFeatures

packages/core/tests/
└── runtime-native-detector.test.ts  # NEW: unit tests for NativeOrbitDetector
packages/sentinel/tests/
└── hash-manager-argon2id-native.integration.test.ts  # NEW: integration test asserting argon2id via Bun.password
packages/core/tests/ffi/
└── native-hasher-sha512-blake2b.test.ts  # NEW: tests for sha512/blake2b paths
```

### Pattern 1: NativeOrbitDetector — capability query without direct Bun references

**What:** A static utility class that probes Bun API availability via guarded `typeof Bun !== 'undefined'` checks. Returns a frozen `NativeFeatures` object.

**When to use:** At framework boot (`PlanetCore.boot()`), and by any Orbit at install-time to make routing decisions.

**Key constraint:** All probing must be inside `getRuntimeKind() === 'bun'` guards — never bare `Bun.xxx`. The `typeof Bun !== 'undefined'` check acts as a type narrowing gate.

**Example:**

```typescript
// packages/core/src/runtime/NativeOrbitDetector.ts
// Source: derived from existing detection.ts + NativeHasher.ts patterns

export interface NativeFeatures {
  readonly runtime: 'bun' | 'node' | 'deno' | 'unknown'
  readonly bunVersion: string | null
  readonly password: {
    readonly available: boolean
    readonly argon2id: boolean
    readonly bcrypt: boolean
  }
  readonly cryptoHasher: {
    readonly available: boolean
    readonly sha256: boolean
    readonly sha512: boolean
    readonly blake2b: boolean
  }
  readonly glob: boolean
}

export class NativeOrbitDetector {
  private static cached: NativeFeatures | null = null

  static detectBunCapabilities(): NativeFeatures {
    if (this.cached) return this.cached

    const B = (globalThis as unknown as { Bun?: {
      version: string
      password: { hash: unknown; verify: unknown }
      CryptoHasher: unknown
      Glob: unknown
    } }).Bun

    if (!B) {
      return (this.cached = Object.freeze({
        runtime: getRuntimeKind(),
        bunVersion: null,
        password: { available: false, argon2id: false, bcrypt: false },
        cryptoHasher: { available: false, sha256: false, sha512: false, blake2b: false },
        glob: false,
      }))
    }

    // Probe each API with try/catch so a missing feature doesn't crash detection
    const passwordAvail = typeof B.password?.hash === 'function'
    const cryptoAvail   = typeof B.CryptoHasher === 'function'
    const sha256Ok      = cryptoAvail && probeCryptoHasher(B.CryptoHasher, 'sha256')
    const sha512Ok      = cryptoAvail && probeCryptoHasher(B.CryptoHasher, 'sha512')
    const blake2bOk     = cryptoAvail && probeCryptoHasher(B.CryptoHasher, 'blake2b256')

    return (this.cached = Object.freeze({
      runtime: 'bun' as const,
      bunVersion: B.version,
      password: { available: passwordAvail, argon2id: passwordAvail, bcrypt: passwordAvail },
      cryptoHasher: { available: cryptoAvail, sha256: sha256Ok, sha512: sha512Ok, blake2b: blake2bOk },
      glob: typeof B.Glob === 'function',
    }))
  }

  /** Reset cache — for testing only */
  static reset(): void { this.cached = null }
}
```

### Pattern 2: Boot capability report in PlanetCore

**What:** A single `logger.info(...)` call early in `PlanetCore.boot()` (or `new PlanetCore()` constructor — after logger is initialised but before orbits install).

**Log format:** `[gravito] native: Bun.password argon2id ✓, Bun.CryptoHasher ✓, Bun.Glob ✓` — fallback paths noted for any inactive API.

**Where to hook:** Inside `PlanetCore.boot()` static method, immediately before iterating orbits (line ~809 in current file). This ensures the report is logged once per boot.

**Example:**

```typescript
// packages/core/src/PlanetCore.ts — inside PlanetCore.boot()
// After: const core = new PlanetCore(...)
// Before: if (config.orbits) { ... }

import { NativeOrbitDetector, formatCapabilityReport } from './runtime/NativeOrbitDetector'

// In boot():
const features = NativeOrbitDetector.detectBunCapabilities()
core.logger.info(formatCapabilityReport(features))
```

**Format helper:**

```typescript
export function formatCapabilityReport(f: NativeFeatures): string {
  const items: string[] = [
    `Bun.password argon2id ${f.password.argon2id ? '✓' : '✗ (fallback: none)'}`,
    `Bun.CryptoHasher ${f.cryptoHasher.available ? '✓' : '✗ (fallback: node:crypto)'}`,
    `Bun.Glob ${f.glob ? '✓' : '✗ (fallback: node:fs glob)'}`,
  ]
  return `[gravito] native: ${items.join(', ')}`
}
```

### Pattern 3: Extending NativeHasher for SHA-512 and BLAKE2b

The existing `HashAccelerator` interface only exposes `sha256` and `hmacSha256`. BUN-02 requires `RuntimeCryptoAdapter` to cover SHA-256/SHA-512/BLAKE2b. The cleanest path is:

1. **Extend `HashAccelerator` interface** in `packages/core/src/ffi/types.ts` with `sha512(input): string` and `blake2b(input): string` (BLAKE2b-256 variant).
2. **Implement in `BunCryptoHasher`** inside `NativeHasher.ts`: `new Bun.CryptoHasher('sha512').update(input).digest('hex')` and `new Bun.CryptoHasher('blake2b256').update(input).digest('hex')`.
3. **Implement in `HashFallback`** for Node.js: `createHash('sha512')` — BLAKE2b-256 is NOT in Node.js standard `node:crypto` before Node 21.6+ (use sha3-256 as documented fallback or require `@noble/hashes`).

**BLAKE2b fallback decision:** Node.js `node:crypto` (via OpenSSL) does support `blake2b512` but NOT `blake2b256` in all versions. Safest fallback is `sha256` with a log warning, or `sha3-256`. Check this before planning. The planner should decide fallback strategy.

### Anti-Patterns to Avoid

- **Calling `Bun.xxx` directly in NativeOrbitDetector** — the entire point is to keep bare `Bun` references in `adapter-bun.ts`. Use `(globalThis as any).Bun` with type narrowing.
- **Module-level `Bun.xxx` evaluation** — any `const x = Bun.xxx` at module top-level causes `ReferenceError` in Node CI. Always guard with `typeof Bun !== 'undefined'` or `getRuntimeKind() === 'bun'`.
- **Multiple boot-time log calls** — call `NativeOrbitDetector.detectBunCapabilities()` once at boot; cache the result in the class static.
- **Printing fallback as empty** — the success criteria says "fallback paths noted for any inactive APIs" — must emit something like `✗ (fallback: node:crypto)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime detection | Custom `process.versions` checks | `getRuntimeKind()` already in `detection.ts` | Edge cases for Deno/unknown already handled |
| SHA-256 on Bun | Custom crypto module | `new Bun.CryptoHasher('sha256')` | Already implemented in `NativeHasher` |
| SHA-256 fallback | Custom Node crypto | `HashFallback` in `packages/core/src/ffi/hash-fallback.ts` | Existing, tested implementation |
| Password hashing | bcryptjs npm package | `Bun.password.hash/verify` | Built into Bun, zero npm dependency |
| Frozen object | manual `Object.seal()` | `Object.freeze()` | Standard immutability for config objects |

---

## Common Pitfalls

### Pitfall 1: Bare `Bun.xxx` reference at module top-level
**What goes wrong:** `const hasher = new Bun.CryptoHasher('sha256')` at the top of a file throws `ReferenceError: Bun is not defined` when the package is imported in Node.js test CI.
**Why it happens:** TypeScript/Bun types allow it at compile time, but Node.js doesn't have the global.
**How to avoid:** Always guard: `const B = (globalThis as unknown as { Bun?: ... }).Bun; if (!B) return fallback`.
**Warning signs:** Tests pass with `bun test` but fail in `node --experimental-vm-modules` or when imported by Node-based tools.

### Pitfall 2: BLAKE2b not available in all Node.js `node:crypto` builds
**What goes wrong:** `createHash('blake2b256')` throws `ERR_OSSL_EVP_UNSUPPORTED` on some Node.js builds without the `--legacy-provider` flag.
**Why it happens:** BLAKE2b256 is not universally exposed by OpenSSL in all Node.js distributions.
**How to avoid:** In `HashFallback`, wrap BLAKE2b with a try/catch and fall back to `sha256` with a console.warn, OR use `blake2b512` and slice (not recommended), OR use sha3-256 as a semantically close fallback.
**Warning signs:** Only fails in CI with certain Node versions, works fine locally with Bun.

### Pitfall 3: `passwordAdapter` singleton has no reset function
**What goes wrong:** Integration tests that call `getPasswordAdapter()` cache the adapter. If a test stubs `Bun.password`, the cached adapter ignores the stub.
**Why it happens:** `passwordAdapter` variable is module-level and no `resetPasswordAdapter()` is exported.
**How to avoid:** Add `export function resetPasswordAdapter(): void { passwordAdapter = null }` to `packages/core/src/runtime/index.ts`. Use it in `afterEach` in integration tests.
**Warning signs:** Tests pass in isolation, fail when run together.

### Pitfall 4: Boot capability report emitted before logger is initialized
**What goes wrong:** Calling `NativeOrbitDetector.detectBunCapabilities()` at `new PlanetCore()` constructor runs before the user-provided logger is wired, so output goes to `ConsoleLogger` even when a custom logger is specified.
**Why it happens:** PlanetCore constructor initializes logger from config, but boot() creates the instance first then calls boot logic.
**How to avoid:** Put the capability report call inside `PlanetCore.boot()` AFTER `new PlanetCore(config)` — not inside the constructor. The static `boot()` method at line 800 is the correct hook point.
**Warning signs:** Custom logger in tests doesn't capture the native capability log line.

### Pitfall 5: `NativeOrbitDetector.cached` bleeds between tests
**What goes wrong:** Test A detects Bun capabilities, sets cache. Test B stubs `globalThis.Bun = undefined` to simulate Node, but cache from Test A remains.
**Why it happens:** Static class property survives between tests.
**How to avoid:** Always expose `NativeOrbitDetector.reset()` and call it in `afterEach` / `beforeEach` in tests. Mirror the pattern already used by `NativeHasher.reset()`.
**Warning signs:** Test order-dependent failures.

---

## Code Examples

### Checking argon2id hash prefix in integration test

```typescript
// Source: Bun docs + existing patterns in packages/core/tests/runtime.test.ts
describe('HashManager BUN-01 integration', () => {
  it('uses argon2id via Bun.password on Bun runtime', async () => {
    const manager = new HashManager({ algorithm: 'argon2id' })
    const hashed = await manager.make('password123')
    // argon2id hashes ALWAYS start with $argon2id$
    expect(hashed).toMatch(/^\$argon2id\$/)
    // Ensure the underlying adapter is Bun-native
    const adapter = getPasswordAdapter()
    const result = await adapter.hash('test', { algorithm: 'argon2id' })
    expect(result).toMatch(/^\$argon2id\$/)
  })
})
```

### Checking Bun.CryptoHasher code path is exercised

```typescript
// Source: existing NativeHasher.test.ts pattern
it('NativeHasher uses bun-crypto-hasher runtime on Bun', () => {
  NativeHasher.reset()
  NativeHasher.sha256('warmup')
  const status = NativeHasher.getStatus()
  expect(status.runtime).toBe('bun-crypto-hasher')
  expect(status.available).toBe(true)
})

// BUN-02: test sha512 and blake2b paths
it('NativeHasher.sha512 uses Bun.CryptoHasher', () => {
  const result = NativeHasher.sha512('hello')
  expect(result).toMatch(/^[a-f0-9]{128}$/) // sha512 = 128 hex chars
})
```

### NativeOrbitDetector detectBunCapabilities (usage example)

```typescript
// Any Orbit can call at install-time:
import { NativeOrbitDetector } from '@gravito/core'

class MyOrbit implements GravitoOrbit {
  install(core: PlanetCore) {
    const features = NativeOrbitDetector.detectBunCapabilities()
    if (features.password.argon2id) {
      // use high-performance path
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | Status |
|--------------|------------------|--------|
| bcryptjs npm package for password hashing | `Bun.password` built-in | Already wired in `getPasswordAdapter()` — no npm dependency needed |
| node:crypto for all hashing | `Bun.CryptoHasher` with node:crypto fallback | Already in `NativeHasher` — needs sha512/blake2b |
| No capability introspection | `NativeOrbitDetector` structured API | Does not exist yet — must be created |
| No boot-time native report | `[gravito] native:` log line at boot | Does not exist yet — must be added to `PlanetCore.boot()` |

**Deprecated/outdated:**
- Direct `Bun.xxx` calls outside `adapter-bun.ts`: superseded by `adapter-bun.ts` + `NativeOrbitDetector` pattern — all new code must follow the guard pattern.

---

## Open Questions

1. **BLAKE2b fallback algorithm for Node.js `HashFallback`**
   - What we know: `Bun.CryptoHasher('blake2b256')` works in Bun 1.3.10. `createHash('blake2b256')` is not universally available in Node.js standard builds.
   - What's unclear: Whether the project's CI uses a Node.js version/build with BLAKE2b support in OpenSSL. `blake2b512` is more commonly available than `blake2b256`.
   - Recommendation: Planner should specify fallback: either `sha256` (safe, different semantic), `sha3-256` (closer semantically), or check if `blake2b512` is available and document the difference. Add a `// TODO(fallback): BLAKE2b not universally available in Node` comment.

2. **Where exactly to place the capability report log call in PlanetCore**
   - What we know: `PlanetCore.boot()` static method (line ~800) creates the instance then iterates orbits. The `logger` is already initialized by line ~807.
   - What's unclear: Whether emitting before orbits install (most users never see it) vs. after (too late for orbit install decisions) is the right semantic. The success criterion says "at boot", not "before orbits".
   - Recommendation: Log immediately after `new PlanetCore(...)` in `boot()`, before the `orbits` loop. This ensures any Orbit can also call `detectBunCapabilities()` with the same warm cache.

3. **Export path for `NativeOrbitDetector`**
   - What we know: `packages/core/src/index.ts` is the main export. The `./ffi` subpath export already exists.
   - What's unclear: Whether `NativeOrbitDetector` should export from the main `.` path or from a new subpath like `@gravito/core/runtime`.
   - Recommendation: Export from main `.` path (same pattern as `getRuntimeKind`, `getPasswordAdapter`) — no new subpath needed. This keeps the planner's task simple.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime | All BUN-* requirements | ✓ | 1.3.10 | node:crypto for CryptoHasher, no fallback for Bun.password |
| `Bun.password.hash` | BUN-01 | ✓ | built-in 1.3.10 | none (sentinel requires Bun) |
| `Bun.CryptoHasher` | BUN-02 | ✓ | built-in 1.3.10 | `HashFallback` (node:crypto) |
| `Bun.Glob` | PERF-03 (capability flag only) | ✓ | built-in 1.3.10 | node:fs glob scan |
| `bun:test` | test framework | ✓ | built-in 1.3.10 | — |

**Missing dependencies with no fallback:**
- `Bun.password` has no Node.js fallback — the current `getPasswordAdapter()` throws an error on non-Bun runtimes. This is acceptable and by design (sentinel is Bun-only).

---

## Validation Architecture

> `workflow.nyquist_validation` not readable (config.json permission) — treating as enabled (default).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none — `bun test` auto-discovers `*.test.ts` |
| Quick run command | `cd packages/core && bun test tests/runtime-native-detector.test.ts` |
| Full suite command | `bun test` (repo root) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUN-01 | HashManager.make() produces `$argon2id$`-prefixed hash on Bun | integration | `cd packages/sentinel && bun test tests/hash-manager-argon2id-native.integration.test.ts` | ❌ Wave 0 |
| BUN-01 | `getPasswordAdapter()` uses `Bun.password` code path (not fallback) | unit | `cd packages/core && bun test tests/runtime.test.ts` | ✅ (existing, but doesn't assert native path) |
| BUN-02 | `NativeHasher.sha512()` returns 128-char hex | unit | `cd packages/core && bun test tests/ffi/native-hasher-sha512-blake2b.test.ts` | ❌ Wave 0 |
| BUN-02 | `NativeHasher.blake2b()` returns hex hash on Bun | unit | `cd packages/core && bun test tests/ffi/native-hasher-sha512-blake2b.test.ts` | ❌ Wave 0 |
| BUN-02 | `NativeHasher.getStatus().runtime === 'bun-crypto-hasher'` after sha512 call | unit | `cd packages/core && bun test tests/ffi/native-hasher.test.ts` | ✅ (existing) |
| BUN-03 | `NativeOrbitDetector.detectBunCapabilities()` returns typed `NativeFeatures` | unit | `cd packages/core && bun test tests/runtime-native-detector.test.ts` | ❌ Wave 0 |
| BUN-03 | `NativeFeatures.password.argon2id === true` on Bun 1.3.10 | unit | `cd packages/core && bun test tests/runtime-native-detector.test.ts` | ❌ Wave 0 |
| BUN-03 | No direct `Bun.xxx` call outside `adapter-bun.ts` in new files | static | `grep -rn 'Bun\.' packages/core/src/runtime/NativeOrbitDetector.ts` | ❌ Wave 0 |
| PERF-03 | Boot log line contains `[gravito] native:` and `argon2id` | integration | `cd packages/core && bun test tests/planet-core-boot-report.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd packages/core && bun test tests/runtime-native-detector.test.ts --timeout=10000`
- **Per wave merge:** `cd packages/core && bun test && cd ../sentinel && bun test`
- **Phase gate:** Full suite green (`bun test` from repo root) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/sentinel/tests/hash-manager-argon2id-native.integration.test.ts` — covers BUN-01 native path assertion
- [ ] `packages/core/tests/ffi/native-hasher-sha512-blake2b.test.ts` — covers BUN-02 sha512/blake2b
- [ ] `packages/core/tests/runtime-native-detector.test.ts` — covers BUN-03 NativeOrbitDetector
- [ ] `packages/core/tests/planet-core-boot-report.test.ts` — covers PERF-03 boot capability log
- [ ] `export function resetPasswordAdapter()` in `packages/core/src/runtime/index.ts` — needed by integration tests to reset singleton

---

## Sources

### Primary (HIGH confidence)

- Bun 1.3.10 runtime — `bun -e "..."` live verification of `Bun.password`, `Bun.CryptoHasher`, `Bun.Glob` availability
- `packages/core/src/runtime/index.ts` — existing `getPasswordAdapter()` implementation
- `packages/core/src/ffi/NativeHasher.ts` — existing `BunCryptoHasher` implementation
- `packages/core/src/runtime/detection.ts` — existing `getRuntimeKind()` implementation
- `packages/core/src/PlanetCore.ts` — existing `PlanetCore.boot()` static method (line 800)

### Secondary (MEDIUM confidence)

- Existing test patterns in `packages/core/tests/ffi/native-hasher.test.ts` — test structure for new tests
- Existing `NativeHasherStatus` type in `packages/core/src/ffi/types.ts` — pattern for `NativeFeatures` type design

### Tertiary (LOW confidence)

- BLAKE2b fallback in Node.js: unverified which Node.js versions/builds expose `blake2b256` via `node:crypto`. Planner should flag for validation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified live against Bun 1.3.10
- Architecture: HIGH — derived from existing patterns in codebase, no external library speculation
- Pitfalls: HIGH — three pitfalls (bare Bun reference, BLAKE2b fallback, password adapter cache) confirmed by code inspection

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (Bun APIs are stable; `NativeOrbitDetector` design anchored to existing patterns)
