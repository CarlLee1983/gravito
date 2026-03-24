# Prioritized Issues List

**Generated:** 2026-03-24
**Source:** Phase 1 Health Check Scan

---

## Issue Matrix

| Priority | Package | Issue | Impact |
|----------|---------|-------|--------|
| 🔴 C | photon | `dist/index.js` bundle error — "Photon not declared" | npm publish fails, consumers can't import |
| 🔴 C | signal | MJS/CJS bundle broken — lazy-load OrbitSignal fails | Event bus unusable from dist |
| 🟡 H | fortify | Implicit `@gravito/atlas` dependency undeclared | Deployment failures, tree-shaking break |
| 🟡 H | graphql | Implicit `@gravito/atlas` dependency undeclared | Deployment failures |
| 🟡 H | pulse | Implicit `@gravito/atlas` dependency undeclared | Deployment failures |
| 🟡 H | spectrum | Implicit `@gravito/atlas` dependency undeclared | Deployment failures |
| 🟡 H | core | Orbit middleware isolation tests skipped | Middleware isolation unverified |
| 🟡 H | multiple | 162 test failures across packages | Reliability unknown |
| 🟡 H | atlas | BunSQLDriver.ts has 10 @ts-expect-error | Type safety gaps in core ORM |
| 🟡 H | launchpad | SEO route scanners failing (35 tests) | SEO tooling broken |
| 🟡 H | monolith | JsonlLogger/Compactor/LogRotator failing (21 tests) | Logging infrastructure issues |
| 🟡 H | scaffold | ModuleGenerator/StubGenerator/BaseGenerator failing (15 tests) | Code scaffolding broken |
| 🟡 H | multiple | Banking CQRS E2E timeouts (6 tests) | Example app broken |
| 🟡 H | atlas | Integration tests failing (13 tests) | DB operations unverified |
| 🟡 M | jwt | JWT module 5 test failures | Authentication reliability |
| 🟡 M | galaxy | Showcase integration tests failing (6) | Example/showcase broken |
| 🟢 L | freeze-react | StaticLink component failing (9 tests) | React UI component issues |
| 🟢 L | flare | CSRF helpers 2 failures | CSRF protection edge cases |
| 🟢 L | core | 22 production @ts-expect-error suppressions | Type safety technical debt |
| 🟢 L | multiple | 207 skipped tests | Coverage gaps |

---

## Critical Issues (🔴 — Block Publishing)

### CRIT-01: @gravito/photon dist/index.js Bundle Error

**Package:** `@gravito/photon`
**Error:** `"Photon" is not declared in this file` at line 58 of dist/index.js
**Root Cause:** Likely incomplete rebuild after Hono migration (Phase 2-3)
**Fix:** Run `bun run build` in photon package to regenerate dist
**Estimated effort:** 15 minutes
**Verify:** `bun -e "import * as p from './packages/photon/dist/index.js'"`

### CRIT-02: @gravito/signal ESM/CJS Bundle Broken

**Package:** `@gravito/signal`
**Error (MJS):** "VueMjmlRenderer", "TypedMailable", "TemplateRenderer" not declared
**Error (CJS):** `import_OrbitSignal is not defined` — lazy-load reference broken
**Root Cause:** Signal package build artifacts are stale/incomplete
**Fix:** Run `bun run build` in signal package
**Estimated effort:** 15 minutes
**Verify:** `bun -e "import {OrbitSignal} from './packages/signal/dist/index.mjs'"`

---

## High Priority Issues (🟡 — Fix Before Release)

### HIGH-01: Implicit Atlas Dependencies (4 packages)

**Packages:** fortify, graphql, pulse, spectrum
**Issue:** Import `@gravito/atlas` in source but `package.json` has no dependency declaration
**Fix:** Add `"@gravito/atlas": "workspace:*"` to each package's dependencies
**Estimated effort:** 30 minutes

```bash
# For each package in [fortify, graphql, pulse, spectrum]:
bun add @gravito/atlas --cwd packages/<name>
```

### HIGH-02: Orbit Middleware Isolation Tests Skipped

**Package:** `@gravito/core`
**File:** `packages/core/tests/orbit-middleware-isolation.test.ts`
**Issue:** Two critical middleware isolation tests are skipped with `it.skip()`
**Risk:** Middleware isolation may be broken without detection
**Fix:** Investigate why tests are skipped, fix underlying issue, re-enable
**Estimated effort:** 2-4 hours

### HIGH-03: launchpad SEO Route Scanners (35 failures)

**Package:** `@gravito/launchpad`
**Failing:** RemixScanner, AstroScanner, SvelteKitScanner, Scanner adapters, Strategies, ConfigLoader
**Impact:** SEO route scanning tooling broken
**Investigation needed:** Check what file system operations these tests require

### HIGH-04: monolith Logging Infrastructure (21 failures)

**Package:** `@gravito/monolith`
**Failing:** JsonlLogger, Compactor, LogRotator
**Impact:** Logging infrastructure has implementation bugs
**Investigation needed:** FileSystem adapter compatibility

### HIGH-05: scaffold Code Generators (15 failures)

**Package:** `@gravito/scaffold`
**Failing:** ModuleGenerator, StubGenerator, BaseGenerator
**Impact:** Code scaffolding tooling broken
**Investigation needed:** File path or permission issues in generators

### HIGH-06: Atlas DB Integration Tests (13 failures)

**Package:** `@gravito/atlas`
**Failing:** AtlasAccountRepository, AtlasTransactionRepository integration tests
**Note:** These likely require a running database — may be expected skips
**Action:** Verify if test environment has DB configured; add skip conditions if intentional

---

## Medium Priority Issues (🟡 — Fix in Current Sprint)

### MED-01: JWT Module Failures (5 tests)

**Issue:** JWT signing, verification, middleware all failing
**Packages likely affected:** Authentication flows in production apps
**Investigation:** Check JWT dependency version, secret configuration

### MED-02: Galaxy Showcase Integration (6 failures)

**Package:** example/showcase
**Issue:** Service container resolution failures
**Impact:** Showcase/demo app broken

---

## Low Priority Issues (🟢 — Track and Defer)

### LOW-01: StaticLink React Component (9 failures)

**Package:** freeze-react
**Impact:** React component library has rendering issues

### LOW-02: CSRF Helpers (2 failures)

**Package:** flare/security
**Impact:** Edge cases in CSRF protection

### LOW-03: Production @ts-expect-error (22 suppressions)

**Impact:** Type safety technical debt, harder to catch real type errors

### LOW-04: 207 Skipped Tests

**Impact:** Coverage gaps in integration scenarios

---

## Recommended Fix Order

1. **Immediate (today):** CRIT-01, CRIT-02 — Rebuild photon and signal (30 min total)
2. **Day 1:** HIGH-01 — Fix implicit atlas dependencies (30 min)
3. **Day 1:** HIGH-02 — Investigate middleware isolation tests (2-4 hours)
4. **Day 2:** HIGH-03, HIGH-04, HIGH-05 — Investigate route scanners, logging, generators
5. **Day 2:** HIGH-06, MED-01, MED-02 — Atlas integration, JWT, showcase
6. **Week 1:** LOW-01 through LOW-04

*Issues prioritized: 2026-03-24*
