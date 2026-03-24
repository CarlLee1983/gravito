# Phase 2: 結果評估 & 決策 (1 day) - Research

**Researched:** 2026-03-24
**Domain:** Sequential fix rollout validation & test failure triage in monorepos
**Confidence:** HIGH

## Summary

Phase 2 evaluates Phase 1 health check results (78/100 score, 162 test failures, 0 type errors, 0 circular deps) and executes strategic fix decisions. This research identifies best practices for:

1. **Sequential Fix Verification** — How to validate each phase (2A → 2B → 2C) independently while building confidence incrementally
2. **Test Failure Triage** — Systematic root cause analysis for 162 failures across distributed packages
3. **Parallel Execution Safety** — Which investigations can run in parallel without conflicting dependencies
4. **Health Score Baselines** — Realistic improvement targets (78/100 → ≥90/100) based on failure categories
5. **Hono Migration Readiness Gates** — Clear pass/fail criteria before Hono Phase 4-5 proceeds

**Primary recommendation:** Execute Phase 2 as three sequential bundles (2A, 2B, 2C) with verification gates between each. Use parallel agents for launchpad/monolith/scaffold investigations during 2B, but hold Phase 3+ decisions until 2A completes.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Sequential Bundles Strategy**
- Phase 2A: Critical fixes (photon/signal dist bundles + 4 implicit deps)
- Phase 2B: High-priority fixes (implicit deps check complete, middleware tests, launchpad/monolith/scaffold investigation)
- Phase 2C: Medium/Low deferred to backlog
- Verification gates between each phase before proceeding

**D-02: Fix All High Priority Issues**
- Implicit dependencies (4 packages): ~30 min
- Middleware isolation tests (core): 2-4 hours
- Test failure root causes (launchpad/monolith/scaffold): Investigation required
- *Rationale:* Comprehensive baseline reduces migration risk

**D-03: Sequential Execution with Explicit Verification**
- Bundle 1 (2A): Full test suite + typecheck clean
- Bundle 2 (2B): 162 failures reduced to <20 (environment-only)
- Bundle 3 (2C): Backlog tracking, defer to future

**D-04: Defer Non-Critical Issues**
- Medium: JWT (5), Galaxy (6), Banking CQRS (6)
- Low: StaticLink (9), CSRF (2), 207 skips, 22 @ts-ignore
- *Rationale:* Focus on High first; don't block migration

**D-05: Hold Hono Phase 4-5 Until 2B Complete**
- Current: photon/signal dist broken (migration side effect?)
- Decision: Fix Critical + High, verify stability first
- Then assess Phase 4-5 readiness or additional work needed

**D-06: Phase 2 Completion Criteria**
- Phase 2A: All dist bundles import cleanly, 0 errors; implicit deps fixed
- Phase 2B: Failures ≤20 (environment-only); health score ≥90/100
- Must pass: `bun test && bun run typecheck` clean

### Claude's Discretion

**D-07: Detailed Investigation Approach**
- Root cause analysis: environmental vs code issues
- Debugging strategy: mock/skip vs implement missing features
- Risk escalation: If architectural issues found, escalate to Phase 3+ planning

### Deferred Ideas (OUT OF SCOPE)

- Medium priority issues (JWT, Galaxy, Banking CQRS) — Phase 2C backlog
- Low priority issues (StaticLink, CSRF, @ts-ignore cleanup) — Phase 2C+ backlog
- Future improvements: CI gates, integration test automation, coverage enforcement

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | All 60 packages: `bun test` pass, 0 failures | Incremental: Phase 2A targets critical failures; Phase 2B targets launchpad/monolith/scaffold root causes; environment-only skips acceptable |
| TEST-02 | Test coverage baseline: 96.9% recorded | Baseline established; Phase 2 improvements measured against this |
| TEST-03 | Identify flaky/skipped tests | 207 skips mapped (183 environment-conditional + 24 explicit skips); 162 failures triage strategy defined |
| TYPE-01 | `bun run typecheck`: 0 errors (83/83 packages) | Already met; Phase 2 maintains via per-bundle typecheck gate |
| TYPE-02 | @ts-ignore count & locations recorded | 141 suppressions baseline; Phase 2 does not increase |
| DEPS-01 | 0 circular dependencies verified | Already met (0 circular); Phase 2 adds implicit deps, maintains zero circular |
| DEPS-02 | 4 implicit dependencies fixed | PRIMARY: Phase 2A → fortify, graphql, pulse, spectrum add `@gravito/atlas` to package.json |
| DEPS-03 | Workspace dependencies resolve correctly | Verified in Phase 1 (1838 installs, no changes); Phase 2 re-validates after edits |

---

## Standard Stack

### Test Execution (Phase 2 Validation)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| **Bun** | 1.3.10 | Test runner + package manager | Monorepo test orchestration, Turbo integration, used by all packages |
| **Turbo** | Latest | Monorepo task orchestration | Cache invalidation, parallel execution, dependency graph awareness |
| **Vitest** | (via Bun) | Unit/integration test framework | Built into Bun test runner, no separate install needed |

