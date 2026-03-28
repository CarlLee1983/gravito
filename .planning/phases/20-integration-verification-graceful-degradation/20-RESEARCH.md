# Phase 20: Integration Verification & Graceful Degradation - Research

**Researched:** 2026-03-29
**Domain:** TypeScript resilience patterns, semver version management, contract testing, technical documentation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**OrbitDegradationManager API Design**
- D-01: OrbitDegradationManager lives in `@gravito/resilience` — natural extension of existing withResilience/CircuitOpenException. No new package.
- D-02: API uses `DegradedResult<T>` pattern:
  ```typescript
  interface DegradedResult<T> {
    value: T
    degraded: boolean
    source: 'live' | 'fallback'
  }
  ```
  Callers distinguish normal from degraded results via `result.degraded`.
- D-03: Fallback registration via `mgr.registerFallback(orbitName, { fn, ttl })`. TTL controls how long a cached fallback is valid.
- D-04: `mgr.execute(orbitName, fn)` catches `CircuitOpenException` internally and returns registered fallback wrapped in `DegradedResult`. If no fallback registered, re-throws.
- D-05: In `NODE_ENV=test`, DegradationManager skips fallback logic entirely and throws `CircuitOpenException` directly. Consistent with Phase 17 decision — test env must throw, not silently degrade.

**Version Bump Strategy**
- D-06: Only the 38 packages actually modified in Phase 16-19 get version bumps. Unmodified packages keep current versions.
- D-07: Each modified package gets major version +1 (e.g., signal 3.1.2 → 4.0.0, photon 1.1.4 → 2.0.0, atlas 2.6.0 → 3.0.0). Follows semver — independent version evolution per package.
- D-08: All peerDependencies referencing bumped packages must be updated to the new major range (e.g., `"@gravito/core": "^3.0.0"`). Internal workspace:* protocol stays unchanged.
- D-09: `bun run version:check` must pass after all bumps — confirms workspace version consistency.

**Satellite Integration Testing**
- D-10: Contract tests written in gravito-core (no cross-repo dependency). Tests verify:
  1. Orbit API signatures consumed by Satellites are unchanged
  2. Error types are backward-compatible (instanceof still works)
  3. Event protocol contracts are preserved
- D-11: No need to clone gravito-dev-env or run actual Satellite test suites. Contract tests in this repo are sufficient for v2.0.0 release confidence.

**Migration Guide**
- D-12: Location: `docs/migration/v2.0.0.md`
- D-13: Content structure: breaking changes list, before/after code examples per category (error handling, resilience, health checks), per-package version change summary.
- D-14: Audience: framework consumers (Satellite developers, application developers using Gravito Orbits directly).

### Claude's Discretion
- OrbitDegradationManager internal implementation details (how to intercept CircuitOpenException, cache invalidation strategy)
- Exact contract test structure and assertions for Satellite compatibility
- Migration guide formatting, depth of before/after examples, and whether to include a "quick start" section
- Version bump automation approach (script vs manual)
- Order of operations within the phase (tests first vs degradation first vs version first)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTG-05 | `OrbitDegradationManager` in CB open returns typed fallback rather than throwing | D-01 through D-05 fully specify the API; `withResilience.ts` line 29 explicitly deferred this to Phase 20; `CircuitOpenException` is the exact type to catch |
| RELS-01 | Each modified Orbit package updates package.json version (major bump to next major) | D-06 through D-09 specify scope and strategy; `scripts/check-versions.ts` is the validation tool; per-package semver mapping documented below |
</phase_requirements>

---

## Summary

Phase 20 is the final milestone in v2.0.0. It has four distinct workstreams: implementing `OrbitDegradationManager`, writing satellite compatibility contract tests, executing version bumps across ~38 packages, and producing the migration guide. No new error classes or resilience primitives are required — all foundational infrastructure is already in place from Phases 16-19.

