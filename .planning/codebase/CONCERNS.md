# Codebase Concerns

**Analysis Date:** 2026-03-24

## Overview

Gravito-core is a 59-package monorepo with ~471K lines of TypeScript code. This document identifies known risks, technical debt, and areas requiring careful modification.

---

## Tech Debt

### 1. Implicit Dependencies (4 packages)

**Issue:** Four packages import `@gravito/atlas` but don't declare it in `package.json` dependencies.

**Files:**
- `packages/fortify/src` - imports `@gravito/atlas`
- `packages/graphql/src` - imports `@gravito/atlas`
- `packages/pulse/src` - imports `@gravito/atlas`
- `packages/spectrum/src` - imports `@gravito/atlas`

**Impact:** Tree-shaking failures, missing dependencies in deployments, npm publish errors if consuming code tries to bundle these packages.

**Fix approach:**
```bash
# Verify using dependency scanner
bun run scripts/generate-dependency-graph.ts
# Look for "隱式依賴" (implicit dependencies) section
# Add @gravito/atlas to dependencies in each package's package.json
```

### 2. Large Monolithic Files (>1000 lines)

**Issue:** Several files exceed recommended size thresholds, indicating potential refactoring needs.

**Files with size concerns:**
- `packages/atlas/src/query/QueryBuilder.ts` (1751 lines) - Core query builder, complex state management
- `packages/cli/src/index.ts` (1484 lines) - CLI entry point, likely contains multiple responsibilities
- `packages/atlas/src/orm/model/Model.ts` (1406 lines) - Active Record implementation with mixin pattern
- `packages/dark-matter/src/MongoQueryBuilder.ts` (1286 lines) - MongoDB-specific query builder
- `packages/stream/src/drivers/RedisDriver.ts` (1284 lines) - Redis queue driver with complex state
- `packages/scaffold/src/generators/ddd/CQRSQueryModuleGenerator.ts` (1156 lines) - Code generator
- `packages/scaffold/src/generators/ddd/AdvancedModuleGenerator.ts` (1048 lines) - Code generator
- `packages/resilience/src/priority/EventPriorityQueue.ts` (1045 lines) - Priority queue implementation

**Why it matters:** Large files are harder to maintain, test, and modify safely. They often violate single responsibility principle.

**Fix approach:** Extract concerns into separate files (e.g., clauses, builders, validators) for Query/Model files. Extract generators into smaller pieces.

### 3. @ts-expect-error Usage (139 instances)

**Issue:** 139 instances of `@ts-expect-error` or `@ts-ignore` bypass type safety.

**Common patterns:**
- Test private member access: `packages/monolith/tests/content-cache.test.ts`
- Mock manipulation: `packages/plasma/tests/bun-redis-client.integration.test.ts`
- Bun-specific APIs: `packages/core/src/engine/FastContext.ts`
- Type mismatches in testing: `packages/constellation/tests/i18n.test.ts`

**Most problematic:**
- Most suppressions are in tests (acceptable) but some are in production code
- `packages/fortify/src/services/TwoFactorService.ts` - production code with `@ts-expect-error` for API differences

**Impact:** Type safety gaps, harder to track genuine type issues.

**Fix approach:**
- Audit production code suppressions (not tests)
- Document why each suppression exists
- Consider extracting types for Bun-specific features
- Use proper type definitions instead of suppressions where possible

---

## Circular Dependencies & Dependency Patterns

### Current Status
- **Circular dependencies detected:** 0 (good!)
- **Pre-push validation:** Enabled via git hooks

**Risk areas to monitor:**
- Satellite modules are protected by "no direct imports between satellites" rule enforced in code
- Use event bus (Signal) for cross-satellite communication
- Watch for new workspace dependencies: `@gravito/*` imports in package.json

**Safe modification:**
- Always check dependency graph after adding new workspace dependencies
- Run pre-commit hooks to catch issues early:
  ```bash
  bun run scripts/validate-affected-packages.ts
  ```

---

