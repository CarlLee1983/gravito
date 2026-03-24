# Next Steps & Recommendations

**Generated:** 2026-03-24
**Based on:** Phase 1 Health Check Results

---

## Current State Summary

Gravito-core is in a **functional but imperfect state**:
- Core framework (core, atlas) is healthy
- HTTP (photon) and event bus (signal) have dist bundle issues
- ~3% of tests failing across peripheral packages
- 4 packages have implicit dependency declarations missing

---

## Immediate Actions (Before Any Other Work)

### 1. Rebuild Photon and Signal Packages

**Why:** dist bundles are broken — consumers cannot import from npm
**How:**
```bash
bun run build --filter=@gravito/photon
bun run build --filter=@gravito/signal
# Verify:
bun -e "import * as p from './packages/photon/dist/index.js'; console.log(Object.keys(p)[0])"
bun -e "import * as s from './packages/signal/dist/index.mjs'; console.log(Object.keys(s)[0])"
```
**Estimated time:** 30 minutes

### 2. Fix Implicit Atlas Dependencies

**Why:** 4 packages will fail in isolated environments or npm publish
**How:**
```bash
for pkg in fortify graphql pulse spectrum; do
  # Add to package.json dependencies section:
  # "@gravito/atlas": "workspace:*"
  echo "Fix $pkg/package.json"
done
```
**Estimated time:** 30 minutes

---

## Decision Points

### Decision A: Should we enter Phase 2 (Fix Critical) now?

**Recommendation: YES** — Fix the 2 critical issues (photon/signal builds) before doing anything else.

**Rationale:**
- These are 30-minute fixes, not architectural changes
- They directly impact npm publish capability
- All other work depends on stable dist artifacts

### Decision B: Proceed with Hono Migration Phase 4-5?

**Recommendation: WAIT** — Complete Phase 1 fixes first.

**Current state of Hono migration:**
- Phase 2-3 completed (commit 5843541c)
- Photon/Signal dist broken — could be caused by or related to incomplete migration
- Fix dist artifacts first, then assess Phase 4-5

**Risk if proceeding now:** May be building on broken foundation.

### Decision C: Parallel Fix High-Priority Issues?

**Recommendation: PARTIALLY** — Some issues can be fixed in parallel:
- Implicit atlas dependencies (simple package.json edits) — parallel safe
- Middleware isolation investigation — requires deeper focus
- launchpad/monolith/scaffold — can be parallel with separate agents

---

## Phase 2 Scope Recommendation

Based on health check findings, Phase 2 should focus on:

### Phase 2A: Critical Fixes (Day 1-2, ~4 hours)

1. Rebuild photon, signal dist artifacts
2. Fix 4 implicit atlas dependencies
3. Investigate and re-enable orbit middleware isolation tests
4. Verify all fixes pass `bun test && bun run typecheck`

### Phase 2B: High Priority Fixes (Day 3-5, ~8 hours)

1. Fix launchpad SEO route scanners (35 failures)
2. Fix monolith logging infrastructure (21 failures)
3. Fix scaffold code generators (15 failures)
4. Verify atlas integration test environment configuration

### Phase 2C: Medium Priority (Week 2)

1. JWT module investigation and fix
2. Galaxy showcase integration tests
3. Banking CQRS E2E test environment setup

---

## Risk Assessment for Proceeding to Hono Migration (Phase 3)

| Risk | Level | Mitigation |
|------|-------|-----------|
| Photon/Signal dist broken | 🔴 Critical | Fix builds first |
| 162 test failures | 🟡 High | Fix before migration adds more |
| Implicit deps | 🟡 High | Fix before publish |
| Middleware isolation untested | 🟡 High | Fix and verify |

**Conclusion:** Do NOT proceed to Hono Phase 4-5 until Phase 2A is complete.

---

## Metrics to Track in Phase 2

| Metric | Current | Target |
|--------|---------|--------|
| Test failures | 162 | ≤ 20 (environment-only) |
| Implicit dependencies | 4 | 0 |
| Dist bundle errors | 2 packages | 0 |
| Skipped critical tests | 2 | 0 |
| @ts-expect-error (production) | 22 | ≤ 15 |

---

## Longer-Term Recommendations

1. **Add CI gate for dist artifacts** — build check in CI pipeline
2. **Add implicit dependency check to CI** — run dependency graph check
3. **Enable integration tests in CI** — require Redis/Kafka/Postgres environment
4. **Add coverage enforcement** — minimum 75% per package
5. **Document build expectations** — each package's expected dist structure

---

*Recommendations: 2026-03-24*
*Next review trigger: When Phase 2A is complete*