The technical risk in this phase is low. The `withResilience.ts` already maps cockatiel errors to `CircuitOpenException` (line 123); the `DegradationManager` simply wraps that and provides a fallback path. The main execution risk is the version bump scope — updating `package.json` across ~38 packages and their downstream `peerDependencies` is mechanical but error-prone if done manually. A scripted or systematic approach is essential.

The `bun run version:check` script (`scripts/check-versions.ts`) validates that local versions do not already exist on NPM — it is the acceptance gate for RELS-01. It does NOT validate workspace cross-references; peerDependency range updates must be verified separately.

**Primary recommendation:** Implement `OrbitDegradationManager` first (it unblocks the satellite contract tests), then run contract tests, then execute version bumps with peerDependency audit, then write the migration guide.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@gravito/resilience` | 1.0.2 (current) | Home for `OrbitDegradationManager` | D-01 decision; natural extension of `withResilience` + `CircuitOpenException` |
| `cockatiel` | ^3.2.1 | Underlying circuit breaker primitive | Already a direct dependency of `@gravito/resilience`; no new deps needed |
| `bun:test` | Bun 1.3.10 | Test framework | Project standard; all contract tests use `describe/it/expect` from `bun:test` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `assertGravitoException` helper | N/A (local) | Reusable contract assertion | Located at `packages/core/tests/contract/helpers.ts`; import in all new satellite contract tests |
| `scripts/check-versions.ts` | N/A (local) | Validate version bumps | Run after all `package.json` version edits to confirm RELS-01 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual version bumps | Changeset / lerna version | Changesets requires additional setup; manual is faster for a one-time major release across known 38 packages |
| Fallback TTL via `Date.now()` | LRU cache library | No new dependencies needed; TTL via timestamp comparison is sufficient for this use case |

**Installation:** No new packages required. All dependencies are already in place.

---

## Architecture Patterns

### OrbitDegradationManager Structure
```
packages/resilience/src/
├── degradation/
│   ├── OrbitDegradationManager.ts   # Core class
│   └── DegradedResult.ts            # Interface definition
├── exceptions/
│   └── CircuitOpenException.ts      # Already exists — DegradationManager catches this
└── index.ts                          # Add exports for OrbitDegradationManager + DegradedResult
```

### Satellite Contract Tests Location
```
packages/resilience/tests/
└── satellite-contracts/
    ├── orbit-api-signatures.contract.test.ts  # Verify API shapes Satellites consume
    ├── error-instanceof.contract.test.ts       # Verify error hierarchy compat
    └── degradation-manager.contract.test.ts    # Verify DegradedResult shape + NODE_ENV gate
```

### Migration Guide Location
```
docs/migration/
└── v2.0.0.md   # New file per D-12
```
Note: `docs/migration/` directory does not yet exist. It must be created. Existing migration docs live at `docs/operations/migration/` — do NOT put v2.0.0 there; D-12 specifies `docs/migration/v2.0.0.md`.

### Pattern 1: OrbitDegradationManager Implementation
**What:** Class that wraps `withResilience`-style calls, catches `CircuitOpenException`, and returns a `DegradedResult<T>` from registered fallbacks.
**When to use:** Any Orbit call site where the caller needs to distinguish live results from fallback values.

```typescript
// packages/resilience/src/degradation/DegradedResult.ts
export interface DegradedResult<T> {
  value: T
  degraded: boolean
  source: 'live' | 'fallback'
}
```

```typescript
// packages/resilience/src/degradation/OrbitDegradationManager.ts
import { CircuitOpenException } from '../exceptions/CircuitOpenException'
import type { DegradedResult } from './DegradedResult'

interface FallbackEntry<T> {
  fn: () => Promise<T> | T
  ttl: number  // milliseconds; 0 = no cache
  cachedValue?: T
  cachedAt?: number
}

