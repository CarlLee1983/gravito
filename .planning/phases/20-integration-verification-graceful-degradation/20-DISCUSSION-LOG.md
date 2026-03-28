# Phase 20: Integration Verification & Graceful Degradation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 20-integration-verification-graceful-degradation
**Areas discussed:** Version Bump Strategy, OrbitDegradationManager API, Satellite Integration Testing, Migration Guide

---

## Version Bump Strategy

### Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Only 38 modified packages | Only packages actually modified in Phase 16-19 get major bump. Unmodified packages keep current version. | ✓ |
| All ~50 Orbit packages unified | Including unmodified packages bump to 2.0.0 for ecosystem consistency. | |
| Tiered bumps | core/resilience get major, affected Orbits get minor, unchanged stay. | |

**User's choice:** Only 38 modified packages
**Notes:** Most honest reflection of actual changes.

### Format

| Option | Description | Selected |
|--------|-------------|----------|
| Unified 2.0.0 | All 38 modified packages to 2.0.0, aligned with milestone. Would downgrade packages already at 3.x/4.x. | |
| Each major +1 | Each package's major version +1 independently (signal 3→4, photon 1→2). Follows semver. | ✓ |
| Cross-repo alignment | Align with gravito-dev-env satellite versions. | |

**User's choice:** Each major +1
**Notes:** Follows semver semantics — each package evolves independently.

### Dependency Handling

| Option | Description | Selected |
|--------|-------------|----------|
| workspace:* unchanged | Keep workspace:* protocol, only bump version field. | |
| Sync all peerDeps ranges | Update peerDependencies to reference new major ranges (e.g., ^3.0.0). | ✓ |

**User's choice:** Sync all peerDeps ranges
**Notes:** Ensures correct version ranges for npm publish.

---

## OrbitDegradationManager API

### Package Location

| Option | Description | Selected |
|--------|-------------|----------|
| @gravito/resilience | Natural extension of withResilience/CircuitOpenException. No new package. | ✓ |
| @gravito/core | Core package, accessible to all. But core doesn't depend on cockatiel. | |
| New @gravito/degradation | Independent package. Clean separation but more package overhead. | |

**User's choice:** @gravito/resilience
**Notes:** Natural home alongside existing resilience primitives.

### Fallback API Design

| Option | Description | Selected |
|--------|-------------|----------|
| DegradedResult<T> | execute() returns { value, degraded, source }. Type-safe, caller distinguishes normal/degraded. | ✓ |
| Callback pattern | withDegradation(fn, { onDegraded }). Simpler but caller can't distinguish results. | |
| Result<T> monad | Result.ok() or Result.degraded(). Powerful but changes all call sites. | |

**User's choice:** DegradedResult<T>
**Notes:** Type-safe discrimination between normal and degraded results.

### Test Environment Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Throw CircuitOpenException | Skip fallback in NODE_ENV=test. Consistent with Phase 17 decision. | ✓ |
| Configurable throwInTest flag | Default throw, allow explicit override. | |

**User's choice:** Throw CircuitOpenException directly
**Notes:** Maintains Phase 17 principle — tests must not silently degrade.

---

## Satellite Integration Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Contract tests in this repo | Verify API signatures, error compat, event protocols without cross-repo deps. | ✓ |
| Cross-repo testing | Clone gravito-dev-env, run full Satellite suites. Most complete but complex. | |
| Defer verification | Note for post-publish verification. | |

**User's choice:** Contract tests in this repo
**Notes:** Sufficient for v2.0.0 release confidence without cross-repo complexity.

---

## Migration Guide

| Option | Description | Selected |
|--------|-------------|----------|
| docs/migration/v2.0.0.md | Standard location in docs/, Markdown format. | ✓ |
| MIGRATION.md at repo root | More visible but clutters root with multiple versions. | |
| Claude decides | Flexible placement with required content. | |

**User's choice:** docs/migration/v2.0.0.md
**Notes:** Clean location that scales for future versions.

---

## Claude's Discretion

- OrbitDegradationManager internal implementation details
- Contract test structure and assertions
- Migration guide formatting and example depth
- Version bump automation approach
- Phase execution order

## Deferred Ideas

None — discussion stayed within phase scope.