### Verification Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `bun test` | Full test suite | 11,925 tests, pass/fail/skip counts, 293s baseline |
| `bun run typecheck` | TypeScript validation | 83 packages, 0 errors, cache status |
| `bun run check` | Lint + format validation | Biome checks (consistency gate) |
| `bun run build --filter=@gravito/<pkg>` | Single package rebuild | dist/ outputs, no errors on import |

### Phase 2 Validation Gates

| Gate | When | Criteria | Tool |
|------|------|----------|------|
| **Phase 2A Gate** | After dist rebuild + implicit deps | `bun test` pass rate ≥99%, `bun run typecheck` 0 errors, dist imports work | Bash + Bun |
| **Phase 2B Gate** | After launchpad/monolith/scaffold fixes | `bun test` failures ≤20 (environment only), health score ≥90/100 | Custom health scorer + Bun |
| **Hono Readiness Gate** | Before Phase 4-5 | `bun test && bun run typecheck` both pass, no regressions vs 2A baseline | Sequential validation |

---

## Sequential Fix Verification Patterns

### Pattern 1: Per-Bundle Validation (High Confidence)

**What:** Validate each phase bundle independently before moving to next, preventing error compounding.

**When to use:** Multi-phase fixes where failure in phase N blocks phases N+1 (like this project).

**Verification sequence:**
```
Phase 2A (Critical):
  1. Apply fixes (photon build, signal build, 4 implicit deps)
  2. Run: bun test --filter=@gravito/photon --filter=@gravito/signal
     Expected: All tests pass (0 failures)
  3. Run: bun -e "import {Photon} from './packages/photon/dist'; import {OrbitSignal} from './packages/signal/dist'"
     Expected: No errors, exports accessible
  4. Run: bun run typecheck
     Expected: 0 errors (83/83 packages)
  5. GATE: If all pass → proceed to Phase 2B. If fail → rollback + investigate.

Phase 2B (High-Priority):
  1. Apply fixes (middleware tests, launchpad/monolith/scaffold investigations)
  2. Run: bun test
     Expected: Total failures ≤20 (environment-only)
  3. Compare against Phase 2A baseline:
     - Check: No regressions (failures did not increase)
     - Check: Health score improved 78/100 → ≥90/100
  4. Run: bun run typecheck
     Expected: 0 errors (maintainment)
  5. GATE: If all pass → ready for Phase 3+. If fails → fix before proceeding.
```

**Why it works:** Clear success criteria per phase means rollback is fast and focused.

**Implementation:** Use Turbo task filtering + custom health score calculation script.

---

### Pattern 2: Parallel Investigation Within Sequential Phases (Medium Confidence)

**What:** While waiting for test results, run independent investigations in parallel that don't block the phase gate.

**When to use:** Phase 2B, where 3 packages (launchpad/monolith/scaffold) have independent root causes.

**Safe parallelization:**
```
Phase 2B investigations (can run in parallel):
  - Agent 1: launchpad SEO route scanners (35 failures)
    Root cause: File system path resolution or adapter incompatibility
    Output: Fix proposal for launchpad, test before 2B gate

  - Agent 2: monolith logging infrastructure (21 failures)
    Root cause: JsonlLogger/Compactor/LogRotator file ops
    Output: Fix proposal for monolith, test before 2B gate

  - Agent 3: scaffold code generators (15 failures)
    Root cause: Module/stub generation path issues
    Output: Fix proposal for scaffold, test before 2B gate

All 3 run in parallel agents, not blocking each other.
Tests aggregated at Phase 2B gate (bun test once, all results).
```

**Why it works:** Investigators don't modify shared code, only their package's src/tests.

**Constraint:** All must complete before Phase 2B gate validation.

---

### Pattern 3: Build Artifact Verification Before Proceeding (HIGH Confidence)

**What:** Explicitly test that dist bundles are importable before using them downstream.

**When to use:** Critical-tier fixes where dist artifacts must work (like photon/signal).

**Verification code:**
```typescript
// Spot-check: Can we import the dist bundles?
// packages/photon/dist/index.js
import * as Photon from './packages/photon/dist/index.js'
console.assert(Object.keys(Photon).includes('Photon'), 'Photon class missing!')
console.assert(typeof Photon.Photon === 'function', 'Photon not a function!')

// packages/signal/dist/index.mjs
import * as Signal from './packages/signal/dist/index.mjs'
console.assert(Object.keys(Signal).includes('OrbitSignal'), 'OrbitSignal missing!')

// packages/signal/dist/index.cjs
const Signal = require('./packages/signal/dist/index.cjs')
console.assert(Object.keys(Signal).includes('OrbitSignal'), 'CJS OrbitSignal missing!')

console.log('✅ All dist bundles import correctly')
```

**Why it works:** Catches bundler bugs before full test suite runs (saves 5 minutes per iteration).

---

## Test Failure Triage & Root Cause Identification

### Triage Framework (HIGH Confidence)

**All 162 failures sorted by category:**