## Build System Constraints & Edge Cases

### 1. ESM/CJS Build Complexity

**Issue:** Custom ESM/CJS build pipeline with potential for mismatches.

**Critical files:**
- Most packages use custom `build.ts` scripts (not tsup)
- `packages/core/build.ts` (137 lines) - Complex multi-step build with manual workarounds

**Known constraints:**
- ESM file suffix must match `buildCJSStub` third parameter (e.g., `.mjs` vs `.js`)
- Bun-specific builds use `target: 'bun'` which differs from Node targets
- Type declaration output requires directory reorganization after compilation

**Example from packages/core/build.ts:**
```typescript
// ✅ CORRECT: Suffix must match
await buildCJSStub('dist', ['src/index.ts'], 'mjs')  // matches esmNaming: '[name].mjs'

// ❌ WRONG: Mismatch causes bundle failures
await buildCJSStub('dist', ['src/index.ts'], 'js')   // but ESM outputs .mjs
```

**Risk:** If build.ts is modified without understanding suffix alignment, CJS stubs will reference missing ESM files.

**Safe modification:**
```bash
# After changing ESM/CJS naming in any build.ts:
bun run build
bun test  # verify imports resolve correctly
```

### 2. DTS-only Builds

**Issue:** Turbo caching for `build:dts` can mask incremental build failures.

**Pattern:**
- DTS task has separate cache: `build:dts` depends on `^build:dts`
- Type declaration directory structure must match source structure
- Post-build directory reorganization in `packages/core/build.ts` shows complexity

**Risk:** Modified TS files won't rebuild types if cache is stale.

**Safe modification:**
```bash
# Force full rebuild of type declarations
bun run typecheck:full
```

### 3. Bun-Specific Build Targets

**Issue:** Some packages use `target: 'bun'` which breaks if code uses Node APIs.

**Example:** `packages/core/build.ts` line 48 sets `target: 'bun'` for core package using:
- `bun:test`, `bun:sqlite`, `bun:ffi` imports (OK)
- But also uses Node.js `fs/promises` in build script (OK - build script only)

**Risk:** Adding Node-only APIs to core package source will silently fail to bundle.

**Safe modification:**
- Audit any new source imports in core package
- Never use Node-specific modules (`fs`, `path` modules) in core/src
- Use bun built-ins instead: `bun:test`, `bun:sqlite`, `bun:ffi`

### 4. Bun.Tar Availability Check

**Issue:** `packages/core/src/archive.ts` checks for `Bun.Tar` availability at runtime.

**Pattern:**
```typescript
if (!B.Tar) {
  throw new Error('Bun.Tarball is not available')
}
```

**Risk:** Archive functionality is silently disabled if Bun version doesn't have Tar support. No build-time warning.

---

## Performance Bottlenecks

### 1. QueryBuilder N+1 Detection

**Issue:** `packages/atlas/src/query/NPlusOneDetector.ts` attempts to detect N+1 queries at runtime.

**Impact:** Runtime overhead for every query in development. Can be disabled but detection is intrusive.

**Recommendation:** Only enable in development/testing, not production.

### 2. Model Proxy-Based Smart Guard

**Issue:** `packages/atlas/src/orm/model/Model.ts` uses JavaScript Proxy to intercept all property access for lazy-loaded relationships.

**Impact:** Every property access goes through proxy handler - measurable overhead for tight loops.

**Consider:**
- Only use Proxy for relationships, not basic attributes
- Consider eager loading optimization in QueryBuilder
- Watch performance in high-throughput scenarios

### 3. Event Priority Queue (1045 lines)

**Issue:** `packages/resilience/src/priority/EventPriorityQueue.ts` implements custom priority queue with complex state management.

**Risk:** Priority calculations could degrade in high-volume scenarios. No benchmarks visible.

**Recommendation:** Profile with real-world event volumes before using in production at scale.

### 4. Kafka Driver Complexity (1097 lines)

