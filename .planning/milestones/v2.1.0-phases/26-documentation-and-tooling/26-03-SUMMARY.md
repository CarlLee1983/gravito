---
phase: 26-documentation-and-tooling
plan: 03
subsystem: infra
tags: [publint, turbo, exports-map, ci, package-validation]

requires:
  - phase: none
    provides: existing turbo.json pipeline and 57 packages with exports maps

provides:
  - publint@0.3.18 installed as root devDependency
  - turbo.json publint task with dependsOn build and cache false
  - publint script in all 57 packages with exports maps
  - CI gate for package.json exports map validation

affects: [26-04, ci-pipeline, package-publishing]

tech-stack:
  added: [publint@0.3.18]
  patterns: [per-package publint script, turbo pipeline task with build dependency]

key-files:
  created: []
  modified:
    - turbo.json
    - package.json
    - packages/*/package.json (57 files)

key-decisions:
  - "cache: false on publint task — dist/ is already cached by build; publint reads cache output"
  - "Fix @gravito/core exports map types-condition ordering — types must be first per publint spec"

patterns-established:
  - "publint script: every package with exports map has 'publint': 'publint' in scripts"
  - "turbo publint pipeline: dependsOn build, cache false, inputs dist/** and package.json"

requirements-completed: [DOC-03]

duration: 10min
completed: 2026-03-30
---

# Phase 26 Plan 03: publint CI Gate Summary

**publint@0.3.18 installed with Turbo pipeline task, adding exports-map validation to all 57 packages as a CI gate after build**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-30T04:35:00Z
- **Completed:** 2026-03-30T04:38:41Z
- **Tasks:** 2
- **Files modified:** 60 (turbo.json + package.json root + 58 packages/*/package.json)

## Accomplishments

- Installed publint@0.3.18 as root devDependency (with bun.lock updated)
- Added publint Turbo pipeline task (`dependsOn: ["build"]`, `cache: false`) to turbo.json
- Added `"publint": "publint"` script to all 57 packages that have an `exports` field
- `turbo run publint --dry-run` shows 57 packages with the actual publint command
- `bun run --filter @gravito/core publint` exits 0 (All good!)

## Task Commits

1. **Task 1: Install publint and add Turbo pipeline task** - `945bf2b3` (chore)
2. **Task 2: Add publint script to all packages with exports maps** - `a0f45cb6` (chore)

## Files Created/Modified

- `turbo.json` - Added publint task with dependsOn build and cache false
- `package.json` (root) - Added publint@^0.3.18 devDependency
- `bun.lock` - Updated lockfile with publint and its dependencies
- `packages/*/package.json` (57 files) - Added `"publint": "publint"` script to each
- `packages/core/package.json` - Also fixed exports map: moved `types` condition to first position

## Decisions Made

- `cache: false` on publint Turbo task: publint reads dist/ which is already cached by build; re-caching publint output adds no value and would add confusion
- Fix @gravito/core exports types ordering inline with Task 2 commit: publint caught a real issue (types condition must be first in the exports object for TypeScript resolution), so fixed it immediately

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed @gravito/core exports map types condition ordering**
- **Found during:** Task 2 (verification phase — running `bun run --filter @gravito/core publint`)
- **Issue:** publint error: `pkg.exports["."].types should be the first in the object as conditions are order-sensitive so it can be resolved by TypeScript.` — `types` was listed after `browser` and `bun`
- **Fix:** Moved `types: "./dist/index.d.ts"` to be the first key in the `"."` exports entry of `packages/core/package.json`
- **Files modified:** `packages/core/package.json`
- **Verification:** `bun run --filter @gravito/core publint` exits 0, "All good!"
- **Committed in:** `a0f45cb6` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix caught by the tool being installed. No scope creep.

## Issues Encountered

None — plan executed cleanly. publint detected a pre-existing exports-map ordering issue in @gravito/core which was fixed inline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `turbo run publint` is ready to use as a CI gate
- All 57 packages are configured for validation
- @gravito/core and @gravito/atlas pass publint (All good!)
- @gravito/signal passes with warnings only (exit 0)
- Phase 26-04 can proceed independently

---
*Phase: 26-documentation-and-tooling*
*Completed: 2026-03-30*