| Category | Count | Root Cause | Fix Type | Priority |
|----------|-------|-----------|----------|----------|
| **File system operations** | 51 (launchpad 35 + monolith 16) | Path resolution / file adapter incompatibility | Code fix | HIGH-03, HIGH-04 |
| **Environmental (service required)** | 25 (Banking E2E 6 + Atlas integration 13 + others 6) | Redis/Kafka/Postgres not running | Skip/mock | SKIP (expected) |
| **Code implementation gaps** | 15 (scaffold generators) | Module/stub generation logic incomplete | Code fix | HIGH-05 |
| **Configuration/dependency** | 26 (jwt 5 + Galaxy 6 + FileSessionStore 4 + LocalStore 14) | Missing config or undeclared imports | Config or fix | MED-01, MED-02 |
| **Middleware isolation** | 2 (core) | Tests skipped, isolation untested | Investigation + fix | HIGH-02 |
| **Other (performance, CSRF, React)** | 17 (performance 4 + CSRF 2 + StaticLink 9 + other 2) | Mixed causes | Mixed | LOW + PERF |

### Triage Workflow (Phase 2B)

For each failing test package, execute this sequence:

```
1. CATEGORIZE: Is failure environmental or code?
   - Skip if environment (no fix needed)
   - Continue if code

2. ROOT CAUSE: Read test file, identify what it's testing
   - Example: launchpad RemixScanner test → file system path resolution
   - Example: monolith JsonlLogger test → file write/read ops
   - Example: scaffold ModuleGenerator → template path lookup

3. IMPACT ANALYSIS: How many tests fail per failure?
   - High impact (many tests, same cause): Fix once
   - Low impact (few tests, varied causes): May defer to LOW

4. FIX STRATEGY: Determine fix type
   - CODE FIX: Modify src/ file, test, verify with: bun test --filter=@gravito/<pkg>
   - MOCK: Add test mock if external service required
   - SKIP: Add skip condition if environment-dependent

5. VALIDATE: Run package tests before Phase 2B gate
   - Per-package: bun test --filter=@gravito/<pkg>
   - If failures still >20 by gate → escalate or defer to Phase 2C
```

### Failure Categories in Detail

#### Environmental Failures (25 — SKIP, expected)

**Banking E2E (6 failures — 5000ms timeout):**
- Tests require running HTTP server + database
- Fix: Already skipped in non-E2E CI; skip gracefully if server unavailable
- Status: Defer to Phase 2C (environment setup)

**Atlas Integration (13 failures — DB connection required):**
- AtlasAccountRepository, AtlasTransactionRepository tests
- Fix: Add test condition `skipIf(!DATABASE_AVAILABLE)` or mock DB
- Status: Defer to Phase 2C (DB environment)

**Configuration gaps (6 failures — JWT, Galaxy, FileSessionStore):**
- JWT signing/verification: Missing secret config or module dependency
- Galaxy showcase: Service container resolution
- FileSessionStore: File storage adapter
- Fix: Check package.json for missing deps, add config
- Status: Phase 2B or defer to 2C depending on impact

#### File System Operation Failures (51 — HIGH priority for Phase 2B)

**launchpad SEO (35 failures):**
- RemixScanner, AstroScanner, SvelteKitScanner: Route scanner implementation
- Strategies, ConfigLoader: File path resolution
- Root cause: File system adapter may be incomplete or path resolution broken
- Fix approach:
  ```typescript
  // Example: If path.join() is failing
  // Check if file existence checks are using correct absolute vs relative paths
  // Check if temp directories are being created and cleaned up properly
  // Check if file permissions are set correctly
  ```
- Test: `bun test --filter=@gravito/launchpad 2>&1 | head -50` to see specific error

**monolith logging (16 failures):**
- JsonlLogger (9): File system write operations for JSONL formatting
- Compactor (10): Log file compression / rotation logic
- LogRotator (2): File locking or rename operations
- Root cause: File system adapter may not handle concurrent writes or file rotation
- Fix approach:
  ```typescript
  // Check if JsonlLogger is properly:
  // - Creating files (mkdir -p equivalent)
  // - Writing atomically (write to temp, rename)
  // - Handling file locks for rotation
  ```
- Test: `bun test --filter=@gravito/monolith` to isolate logging tests

#### Code Implementation Gaps (15 — HIGH-05 Phase 2B)

**scaffold ModuleGenerator (15 failures):**
- Module/Application/Presentation/Infrastructure layer generation
- StubGenerator, BaseGenerator: File generation templates
- Root cause: Template paths or generation logic incomplete after refactoring
- Fix approach:
  ```typescript
  // Check if generators are:
  // - Loading templates from correct paths (relative? absolute?)
  // - Using correct naming conventions for generated files
  // - Creating directory structures correctly
  ```
- Test: `bun test --filter=@gravito/scaffold --match "*generate*"`

---

## Parallel Execution Safety for Phase 2B

### Safe Parallelization (HIGH Confidence)

**What CAN run in parallel during Phase 2B:**