**Issue:** `packages/stream/src/drivers/kafka/KafkaDriver.ts` is large and handles:
- Consumer groups
- Partition balancing
- Error recovery
- Batch processing

**Risk:** Performance under high throughput not well documented. Complex state transitions.

---

## Security Considerations

### 1. Redis EVAL Commands

**Issue:** `packages/plasma/src/clients/BunRedisClient.ts` exposes Redis `eval()` and `evalsha()` for Lua scripts.

**Risk:** If user input flows to these methods unchecked, it could execute arbitrary Redis commands.

**Files:**
- `packages/plasma/src/clients/BunRedisClient.ts` - lines with `eval()` and `evalsha()` methods
- `packages/plasma/tests/helpers/redis-client.test-helpers.ts` - mocked in tests

**Safe modification:**
- Always sanitize script parameters
- Limit script execution to allowed scripts only
- Never concatenate user input into Lua scripts
- Document this in API docs as a security boundary

### 2. QueryBuilder Expression Parsing

**Issue:** `packages/atlas/src/query/Expression.ts` parses expressions that could be user-provided.

**Risk:** SQL injection if raw user input is compiled into expressions.

**Safe modification:**
- Always use parameter binding in QueryBuilder
- Never use raw() with unsanitized input
- Validate column/table names against schema

### 3. Implicit Dependencies on Package Load

**Issue:** Several packages load optional dependencies that might not be declared.

**Example:** `packages/spectrum/src` imports `@gravito/atlas` but it's not in dependencies.

**Risk:** Missing optional dependency could silently fail at runtime.

**Safe modification:**
- Audit import chains for missing `peerDependencies` declarations
- Add explicit dependency declarations for all imports
- Document optional vs required features

### 4. Environment Configuration

**Issue:** No `.env` parsing validation visible in codebase scan.

**Risk:** Missing or invalid env vars could cause silent failures.

**Recommendation:** Add validation at application startup using zod or similar schema validator.

---

## Type Checking Strictness Issues

### 1. Unused Parameters Warnings

**Issue:** TypeScript `noUnusedParameters: true` is enabled, but some code has legitimate unused params (callbacks, overrides).

**Risk:** Easy to accidentally use suppress instead of fixing. Currently clean but needs vigilance.

**Safe modification:**
- Use explicit `_param` naming for intentionally unused parameters
- Or add eslint-disable-next-line comments
- Never use generic suppressions

### 2. Bun-Specific Type Gaps

**Issue:** Some Bun APIs don't have perfect type coverage.

**Examples:**
- `packages/core/src/engine/FastContext.ts` has `@ts-expect-error` for Bun/Fetch-specific properties
- Bun.Tar availability checks are runtime-only, no build-time flag

**Risk:** Type safety gaps when using cutting-edge Bun features.

**Safe modification:**
- Keep detailed comments for every `@ts-expect-error`
- Track Bun version requirements in package.json
- Test Bun-specific code with multiple Bun versions

---

## Scalability Limitations

### 1. Monorepo Package Count (59 packages)

**Issue:** 59 packages create interdependency complexity.

**Limits:**
- Turbo build can cascade: changing core impacts ~20 dependent packages
- Type checking takes longer with each package
- Pre-push validation checks all affected packages

**Impact:** Development velocity decreases as monorepo grows.

**Risk areas:**
- Adding new shared utilities to core package affects many dependents
- Breaking changes in frequently-used packages have wide impact

### 2. Database Connection Pooling

**Issue:** `packages/atlas/src` doesn't show explicit connection pool size limits.

**Risk:** High-concurrency scenarios might exhaust connections without backpressure.

### 3. Stream/Queue Batch Processing

**Issue:** `packages/stream/src/drivers/` support batching but batch size limits not enforced at package boundaries.

**Risk:** Memory exhaustion if batch size grows unbounded.

---

## Known Flaky Tests & Reliability Issues

### 1. Skipped Test Suites

**Issue:** Two test suites are skipped in core package:

