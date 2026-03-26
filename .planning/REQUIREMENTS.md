---
milestone: v1.4.0
title: Documentation Enhancement — JSDoc Coverage
focus: Core & Signal Package Documentation
timeline: 1 week (2026-03-27 to 2026-04-02)
status: active
---

# v1.4.0 Requirements — JSDoc Coverage Enhancement

**Milestone:** v1.4.0 - Documentation Enhancement
**Duration:** 1 week (2026-03-27 to 2026-04-02)
**Focus:** Improve JSDoc coverage in Core + Signal packages to 90%+
**Status:** ACTIVE

## Problem Statement

v1.3.10 audit identified documentation gaps:
- **Core package:** 27% JSDoc coverage (11 undocumented exports) — PRIMARY GAP
- **Signal package:** 60% JSDoc coverage (~5 undocumented exports) — SECONDARY GAP
- **Photon package:** 100% JSDoc coverage ✅ (benchmark for quality)

This gap impacts:
- **New developer onboarding** — Unclear API purpose/usage
- **IDE autocomplete** — Incomplete type hints in editors
- **Type safety** — Missing parameter/return type documentation
- **Maintenance** — Undocumented design decisions

## Core Requirements

### R-1: @gravito/core JSDoc Coverage
- [x] **Target:** Increase JSDoc coverage from 27% → 90%+ (minimum 10 of 11 undocumented exports)
- [x] **Scope:** Document all public exports (types, interfaces, functions, classes, constants)
- [x] **Quality Bar:** Match Photon JSDoc style (descriptions + @param/@returns + @example where applicable)
- [x] **Validation:** Automated JSDoc coverage measurement (typedoc/tsc)

**Deliverables:**
- All public exports have JSDoc blocks with:
  - Brief description (1-2 sentences)
  - @param/@returns tags (if applicable)
  - @example tag (for complex utilities)
  - Type references (where helpful)

### R-2: @gravito/signal JSDoc Coverage
- [x] **Target:** Increase JSDoc coverage from 60% → 90%+ (minimum 4 of 5 undocumented exports)
- [x] **Scope:** Document remaining undocumented exports
- [x] **Quality Bar:** Consistent with Core improvements
- [x] **Validation:** Automated coverage measurement

**Deliverables:**
- All public exports have complete JSDoc blocks
- Consistency with Core package patterns

### R-3: Quality & Consistency Standards
- [x] **Use Photon as benchmark:** 100% coverage, clear descriptions, practical examples
- [x] **Type safety:** Proper @param/@returns with type annotations
- [x] **Practical examples:** @example tags for non-trivial functions
- [x] **Cross-references:** @see tags linking related modules
- [x] **Deprecation notices:** @deprecated tags where applicable (e.g., Hono-related exports)

### R-4: Verification & Audit
- [x] **Automated measurement:** Script to verify coverage (target ≥90%)
- [x] **Manual review:** Sample 50% of documented exports for quality
- [x] **Type accuracy:** Validate @param/@returns types match source
- [x] **Link checking:** Verify @see cross-references are valid
- [x] **Report:** Coverage report + before/after metrics

## Success Criteria

✅ **All of the following must be true:**

1. **Core package:** ≥90% JSDoc coverage (at least 10 of 11 exports documented)
2. **Signal package:** ≥90% JSDoc coverage (at least 4 of 5 exports documented)
3. **Quality:** 100% of new JSDoc blocks have descriptions + types
4. **Consistency:** All blocks follow Photon style guide (no variations)
5. **Type safety:** @param/@returns types match actual signatures
6. **Examples:** Complex functions have @example tags
7. **Verification:** Automated coverage script confirms ≥90%
8. **Testing:** 0 TypeScript errors, test suite passes (99.7%+)

## Scope

### In Scope ✅
- JSDoc blocks for all public exports (types, functions, classes, interfaces)
- @param/@returns documentation with proper types
- @example tags for utilities and non-trivial functions
- Quality audit and coverage measurement
- README updates if needed to reference new documentation

### Out of Scope ❌
- Obsidian vault setup (deferred to v1.5.0)
- Example improvements (deferred to v1.5.0)
- API reference generation (deferred to v1.5.0)
- Internal/private export documentation (only public API)
- Full refactoring of existing JSDoc (only gaps)

## Assumptions

- **Photon package JSDoc quality** is the target standard (100% coverage, clear + concise)
- **JSDoc coverage tool** can be measured with typedoc or similar automation
- **No breaking changes** to Core/Signal APIs (documentation-only)
- **Type system is stable** (no major type rewrites needed)

## Dependencies

- ✓ v1.3.10 milestone complete (framework stable)
- ✓ 0 TypeScript errors maintained
- ✓ 99.7%+ test pass rate maintained
- ✓ No API changes (documentation only)

## Timeline Estimate

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | 3 days | Core package (27% → 90%) |
| Phase 2 | 2 days | Signal package (60% → 90%) |
| Phase 3 | 1 day | Verification, audit, reporting |
| **Total** | **~1 week** | **90%+ coverage + quality audit** |

## Recommendations for Future Milestones

**v1.5.0 (After JSDoc completion):**
- Obsidian vault setup + cross-linking
- Example improvements for Core/Signal
- API reference generation from JSDoc
- Other packages (Atlas, Stream, Event, etc.)

---

**Framework Status:** STABLE, PRODUCTION-READY (v1.3.10 baseline maintained)

**Last updated:** 2026-03-27
**Next phase:** Phase 1 execution starts with /gsd:plan-phase 1