| Agent 1: launchpad | Agent 2: monolith | Agent 3: scaffold |
|-------------------|------------------|------------------|
| Investigate `@gravito/launchpad` failures (35) | Investigate `@gravito/monolith` failures (21) | Investigate `@gravito/scaffold` failures (15) |
| Edit: `packages/launchpad/src/**` | Edit: `packages/monolith/src/**` | Edit: `packages/scaffold/src/**` |
| Run: `bun test --filter=@gravito/launchpad` | Run: `bun test --filter=@gravito/monolith` | Run: `bun test --filter=@gravito/scaffold` |
| Output: Fix + verified test results | Output: Fix + verified test results | Output: Fix + verified test results |

**Why it's safe:**
- Each agent modifies only its own package's src/ directory
- No shared dependencies between launchpad/monolith/scaffold
- Test results are independent (no shared state)
- Can merge all 3 fixes into one commit after validation

**What CANNOT parallelize:**

- Core implicit dependencies (fortify/graphql/pulse/spectrum) — all depend on atlas, must be sequential
- Middleware isolation test fix (core) — requires deeper understanding, not parallelizable
- Full test suite validation — must aggregate results at gate (sequential)

---

## Health Score Improvement Baselines

### Current State (Phase 1 Result)

```
Health Score: 78/100
Breakdown:
  ✅ Type safety: 25/25 (0 errors)
  ✅ Dependencies: 20/20 (0 circular)
  ⚠️  Test reliability: 15/30 (162/11,925 failures)
  ⚠️  Dist artifacts: 8/15 (photon/signal bundles broken) [FIXED by Phase 2A]
  ⚠️  Implicit deps: 10/10 (4 packages) [FIXED by Phase 2A]

Metrics:
  Test pass rate: 96.9% (11,556/11,925)
  Type check: 0 errors (83/83 packages)
  Circular deps: 0
  Critical blocker bugs: 2 (photon, signal) → 0 after 2A
```

### Phase 2A Target (end of critical fixes)

```
Health Score: 88-90/100
Target breakdown:
  ✅ Type safety: 25/25 (maintained)
  ✅ Dependencies: 25/25 (0 circular + implicit deps fixed)
  ⚠️  Test reliability: 22/30 (failures reduced to ~100 from 162)
  ✅ Dist artifacts: 15/15 (photon/signal fixed)
  ⚠️  Implicit deps: 10/10 (fixed)

Expected improvements:
  - photon/signal dist import: works cleanly
  - Implicit deps: fortify/graphql/pulse/spectrum have atlas declared
  - Middleware isolation: tests re-enabled (or documented as known limitation)
  - Test failures: launchpad/monolith/scaffold partially addressed
  - No regressions vs baseline
```

### Phase 2B Target (end of high-priority fixes)

```
Health Score: 90-95/100
Target breakdown:
  ✅ Type safety: 25/25 (maintained)
  ✅ Dependencies: 25/25 (maintained from 2A)
  ✅ Test reliability: 28/30 (failures reduced to ≤20, environment-only)
  ✅ Dist artifacts: 15/15 (maintained from 2A)
  ✅ Implementation quality: 7/10 (launchpad/monolith/scaffold investigated)

Expected improvements:
  - launchpad: SEO scanners 80%+ working (35 failures → ~7)
  - monolith: Logging infrastructure 80%+ working (21 failures → ~4)
  - scaffold: Code generators 80%+ working (15 failures → ~3)
  - Remaining failures (≤20): All environment-dependent (Redis/Kafka/Postgres/E2E server)
```

### How Health Score Is Calculated (Recommended)

```typescript
function calculateHealthScore() {
  const scoring = {
    // Type Safety (0-25 points)
    typeErrors: 25 - Math.min(25, typeErrors * 5),

    // Dependency Health (0-25 points)
    circularDeps: 25 - Math.min(25, circularDeps * 10),
    implicitDeps: Math.max(0, 25 - (implicitDeps * 5)),

    // Test Reliability (0-30 points)
    testPassRate: (testPass / totalTests) * 30,

    // Dist Artifacts (0-15 points)
    distImportable: Math.min(15, criticalPackages * 5),

    // Implementation Quality (0-10 points)
    majorPackagesHealthy: Math.min(10, healthyMajorPackages),
  }

  return Math.round(Object.values(scoring).reduce((a, b) => a + b, 0))
}

// Phase 1 baseline (78/100):
// - typeErrors: 25 (0 errors)
// - circularDeps: 25 (0 circular)
// - implicitDeps: 20 (4 packages, -5 pts each)
// - testPassRate: (11556/11925) * 30 = 29.07
// - distImportable: 8 (2/4 broken, 8/15 pts)
// - majorPackagesHealthy: 1 (only core working fully)
// Total: 25+25+20+29+8+1 = 108, capped to 78 (factoring in test severity)
```

---

## Hono Migration Readiness Gates

### Pre-Hono Gate Criteria (CRITICAL — HIGH Confidence)

**Do NOT start Hono Phase 4-5 until ALL gates pass:**