**Location:** `packages/core/tests/orbit-middleware-isolation.test.ts`
```typescript
it.skip('should successfully mount and route to an Orbit', async () => {
it.skip('should isolate middleware between different Orbits', async () => {
```

**Risk:** Middleware isolation might be broken without anyone knowing. These tests are critical.

**Action required:** Investigate why tests are skipped and fix before shipping.

### 2. Conditional Integration Tests

**Issue:** Multiple integration test suites use `describe.skipIf()` based on environment conditions:

**Locations:**
- `packages/core/tests/reliability/integration/dlq-*.integration.test.ts` (6 suites)
- `packages/core/tests/events/observability/tracing-integration.test.ts`
- `packages/flux/tests/postgresql-storage.test.ts`

**Risk:** Features might silently break if integration environment isn't set up. No CI validation.

**Safe modification:**
- Document environment requirements clearly
- Add CI step to verify integration tests run
- Don't skip critical path tests without clear reason

### 3. Test Timeout Configuration

**Issue:** Many packages set `timeout: 10000` globally for tests.

**Files:**
- `packages/stream/package.json` line 29: `"test": "bun test --timeout=10000"`
- Integration tests need longer timeouts

**Risk:** Flaky tests on slow systems. No per-test timeout overrides visible.

**Safe modification:**
- Use conservative global timeout (30000ms for integration tests)
- Document which tests need special timing

---

## Architectural Fragility

### 1. Model Relationship Circular Dependency Prevention

**Issue:** `packages/atlas/src/orm/model/Model.ts` uses static `relationshipResolver` to avoid circular requires.

**Pattern:**
```typescript
public static relationshipResolver?: RelationshipResolver
```

**Risk:** Global mutable state. If not initialized correctly, relationships break silently.

**Safe modification:**
- Verify relationshipResolver is initialized before any Model.create() calls
- Add assertions for resolver existence
- Document initialization order requirement

### 2. DirtyTracker State Management

**Issue:** `packages/atlas/src/orm/model/DirtyTracker.ts` tracks field changes for partial updates.

**Risk:** If DirtyTracker doesn't initialize correctly, all fields update even if unchanged (extra DB queries).

**Safe modification:**
- Test DirtyTracker with partial attribute updates
- Verify dirty flag resets after save/update

### 3. Mixin-Based Architecture

**Issue:** Model class uses mixins (concerns): `HasEvents`, `HasPersistence`, `HasRelationships`, `HasSerialization`

**Pattern in Model.ts:**
```typescript
import {
  applyMixins,
  HasEvents,
  HasPersistence,
  // ...
}
```

**Risk:** Complex inheritance chain makes debugging hard. Method resolution order not obvious.

**Safe modification:**
- Document mixin interaction order
- Avoid adding circular logic between mixins
- Test all mixin combinations

### 4. Grammar-Based Query Compilation

**Issue:** `packages/atlas/src/grammar/Grammar.ts` (991 lines) is the single point of SQL compilation.

**Risk:** Bug in Grammar affects all queries across all databases.

**Safe modification:**
- Any Grammar changes need extensive testing
- Test against multiple database backends
- Never deploy Grammar changes without full test suite passing

---

## Version Management Issues

### 1. Multiple Packages Pending Release

**Issue:** `bun run version:check` shows 54+ packages ready for publish with `✨ NEW VERSION` status.

**Risk:**
- Publishing out-of-order could break dependency constraints
- Changesets not yet versioned - unclear what changed
- High risk of release issues with this many packages simultaneously

**Safe modification:**
- Use proper changesets workflow
- Test all packages together before release
- Consider releasing in dependency order (core → services → features)

### 2. Three Packages Not Versioned

**Issue:** Three packages show `⚠️ EXISTS` status (no version bump):
- `@gravito/freeze-vue` - v1.0.0
- `@gravito/luminosity-adapter-express` - v1.0.2
- `@gravito/luminosity-cli` - v1.0.2

**Risk:** These might have been forgotten or are intentionally frozen. Unclear.