export class OrbitDegradationManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fallbacks = new Map<string, FallbackEntry<any>>()

  registerFallback<T>(orbitName: string, options: { fn: () => Promise<T> | T; ttl: number }): void {
    this.fallbacks.set(orbitName, { ...options })
  }

  async execute<T>(orbitName: string, fn: () => Promise<T>): Promise<DegradedResult<T>> {
    // In test env: always throw, never return fallback (D-05)
    if (process.env.NODE_ENV === 'test') {
      const value = await fn()
      return { value, degraded: false, source: 'live' }
    }

    try {
      const value = await fn()
      return { value, degraded: false, source: 'live' }
    } catch (err) {
      if (err instanceof CircuitOpenException) {
        const entry = this.fallbacks.get(orbitName) as FallbackEntry<T> | undefined
        if (!entry) throw err  // No fallback registered: re-throw

        // Check TTL cache
        const now = Date.now()
        if (entry.ttl > 0 && entry.cachedValue !== undefined && entry.cachedAt !== undefined) {
          if (now - entry.cachedAt < entry.ttl) {
            return { value: entry.cachedValue, degraded: true, source: 'fallback' }
          }
        }

        // Invoke fallback
        const fallbackValue = await entry.fn()

        // Cache result if TTL > 0
        if (entry.ttl > 0) {
          entry.cachedValue = fallbackValue
          entry.cachedAt = now
        }

        return { value: fallbackValue, degraded: true, source: 'fallback' }
      }
      throw err  // Non-CircuitOpenException: propagate unchanged
    }
  }
}
```

**D-05 clarification:** When `NODE_ENV=test`, `execute()` calls `fn()` directly without try/catch interception. If `fn()` throws `CircuitOpenException` in tests, it propagates to the caller — consistent with all Phase 17 test behavior where CB errors must be observable, not silently consumed.

### Pattern 2: Satellite Compatibility Contract Test
**What:** Source-scanning contract tests that verify Orbit packages still export the API surface Satellites depend on.
**When to use:** For each Orbit API entry point that RBAC, Catalog, or Commerce Satellites consume.

```typescript
// packages/resilience/tests/satellite-contracts/orbit-api-signatures.contract.test.ts
import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Satellite API compatibility: atlas', () => {
  it('exports DB class at src/DB.ts (Catalog/Commerce consume atlas.DB directly)', () => {
    const src = readFileSync(join(import.meta.dir, '../../../atlas/src/DB.ts'), 'utf-8')
    // Verify method signatures that satellites depend on are present
    expect(src).toContain('static async transaction(')
    expect(src).toContain('static async transactionWithRetry(')
  })
})
```

### Pattern 3: Version Bump Mapping
**What:** Mechanical semver major bump applied to each modified package — independent version evolution (D-07).

Current → Target mapping for all 22+ directly-touched packages:

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| `@gravito/core` | 2.0.6 | 3.0.0 | Foundation of all error hierarchy |
| `@gravito/resilience` | 1.0.2 | 2.0.0 | Adds OrbitDegradationManager |
| `@gravito/photon` | 1.1.4 | 2.0.0 | CB middleware integration |
| `@gravito/atlas` | 2.6.0 | 3.0.0 | withResilience integration |
| `@gravito/plasma` | 2.0.3 | 3.0.0 | withResilience integration |
| `@gravito/signal` | 3.1.2 | 4.0.0 | Error model migration |
| `@gravito/stream` | 2.1.2 | 3.0.0 | Error model + health |
| `@gravito/monitor` | 3.1.2 | 4.0.0 | Health registry, CB integration |
| `@gravito/beam` | 1.0.1 | 2.0.0 | Error model migration |
| `@gravito/ether` | 1.0.1 | 2.0.0 | Error model migration |
| `@gravito/flux` | 3.0.3 | 4.0.0 | Error model + health |
| `@gravito/echo` | 3.1.2 | 4.0.0 | Error model + health |
| `@gravito/flare` | 4.0.2 | 5.0.0 | Error model migration |
| `@gravito/radiance` | 1.0.5 | 2.0.0 | Error model + health |
| `@gravito/quark` | 1.0.2 | 2.0.0 | Error model migration |
| `@gravito/graphql` | 1.1.3 | 2.0.0 | Error model migration |
| `@gravito/impulse` | 1.1.2 | 2.0.0 | Error model migration |
| `@gravito/impulse-bridge` | 2.0.3 | 3.0.0 | Error codes added |
| `@gravito/monolith` | 3.2.3 | 4.0.0 | Error model migration |
| `@gravito/fortify` | 3.1.2 | 4.0.0 | Error model migration |
| `@gravito/nebula` | 4.1.3 | 5.0.0 | Error model migration |
| `@gravito/stasis` | 3.2.4 | 4.0.0 | Error model + health |

Additional packages from Phase 16-19 SUMMARY files (to verify individually):
`astral`, `beam`, `chromatic`, `cli`, `constellation`, `cosmos`, `dark-matter`, `enterprise`, `forge`, `freeze`, `horizon`, `launchpad`, `luminosity`, `nebula-s3`, `prism`, `pulsar`, `quasar`, `ripple`, `sentinel`, `spectrum`, `zenith`

### Pattern 4: peerDependency Range Update
**What:** When a package is bumped to a new major, all other packages that declare it as a `peerDependency` must update their range.

The most common peer reference is `@gravito/core`. After core bumps to 3.0.0, every package with `"@gravito/core": "^2.0.0"` in peerDependencies must become `"@gravito/core": "^3.0.0"`.

Packages with `@gravito/photon` peer (must update to `"^2.0.0"`): monitor, fortify, prism, cosmos, ion, sentinel, beam, spectrum, luminosity-adapter-photon.

**Verified full peerDependency graph from codebase scan:**
```
@gravito/core peers: mass, monitor, echo, monolith, fortify, flux, nebula,
  constellation, prism, cosmos, ion, nova, stasis, ripple, pulse, horizon,
  sentinel, ether, impulse-bridge, resilience, forge, graphql, nebula-s3,
  beam, quark, spectrum, pulsar, scaffold, orbit-cloudflare