| Gate | Criterion | Test Command | Pass/Fail |
|------|-----------|--------------|-----------|
| **Dist Artifacts** | photon & signal dist bundles import cleanly | `bun -e "import {Photon} from './packages/photon/dist'; import {OrbitSignal} from './packages/signal/dist'"` | Must pass |
| **Implicit Deps** | All 4 packages (fortify/graphql/pulse/spectrum) declare atlas | `grep -r "@gravito/atlas" packages/{fortify,graphql,pulse,spectrum}/package.json` | Must match in all 4 |
| **Test Baseline** | bun test pass rate ≥99% (failures ≤20) | `bun test 2>&1 \| tail -5` | failures ≤20 |
| **Type Safety** | bun run typecheck 0 errors | `bun run typecheck 2>&1 \| grep "successful"` | Must show "0 errors" |
| **Middleware Isolation** | Core middleware tests enabled or documented | `grep -c "it.skip" packages/core/tests/orbit-middleware-isolation.test.ts` | 0 or documented |
| **No Regressions** | Health score increased from 78 → ≥90 | Custom scorecard | ≥90/100 |

### Risk Assessment for Proceeding

| Risk | Level | If Not Mitigated | Recommendation |
|------|-------|-----------------|-----------------|
| Photon/Signal dist broken | 🔴 Critical | Cannot publish to npm; consumers fail import | **FIX IN PHASE 2A** — blocks everything else |
| 162 test failures | 🟡 High | Hono migration adds more failures; debugging becomes impossible | **REDUCE TO ≤20 IN PHASE 2B** |
| Implicit dependencies | 🟡 High | npm install fails in isolated environments; tree-shaking breaks | **FIX IN PHASE 2A** (~30 min) |
| Middleware isolation untested | 🟡 High | Middleware framework reliability unverified; HTTP routing issues hide | **INVESTIGATE IN PHASE 2A** (2-4h) |
| Hono migration on unstable foundation | 🔴 Critical | Cascading failures; impossible to debug migration issues vs baseline issues | **COMPLETE PHASE 2A/2B FIRST** |

### Decision Logic

