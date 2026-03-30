---
phase: 23-named-export-conversion
plan: 02
subsystem: api
tags: [typescript, exports, barrel, core, dx, browser]

# Dependency graph
requires:
  - phase: 23-01
    provides: "packages/core/src/index.ts with 6 star exports replaced by explicit named export lists; setApp removed; /tmp/core-exports-before.txt baseline"
provides:
  - "packages/core/src/index.browser.ts with helper star exports replaced by explicit named export blocks matching index.ts"
  - "setApp removed from both index.ts and index.browser.ts (MOD-02, MOD-03 complete)"
  - "d.ts diff verified: zero symbols accidentally removed; only setApp intentionally removed"
affects: [23-named-export-conversion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Browser barrel mirrors main barrel for shared helper surfaces (helpers/data, helpers/errors, helpers/response)"
    - "Browser-specific star exports (events, runtime/index.browser) preserved as-is"

key-files:
  created: []
  modified:
    - packages/core/src/index.browser.ts

key-decisions:
  - "Browser barrel helper exports converted to named exports to match main barrel per D-03"
  - "setApp removed from index.browser.ts per D-02 (matches removal in index.ts from Plan 01)"
  - "events and runtime/index.browser star exports intentionally preserved (browser-specific, no named equivalents needed)"
  - "Exception files synced from main branch to worktree to enable d.ts diff verification"

patterns-established:
  - "Named export parity: index.browser.ts helper surfaces must match index.ts helper surfaces"

requirements-completed: [MOD-03]

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 23 Plan 02: Named Export Conversion Summary

**index.browser.ts synced with index.ts: 3 helper star exports converted to named export blocks; setApp removed; d.ts diff confirms zero accidental symbol loss**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T00:10:00Z
- **Completed:** 2026-03-30T00:25:00Z
- **Tasks:** 2
- **Files modified:** 1 (plus worktree setup)

## Accomplishments

- Replaced `export * from './helpers/data'` with `export { dataGet, dataHas, dataSet, type DataPath, type PathSegment }` in index.browser.ts
- Replaced `export * from './helpers/errors'` with `export { createErrorBag, type ErrorBag, errors, old }` in index.browser.ts
- Replaced `export * from './helpers/response'` with `export { type ApiFailure, type ApiSuccess, fail, jsonFail, jsonSuccess, ok }` in index.browser.ts
- Removed `setApp` from the helpers export block in index.browser.ts
- Preserved browser-specific star exports: `export * from './events'` and `export * from './runtime/index.browser'`
- d.ts diff verified: only `setApp` removed from symbol surface, zero accidental symbol loss
- `@gravito/core` typecheck exits 0 with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert browser barrel helper exports and remove setApp** - `0345d73d` (feat)
2. **Task 2: d.ts diff verification and workspace typecheck** - no new commit (verification-only, previous commits contain all work)

**Worktree setup commits:**
- `1c52726a` - Cherry-pick Plan 01 index.ts changes to worktree branch
- `adfc96d8` - Sync exception hierarchy from main for typecheck verification

## Files Created/Modified

- `packages/core/src/index.browser.ts` - 3 helper star exports replaced with named export blocks; setApp removed from helpers block

## Decisions Made

- Browser star exports for `events` and `runtime/index.browser` are intentionally preserved (browser-specific, distinct from main barrel surface)
- Exception files needed to be synced from main branch into worktree to allow d.ts compilation for verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Synced exception hierarchy files from main branch into worktree**
- **Found during:** Task 2 (d.ts diff verification)
- **Issue:** This worktree branch was created from an older commit (aaf2b6ec) before phase 22 added AuthException, CacheException, DomainException and 7 other exception files. Plan 01's index.ts changes (which were cherry-picked from main) reference these exception files explicitly, causing tsc to fail in the worktree context.
- **Fix:** Checked out `packages/core/src/exceptions/` from main branch to provide the missing exception files. This is pre-existing work from phase 22, not new work.
- **Files modified:** packages/core/src/exceptions/ (10 new files + 7 modified)
- **Verification:** `@gravito/core` typecheck exits 0; d.ts generation succeeds
- **Committed in:** adfc96d8

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking worktree dependency gap)
**Impact on plan:** Necessary worktree setup to enable verification. No scope creep — exception files are phase 22 work, not new features.

## Issues Encountered

- Worktree branch (worktree-agent-ac650138) was diverged from main and missing exception files added in phase 22. Cherry-picking Plan 01's commit (bbb09a1b) brought in the index.ts named export changes, but those changes reference exception symbols that only exist in main. Required syncing the exceptions directory from main.
- The `jose` module missing error in `@gravito/photon` is pre-existing in this worktree branch and unrelated to Phase 23 changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 23 named-export-conversion is complete (both MOD-01/02 from Plan 01 and MOD-03 from Plan 02)
- Both barrels (index.ts and index.browser.ts) now use explicit named exports for helpers/data, helpers/errors, helpers/response
- setApp removed from both barrels per D-02
- d.ts diff verified: zero symbol regression, only intentional setApp removal
- These worktree branch commits can be merged to main to finalize the conversion

---
*Phase: 23-named-export-conversion*
*Completed: 2026-03-30*