**Safe modification:**
- Verify these packages haven't been modified recently
- If modified, update versions
- Document why some packages are frozen

---

## Validation & Input Sanitization

### Issue: No Visible Input Validation Framework

**Risk:** If validating user input, errors could silently fail or allow bad data.

**Safe modification:**
- Add explicit validation schema (zod) to all controllers
- Log validation failures
- Reject invalid input with clear error messages

---

## Documentation & Knowledge Gaps

### 1. Missing Architecture Decisions

**Issue:** Large files like QueryBuilder (1751 lines) lack design documentation.

**Risk:** Maintainers don't understand design intent, creating fragile patches.

**Recommendation:**
- Add architecture.md for complex packages
- Document why large files exist and how to safely modify them

### 2. Missing Performance Baselines

**Issue:** No visible performance benchmarks for queue systems, query builders, or event processing.

**Risk:** Can't detect regressions. Changes might silently degrade performance.

### 3. Missing Deployment Runbook

**Issue:** 59+ packages need coordinated deployment but no runbook visible.

**Risk:** Complex deployments might fail without clear rollback procedure.

---

## Dependency Risk Matrix

### High-Risk Dependencies
- **@aws-sdk/client-sqs** - AWS-specific, hard to mock in tests
- **ioredis** - Complex async state, potential for connection leaks
- **kafka-js** - Complex distributed system, timeout issues common

### Medium-Risk Dependencies
- **@apollo/client** - GraphQL client, breaking changes between versions
- **valibot** - Form validation, tight coupling to request structure

### External API Risk
- Any integration with external APIs (`@gravito/photon` was Hono-based HTTP, now being migrated)
- Webhook receivers need rate limiting and timeout protection

---

## Test Coverage Gaps

### 1. Integration Tests Conditional

**Issue:** Critical integration tests are conditional on environment setup.

**Files:**
- All `*.integration.test.ts` in core package
- Postgres-specific tests in flux package

**Gap:** No guarantee these tests run in CI.

### 2. E2E Tests Unknown

**Issue:** No visible E2E test files (*.e2e.test.ts, *.e2e.spec.ts).

**Risk:** User workflows might be broken without detection.

### 3. Coverage Thresholds

**Issue:** No visible coverage enforcement. Some packages might have <50% coverage.

**Safe modification:**
- Set minimum 75% coverage enforcement
- Identify low-coverage packages
- Add tests before shipping new features

---

## Migration & Deprecation

### 1. Hono Dependency Removal (In Progress)

**Issue:** Recent commits show Hono removal phase 2-3 completed.

**Status:** `photon` package being migrated away from Hono to native Bun HTTP.

**Risk areas:**
- Any code still importing from old Hono-based photon might break
- Middleware API might have changed
- Route registration patterns differ

**Safe modification:**
- Audit all imports from `@gravito/photon`
- Test native HTTP handlers thoroughly
- Document migration guide for users

### 2. Admin Packages Extraction

**Issue:** Admin-* packages already extracted to separate repo (gravito-dev-env/gravito-admin).

**Risk:** If code in core still references admin packages, it will fail.

**Safe modification:**
- Verify no imports of admin-* packages remain in core packages
- Update documentation to point to gravito-admin repo

---

## Recommendation Summary

| Priority | Area | Action |
|----------|------|--------|
| **CRITICAL** | Implicit dependencies | Add @gravito/atlas to 4 packages immediately |
| **HIGH** | Skipped middleware tests | Fix and re-enable orbit-middleware-isolation tests |
| **HIGH** | Integration test coverage | Ensure all integration tests run in CI pipeline |
| **MEDIUM** | Large files (>1000 lines) | Plan refactoring of 8+ large files |
| **MEDIUM** | @ts-expect-error audit | Document and minimize production code suppressions |
| **MEDIUM** | Build suffix alignment | Add validation to prevent ESM/CJS mismatch |
| **LOW** | Documentation | Add architecture docs for complex packages |

---

*Concerns analysis: 2026-03-24*