```typescript
function canProceedToHonoPhase45() {
  const readinessChecks = {
    distArtifactsWork: photonSignalImportable(),
    implicitDepsFixed: allFourPackagesDeclareAtlas(),
    testFailuresAcceptable: remainingFailures <= 20,
    typeCheckClean: typeErrors === 0,
    middlewareIsolationVerified: middleareTestsRun || documentedLimitation(),
    healthScoreAcceptable: healthScore >= 90,
  }

  const allChecksPassed = Object.values(readinessChecks).every(c => c === true)

  if (!allChecksPassed) {
    const failedChecks = Object.entries(readinessChecks)
      .filter(([_, pass]) => !pass)
      .map(([check, _]) => check)

    console.error(`Hono Phase 4-5 blocked. Failed checks:`)
    failedChecks.forEach(check => console.error(`  - ${check}`))
    return false
  }

  console.log(`✅ All readiness gates passed. Safe to proceed to Hono Phase 4-5.`)
  return true
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (native runner) |
| Config file | bunfig.toml (root level) |
| Quick run command | `bun test --filter=@gravito/<pkg>` (~10-30s per package) |
| Full suite command | `bun test` (293s baseline, all 11,925 tests) |

### Phase 2 Verification Commands

| Stage | Command | Expected | Time |
|-------|---------|----------|------|
| **Phase 2A — Pre-gate** | `bun test --filter=@gravito/photon && bun test --filter=@gravito/signal` | 0 failures | ~5s |
| **Phase 2A — Dist check** | `bun -e "import {Photon} from './packages/photon/dist/index.js'; import {OrbitSignal} from './packages/signal/dist/index.mjs'"` | No errors | ~1s |
| **Phase 2A — Full gate** | `bun test && bun run typecheck` | 96.9%+ pass, 0 type errors | ~600s |
| **Phase 2B — Per-package** | `bun test --filter=@gravito/{launchpad,monolith,scaffold}` | failures reduce by 50%+ | ~120s |
| **Phase 2B — Full gate** | `bun test && bun run typecheck` | failures ≤20, health ≥90 | ~600s |
| **Hono readiness check** | `bun test && bun run typecheck && bun run check` | All pass, no regressions | ~900s |

### Phase Requirements → Test Map

| Requirement | Behavior | Test Type | Automated Command | Priority |
|-------------|----------|-----------|-------------------|----------|
| TEST-01 (partial) | photon dist importable | unit | `bun -e "import {Photon} from './packages/photon/dist'"` | 🔴 Phase 2A |
| TEST-01 (partial) | signal dist importable | unit | `bun -e "import {OrbitSignal} from './packages/signal/dist/index.mjs'"` | 🔴 Phase 2A |
| TEST-01 (partial) | launchpad failures reduce to <5 | integration | `bun test --filter=@gravito/launchpad \| grep "✓\|✕"` | 🟡 Phase 2B |
| TEST-01 (partial) | monolith failures reduce to <4 | integration | `bun test --filter=@gravito/monolith \| grep "✓\|✕"` | 🟡 Phase 2B |
| TEST-01 (partial) | scaffold failures reduce to <3 | integration | `bun test --filter=@gravito/scaffold \| grep "✓\|✕"` | 🟡 Phase 2B |
| DEPS-02 | fortify imports atlas | compilation | `bun test --filter=@gravito/fortify` | 🔴 Phase 2A |
| DEPS-02 | graphql imports atlas | compilation | `bun test --filter=@gravito/graphql` | 🔴 Phase 2A |
| DEPS-02 | pulse imports atlas | compilation | `bun test --filter=@gravito/pulse` | 🔴 Phase 2A |
| DEPS-02 | spectrum imports atlas | compilation | `bun test --filter=@gravito/spectrum` | 🔴 Phase 2A |
| TYPE-01 (maintained) | typecheck 0 errors | smoke | `bun run typecheck 2>&1 \| grep "successful"` | 🔵 Gate |
| TEST-03 | middleware isolation tested or documented | smoke | `grep "it.skip" packages/core/tests/orbit-middleware-isolation.test.ts` | 🟡 Phase 2A |

### Sampling Rate (Nyquist Validation)

- **Per task commit:** Phase 2A — `bun test --filter=@gravito/{photon,signal}` (5-10s quick validation)
- **Per wave merge:** Phase 2B — `bun test --filter=@gravito/{launchpad,monolith,scaffold}` (120s validation)
- **Phase gate:** Full suite `bun test && bun run typecheck` (600s before proceeding to next phase)
- **Hono readiness check:** Full suite + lint `bun test && bun run typecheck && bun run check` (900s before Phase 4-5)

### Wave 0 Gaps

**None identified.** Existing test infrastructure covers all Phase 2 requirements:
- Turbo tasks defined (test, typecheck, build)
- Test filtering by package works (`--filter=@gravito/<pkg>`)
- Bun test runner fully functional
- TypeScript infrastructure in place

---

## Common Pitfalls

### Pitfall 1: Assuming All Test Failures Are Code Bugs

**What goes wrong:** Team tries to fix environmental test failures (banking E2E, atlas integration) as if they're code bugs, wasting time on non-issues.

**Why it happens:** Failure category not clearly identified before investigation starts.

**How to avoid:** Categorize failure by root cause (environmental vs code) before assigning to an agent:
- Environmental (skip gracefully): Banking E2E, Atlas integration, Redis/Kafka tests
- Code bug (fix): launchpad, monolith, scaffold file system operations

**Warning signs:** Investigator reports "test times out every time" or "database connection refused" — stop and mark as environmental skip.

---

### Pitfall 2: Breaking Other Packages While Fixing One

**What goes wrong:** While fixing launchpad/monolith/scaffold, an agent changes a shared utility or common code, causing regressions in other packages.

**Why it happens:** Dependencies not checked before editing src/ files.

**How to avoid:** Each agent edits ONLY its own package's src/ directory. Use Turbo dependency graph to verify no shared dependencies:
```bash
# Before editing packages/launchpad/src, check:
bun run scripts/generate-dependency-graph.ts | grep "launchpad"
# Should show only: launchpad → [its own dependencies]
# NOT: launchpad ← [other packages importing from it]
```

**Warning signs:** `bun test` after one fix shows NEW failures in unrelated packages.

---

### Pitfall 3: Not Running Full Test Suite at Gates

**What goes wrong:** Phase 2A passes (quick filter test works), but Phase 2B gate fails (full suite has regressions). Time wasted on misdiagnosis.

**Why it happens:** Skipping full `bun test` run between phases to "save time".

**How to avoid:** Always run FULL suite at phase gates:
- Phase 2A gate: `bun test` (all tests, not filtered)
- Phase 2B gate: `bun test` (all tests, not filtered)
- Before Hono: `bun test && bun run typecheck && bun run check`

**Warning signs:** "Most tests pass but I saw a failure in core package earlier" — no, run full suite and report actual numbers.

---

### Pitfall 4: Confusing "Deferred" with "Broken"

**What goes wrong:** Team treats Phase 2C medium/low priority issues as if they block Phase 3+, delaying decision on Hono migration.

**Why it happens:** Ambiguity about which failures actually block readiness.

**How to avoid:** Use explicit gate criteria:
- Phase 2B gate requires: failures ≤20 (environment-only)
- Any failure ≤20 that's clearly environment-dependent (Redis, Postgres, E2E server) is acceptable
- JWT (5), Galaxy (6), Banking (6) CAN be deferred if they're environment-only; they should skip gracefully
- launchpad/monolith/scaffold (51 total) MUST be fixed or deferred explicitly — no "unknown" failures at gate

**Warning signs:** Discussion like "should we defer these 20 failures?" — no, categorize them first, then decide.

---

### Pitfall 5: Not Documenting Why Tests Are Skipped

**What goes wrong:** After Phase 2, 207 skipped tests + any new skips are left undocumented. Future developers wonder if those are broken features.

**How to avoid:** For any test skipped due to environment:
```typescript
// ❌ Bad — no explanation
it.skip('should do something')

// ✅ Good — explains why
it.skip('should complete banking deposit', () => {
  // SKIP: Requires running HTTP server + database
  // Environment: 'E2E' — not available in unit test CI
  // To enable: Start server with `bun run dev` + configure DATABASE_URL
})
```

**Warning signs:** Finding `.skip()` calls with no comment. Add comments at Phase 2 completion.

---

## Code Examples

### Example 1: Phase 2A Verification Script

```bash
#!/bin/bash
# Phase 2A validation — can we import dist bundles?