@gravito/photon peers: monitor, fortify, prism, cosmos, ion, sentinel, beam,
  spectrum, luminosity-adapter-photon

@gravito/signal peers: fortify
@gravito/plasma peers: stasis, pulsar
@gravito/stasis peers: horizon
@gravito/nebula peers: forge
@gravito/stream peers: forge
@gravito/impulse peers: impulse-bridge
@gravito/sentinel peers: fortify
@gravito/chromatic peers: nova
```

### Anti-Patterns to Avoid
- **Bumping unmodified packages:** D-06 is explicit — only packages touched in Phase 16-19 get bumps. Do not cascade bumps to indirect dependents.
- **Updating workspace:* to a specific version:** Internal dev dependencies use `workspace:*` (stays unchanged). Only `peerDependencies` with version ranges need updating.
- **Running version:check before all bumps complete:** The script checks NPM registry; running it mid-bump produces misleading partial results.
- **Wrapping `atlas.transactionWithRetry` with `OrbitDegradationManager.execute()`:** `transactionWithRetry` handles deadlock retry internally. The DegradationManager is for CB-protected connection-level calls (e.g., `reconnect`), not transaction retries.
- **NODE_ENV gate via string equality without fallback:** Always check `process.env.NODE_ENV === 'test'`. In Bun test environment, this is set automatically.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circuit breaker state | Custom CB with counters | cockatiel `circuitBreaker()` via `withResilience` | Already wired; DegradationManager wraps, not replaces |
| TTL cache for fallback | Redis, Map + setInterval | Simple `Date.now()` timestamp in entry map | Single-process, in-memory; complexity is not justified |
| Version consistency validation | Custom semver checker | `bun run version:check` (already in scripts/check-versions.ts) | Script already validates local vs NPM registry |
| Contract assertion boilerplate | Per-test instanceof + field checks | `assertGravitoException()` from `packages/core/tests/contract/helpers.ts` | Already exists; import path is `../../core/tests/contract/helpers` |

**Key insight:** The entire implementation surface for this phase is about composition and documentation, not novel algorithms. The hard work (error hierarchy, CB integration, health monitoring) is already complete.

---

## Common Pitfalls

### Pitfall 1: D-05 NODE_ENV Gate Inversion
**What goes wrong:** `OrbitDegradationManager.execute()` accidentally returns a `DegradedResult` in test environment when `CircuitOpenException` is thrown.
**Why it happens:** The natural implementation is `try { fn() } catch (CircuitOpenException) { return fallback }` — this runs in all environments unless the test gate is explicitly first.
**How to avoid:** Place the `NODE_ENV=test` check before the try/catch block. In test mode, await `fn()` and return live result directly — let any exception propagate naturally.
**Warning signs:** Test that expects `CircuitOpenException` to be thrown from `execute()` starts returning `DegradedResult` instead.

### Pitfall 2: peerDependency Range Lag
**What goes wrong:** After bumping `@gravito/photon` to 2.0.0, packages like `@gravito/monitor` still declare `"@gravito/photon": "^1.1.0"` — consumers get peer conflict warnings.
**Why it happens:** Version bump scripts often only update the package being bumped, not all consumers of it.
**How to avoid:** After bumping each package, grep all `package.json` files for the old range and update them. The peerDependency graph (Pattern 4 above) lists all affected packages.
**Warning signs:** `bun install` produces peer dependency resolution warnings after bumps.

### Pitfall 3: version:check Script Behavior Misunderstood
**What goes wrong:** Treating `bun run version:check` as a workspace consistency checker when it actually checks NPM registry presence.
**Why it happens:** The script name suggests "check all versions are consistent" but it actually checks "is this local version already on NPM?"
**How to avoid:** After bumping, a package shows `✨ NEW VERSION` — that means the local version is NOT on NPM yet (good — ready to publish). `⚠️ EXISTS` means the local version IS on NPM already (bad — forgot to bump or bumped to wrong version).
**Warning signs:** Confusion between "workspace cross-reference consistency" and "registry presence check". The former is validated by `bun run typecheck`; the latter by `version:check`.

### Pitfall 4: Contract Test Cross-Package Import Path
**What goes wrong:** Satellite contract tests in `packages/resilience/tests/satellite-contracts/` import from `@gravito/core` package via npm reference instead of relative workspace path, causing import resolution failures in test context.
**Why it happens:** Other packages use `import { X } from '@gravito/core'` but tests in the workspace need to resolve through tsconfig path mapping or workspace symlinks.
**How to avoid:** Follow the established pattern in `packages/plasma/tests/contract/plasma-errors.contract.test.ts` which imports `{ assertGravitoException } from '../../../core/tests/contract/helpers'` — use relative paths for test helpers. For source imports, use the package name (workspace resolves it).
**Warning signs:** `Module '@gravito/core' not found` errors during test run.

### Pitfall 5: Migration Guide Placed in Wrong docs/ Subdirectory
**What goes wrong:** Migration guide created at `docs/operations/migration/v2.0.0.md` instead of `docs/migration/v2.0.0.md`.
**Why it happens:** `docs/operations/migration/` already exists with other migration guides — natural to put it there.
**How to avoid:** D-12 is explicit: location is `docs/migration/v2.0.0.md`. Create the `docs/migration/` directory.
**Warning signs:** File created in wrong location.

---

## Code Examples

Verified patterns from codebase inspection:

### OrbitDegradationManager Export (add to index.ts)
```typescript
// Add to packages/resilience/src/index.ts barrel
export { OrbitDegradationManager } from './degradation/OrbitDegradationManager'
export type { DegradedResult } from './degradation/DegradedResult'
```

### Satellite Contract Test — Invoke assertGravitoException
```typescript
// packages/resilience/tests/satellite-contracts/error-instanceof.contract.test.ts
import { describe, it, expect } from 'bun:test'
import { CircuitOpenException } from '../../src/exceptions/CircuitOpenException'
import { InfrastructureException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'

describe('Satellite compatibility: CircuitOpenException hierarchy', () => {
  it('CircuitOpenException is instanceof InfrastructureException (Satellite catch blocks)', () => {
    const err = new CircuitOpenException({ breakerName: 'atlas-db' })
    assertGravitoException(err, {
      expectedCode: 'resilience.circuit_open',
      expectedStatus: 503,
      expectedInstanceOf: [InfrastructureException],
      expectRetryable: false,
    })
  })
})
```

### DegradedResult discriminated union usage (for migration guide examples)
```typescript
// Before (v1.x — throws on circuit open):
const data = await withResilience(() => atlas.DB.query(...), policy)

// After (v2.0 — typed fallback):
const result = await mgr.execute('atlas', () => atlas.DB.query(...))
if (result.degraded) {
  // Use result.value (fallback) and handle gracefully
  return result.value  // fallback data
}
return result.value  // live data
```

### Version Bump Script (recommended automation approach)
```typescript
// Inline bun script — bump major version in a package.json
import { readFile, writeFile } from 'node:fs/promises'
const path = 'packages/atlas/package.json'
const pkg = JSON.parse(await readFile(path, 'utf-8'))
const [major] = pkg.version.split('.')
pkg.version = `${Number(major) + 1}.0.0`
await writeFile(path, JSON.stringify(pkg, null, 2) + '\n')
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bare `throw new Error()` in Orbits | All Orbits throw typed `XxxError extends GravitoException` with `.code` + `.status` | Phase 16-19 | Satellites can now `instanceof`-check specific error types |
| Three duplicate CircuitBreaker implementations | Single unified `withResilience()` + cockatiel in `@gravito/resilience` | Phase 17-18 | Atlas + plasma CB is now a single named registry |
| No fallback on CB open — always throws | `OrbitDegradationManager.execute()` returns `DegradedResult<T>` | Phase 20 (this phase) | Satellite can distinguish live from degraded without try/catch |
| No health reporting | All I/O Orbits register with `HealthRegistry` | Phase 19 | `/health` endpoint reflects real Orbit status |

**Deprecated/outdated:**
- `throw new Error('...')` in Orbit packages: eliminated in Phase 16-19. Migration guide must document the before state for framework consumers.

---

## Open Questions

1. **Exact list of "38 packages" modified in Phase 16-19**
   - What we know: SUMMARY files reference ~22 directly-touched packages; grep across all SUMMARY files yields 43 unique package names (some may be referenced but not modified)
   - What's unclear: Whether `astral`, `chromatic`, `cli`, `enterprise`, `freeze`, and other Phase 19 SUMMARY-referenced packages actually received code changes
   - Recommendation: Planner should audit each SUMMARY's `key-files.modified` section to produce a definitive list. The version bump wave should only include packages with actual source changes — not just packages that were read or imported during implementation.

2. **peerDependency range for `@gravito/resilience` after 1.0.2 → 2.0.0**
   - What we know: `@gravito/echo` declares `"@gravito/resilience": "workspace:*"` (internal dev dep stays unchanged)
   - What's unclear: Are there any external consumers with a pinned resilience peerDep range?
   - Recommendation: Check all package.json files for `"@gravito/resilience"` in peerDependencies (not devDependencies). Current scan shows only echo uses it, as a workspace peer — likely no range update needed.

3. **Migration guide "Quick Start" section**
   - What we know: D-13 specifies content; D-14 specifies audience; quick-start section is Claude's discretion
   - Recommendation: Include a minimal quick-start section (3-5 lines showing the most common upgrade path) at the top before the detailed breaking changes. Reduces time-to-value for Satellite authors.

---

## Environment Availability

Step 2.6: SKIPPED (no external tool dependencies identified — this phase is code/config/documentation only)

The `bun run version:check` script calls `npm view` which requires network access and optionally npm login, but it is a reporting tool (warns, does not fail hard if network is unavailable). No blocking external service dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test (bun:test) v1.3.10 |
| Config file | `bunfig.toml` — root level, timeout = 10000ms |
| Quick run command | `bun test packages/resilience/tests/ --timeout=10000` |
| Full suite command | `bun test packages/ --timeout=10000` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-05 | `execute()` returns `DegradedResult` when CB open | unit | `bun test packages/resilience/tests/satellite-contracts/ --timeout=10000` | ❌ Wave 0 |
| INTG-05 | `execute()` throws `CircuitOpenException` when no fallback registered | unit | `bun test packages/resilience/tests/satellite-contracts/ --timeout=10000` | ❌ Wave 0 |
| INTG-05 | `execute()` throws in `NODE_ENV=test` (D-05 gate) | unit | `bun test packages/resilience/tests/satellite-contracts/ --timeout=10000` | ❌ Wave 0 |
| INTG-05 | TTL cache returns stale fallback before expiry | unit | `bun test packages/resilience/tests/satellite-contracts/ --timeout=10000` | ❌ Wave 0 |
| RELS-01 | All bumped packages show `✨ NEW VERSION` in version:check | smoke | `bun run version:check` | ✅ (script exists) |
| D-10 | `CircuitOpenException instanceof InfrastructureException` (Satellite catch compat) | contract | `bun test packages/resilience/tests/satellite-contracts/ --timeout=10000` | ❌ Wave 0 |
| D-10 | Atlas, plasma API signatures unchanged (DB.transaction, BunRedisClient) | contract | `bun test packages/resilience/tests/satellite-contracts/ --timeout=10000` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test packages/resilience/tests/ --timeout=10000`
- **Per wave merge:** `bun test packages/ --timeout=10000` (target: 0 fail, full suite green)
- **Phase gate:** Full suite green + `bun run version:check` showing only `✨ NEW VERSION` entries for bumped packages

### Wave 0 Gaps
- [ ] `packages/resilience/src/degradation/DegradedResult.ts` — interface definition
- [ ] `packages/resilience/src/degradation/OrbitDegradationManager.ts` — INTG-05 implementation
- [ ] `packages/resilience/tests/satellite-contracts/degradation-manager.contract.test.ts` — covers INTG-05
- [ ] `packages/resilience/tests/satellite-contracts/error-instanceof.contract.test.ts` — covers D-10 error compat
- [ ] `packages/resilience/tests/satellite-contracts/orbit-api-signatures.contract.test.ts` — covers D-10 API compat
- [ ] `docs/migration/` directory — for RELS-01 documentation deliverable

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `packages/resilience/src/resilience/withResilience.ts` (line 29 comment, CircuitOpenException mapping at line 123)
- Direct codebase inspection — `packages/resilience/src/exceptions/CircuitOpenException.ts` (exact constructor signature)
- Direct codebase inspection — `packages/core/tests/contract/helpers.ts` (assertGravitoException implementation)
- Direct codebase inspection — `scripts/check-versions.ts` (version:check behavior — checks NPM registry, not workspace consistency)
- Direct codebase inspection — all `package.json` files for current versions and peerDependency graph
- Direct codebase inspection — Phase 16-19 CONTEXT.md files for decision rationale

### Secondary (MEDIUM confidence)
- Phase 20 CONTEXT.md decisions D-01 through D-14 — locked by `/gsd:discuss-phase` session
- Phase 19 SUMMARY files — provides definitive list of modified files per package

---

## Metadata

**Confidence breakdown:**
- OrbitDegradationManager implementation: HIGH — API is fully spec'd in D-01 through D-05; foundation code is well-understood from direct inspection
- Satellite contract tests: HIGH — pattern is established (35 existing contract test files); `assertGravitoException` helper exists
- Version bump scope: MEDIUM — ~22 packages are directly confirmed; "38 packages" claim in D-06 needs reconciliation against SUMMARY key-files.modified (see Open Questions)
- peerDependency graph: HIGH — extracted from live package.json files
- Migration guide: HIGH — structure is locked in D-12 through D-14; content follows directly from Phase 16-19 changes

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (stable domain — no external dependencies, all findings from local codebase)