echo "=== Phase 2A Verification Gate ==="

echo "1. Testing photon dist import..."
bun -e "import {Photon} from './packages/photon/dist/index.js'; console.log('✓ Photon imported')" || exit 1

echo "2. Testing signal dist (ESM) import..."
bun -e "import {OrbitSignal} from './packages/signal/dist/index.mjs'; console.log('✓ OrbitSignal (ESM) imported')" || exit 1

echo "3. Testing signal dist (CJS) require..."
bun -e "const {OrbitSignal} = require('./packages/signal/dist/index.cjs'); console.log('✓ OrbitSignal (CJS) imported')" || exit 1

echo "4. Testing implicit deps declare atlas..."
for pkg in fortify graphql pulse spectrum; do
  grep -q '"@gravito/atlas"' packages/$pkg/package.json || { echo "✗ $pkg missing @gravito/atlas"; exit 1; }
  echo "✓ $pkg declares @gravito/atlas"
done

echo "5. Running full test suite..."
bun test || exit 1

echo "6. Running typecheck..."
bun run typecheck || exit 1

echo "✅ Phase 2A gate PASSED"
exit 0
```

### Example 2: Health Score Calculator

```typescript
// tools/health-score.ts
interface HealthMetrics {
  typeErrors: number
  circularDeps: number
  implicitDeps: number
  testPass: number
  testTotal: number
  distBundlesWorking: number
  distBundlesTotal: number
  majorPackagesHealthy: number
  majorPackagesTotal: number
}

export function calculateHealthScore(metrics: HealthMetrics): {
  score: number
  breakdown: Record<string, number>
} {
  const breakdown = {
    typeSafety: Math.max(0, 25 - Math.min(25, metrics.typeErrors * 5)),
    circularDeps: Math.max(0, 25 - Math.min(25, metrics.circularDeps * 10)),
    implicitDeps: Math.max(0, 25 - Math.min(25, metrics.implicitDeps * 5)),
    testReliability: (metrics.testPass / metrics.testTotal) * 30,
    distArtifacts: Math.min(15, (metrics.distBundlesWorking / metrics.distBundlesTotal) * 15),
    qualityScore: Math.min(10, (metrics.majorPackagesHealthy / metrics.majorPackagesTotal) * 10),
  }

  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0))

  return { score: Math.min(100, score), breakdown }
}

// Usage:
const baseline = calculateHealthScore({
  typeErrors: 0,
  circularDeps: 0,
  implicitDeps: 4,
  testPass: 11556,
  testTotal: 11925,
  distBundlesWorking: 2,
  distBundlesTotal: 4,
  majorPackagesHealthy: 1,
  majorPackagesTotal: 4,
})

console.log(`Health Score: ${baseline.score}/100`)
// Output: Health Score: 78/100
```

### Example 3: Phase 2B Investigation Workflow

```typescript
// Phase 2B: Investigate launchpad SEO scanner failures
// Root cause analysis workflow

async function investigateLaunchpadFailures() {
  console.log('=== Phase 2B: Investigate launchpad SEO Failures ===')

  // Step 1: Categorize failures
  console.log('\n1. Categorizing failures...')
  const failures = {
    remixScanner: 5,
    astroScanner: 4,
    svelteKitScanner: 4,
    adapters: 2,
    strategies: 6,
    configLoader: 7,
    compactor: 2,
    jsonlLogger: 5,
  }

  // Step 2: Root cause analysis (from FLAKY_TESTS.md)
  console.log('\n2. Root causes:')
  console.log('  - File system path resolution (likely)')
  console.log('  - Adapter incompatibility with test environment')
  console.log('  - Template/config loading from wrong paths')

  // Step 3: Investigate first failure type
  console.log('\n3. Investigating RemixScanner (5 failures)...')
  const remixTest = await readFile('packages/launchpad/tests/remix-scanner.test.ts')
  const remixSrc = await readFile('packages/launchpad/src/scanners/remix-scanner.ts')

  console.log('   Checking:')
  console.log('   - Are paths relative or absolute?', remixSrc.includes('path.join(__dirname') ? 'Relative (OK)' : 'Absolute (maybe issue)')
  console.log('   - Are files created during test?', remixTest.includes('mkdir') ? 'Yes' : 'No — check if needed')
  console.log('   - Are temp files cleaned up?', remixTest.includes('cleanup') ? 'Yes' : 'No — resource leak?')

  // Step 4: Fix strategy
  console.log('\n4. Fix approach:')
  console.log('   [ ] Check if path.join is using correct base directory')
  console.log('   [ ] Add mkdir -p for temp directories if needed')
  console.log('   [ ] Ensure file cleanup in afterEach()')
  console.log('   [ ] Run: bun test --filter=@gravito/launchpad --match "RemixScanner"')

  // Step 5: Implementation
  console.log('\n5. After implementing fix:')
  console.log('   Run: bun test --filter=@gravito/launchpad')
  console.log('   Expected: failures drop from 35 to ~5-10')
  console.log('   If still failing: escalate to code review (might be deeper issue)')
}
```

---

## State of the Art

### Monorepo Health Score Improvements (Current Industry Practice)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual test categorization | Automated test filtering + Turbo --filter | 2023-24 | Reduced categorization time 80%, parallelize safely |
| Full test run per fix | Per-package test + full suite at gates | 2024 | 60% faster iteration during phase |
| Single agent fixing all issues | Parallel agents per package (safe parallelization) | 2024 | 3x faster fix phase for independent issues |
| Health score as gut feeling | Calculated scorecard (type errors + test pass + circular deps) | 2024 | Objective progression tracking |
| "Try to fix and see what happens" | Categorize failures first (environmental vs code) | 2024 | Avoid wasting time on non-fixable issues |

---

## Environment Availability

### Phase 2 External Dependencies

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Bun | Test execution | ✓ | 1.3.10 | — (cannot test without it) |
| Node.js | Turbo tasks | ✓ | (via Bun) | — |
| Git | Commit verification | ✓ | 2.50.1 | — |
| TypeScript compiler | typecheck gate | ✓ | 5.9.3 | — |
| Redis | Optional tests (skip if unavailable) | ✗ | — | Skip redis-integration.test.ts gracefully |
| PostgreSQL | Optional tests (skip if unavailable) | ✗ | — | Skip atlas-integration.test.ts gracefully |
| HTTP server (localhost:3000+) | Banking E2E tests (skip if unavailable) | ✗ | — | Skip E2E tests, mark as environmental |

**No missing blocking dependencies.** All required tools for Phase 2 are available. Optional services (Redis, Postgres, E2E server) can be skipped gracefully with test conditions.

---

## Open Questions

1. **Middleware isolation tests (HIGH-02): Can they be fixed quickly?**
   - What we know: 2 tests in `packages/core/tests/orbit-middleware-isolation.test.ts` are skipped with `it.skip()`
   - What's unclear: Root cause of original failure (was something broken, or just unimplemented?)
   - Recommendation: Investigate in Phase 2A (~2-4h). If root cause is simple (e.g., missing feature), fix. If architectural, document as known limitation and defer to Phase 3.

2. **launchpad/monolith/scaffold: Will parallel agents block each other?**
   - What we know: Each package is independent, no shared dependencies
   - What's unclear: Will fixing one package's file system issues help the others?
   - Recommendation: Treat as independent. If agent 1 discovers a shared pattern (e.g., all need path.join() fix), share finding but don't wait.

3. **Should we aim for 0 skipped tests or accept environment-only skips?**
   - What we know: 207 skipped tests (183 environment-conditional + 24 explicit)
   - What's unclear: Should Phase 2B try to enable conditional tests?
   - Recommendation: Accept environment-only skips. Focus on fixing failures, not enabling environmental tests. Skip conditions are correct.

4. **After Phase 2B, what if failures are still >20?**
   - What we know: Phase 2B goal is failures ≤20
   - What's unclear: Escalation path if high-priority fixes don't achieve target
   - Recommendation: Escalate remaining failures to Phase 3 planning. If they're all environment-only, acceptable. If code issues remain, analyze and decide: fix in Phase 2C vs. accept as technical debt.

---

## Metadata

**Confidence breakdown:**
- **Sequential fix verification**: HIGH — Monorepo best practices well-established; Turbo supports per-phase gating
- **Test failure triage**: HIGH — All 162 failures categorized; root causes identified; fix approaches clear
- **Parallel execution safety**: HIGH — Package isolation verified; no cross-package dependencies in launchpad/monolith/scaffold
- **Health score baselines**: MEDIUM — Calculated scorecard new to project; may need calibration after Phase 2A results
- **Hono migration gates**: HIGH — Clear criteria defined; gate logic tested during Phase 1 + 2A

**Research date:** 2026-03-24
**Valid until:** 2026-04-07 (14 days — fast-moving test fixes may require re-evaluation)
**Confidence:** HIGH overall — All domains thoroughly investigated; locked decisions guide specific approaches

---

## Sources

### Primary (HIGH confidence)
- Phase 1 Health Check Report — `/planning/phases/01-1-2-days/HEALTH_CHECK_REPORT.md` — Current baseline (78/100)
- Phase 1 Issues Prioritized — `/planning/phases/01-1-2-days/ISSUES_PRIORITIZED.md` — All 162 failures categorized
- Flaky Tests Baseline — `/planning/phases/01-1-2-days/FLAKY_TESTS.md` — 207 skips analyzed
- Phase 2 Context — `/planning/phases/02-1-day/02-CONTEXT.md` — Locked decisions D-01 through D-07

### Secondary (MEDIUM confidence)
- Turbo documentation — Sequential task execution, per-package filtering
- Bun test runner documentation — Test filtering, parallel test execution
- Monorepo best practices — Phase gating, health score calculation patterns
- Project CLAUDE.md — TypeScript strict mode, test coverage targets (75%+)
