---
phase: 01-1-2-days
plan: 02
subsystem: build
tags: [bun, tsup, esbuild, dist, esm, cjs, photon, signal, bundler]

requires:
  - phase: 01-1-2-days-01
    provides: "Phase 1 verification report identifying photon/signal dist bundle gaps"

provides:
  - "packages/photon/build.ts: post-build patch for Bun v1.3.10 bundler bug"
  - "packages/signal/build.ts: tsup-based ESM/CJS bundle generation"
  - "Verified: photon dist/index.js, signal dist/index.mjs, signal dist/index.cjs all importable"

affects:
  - "Any phase publishing @gravito/photon or @gravito/signal to npm"
  - "Any phase running bun run build for photon or signal"

tech-stack:
  added:
    - "tsup@8.5.1 (used for signal ESM/CJS bundling as bun build workaround)"
  patterns:
    - "Post-build patch pattern: detect bundler bug via import/export mismatch and auto-fix"
    - "tsup fallback: use tsup (esbuild-based) when bun build produces incorrect output"
    - "CJS rename: tsup outputs index.js for CJS; rename to index.cjs to match package.json exports"

key-files:
  created: []
  modified:
    - "packages/photon/build.ts"
    - "packages/signal/build.ts"

key-decisions:
  - "Root cause: Bun v1.3.10 bundler bug - splitting:true omits chunk imports; splitting:false with dynamic external imports emits only partial bundle content"
  - "Photon fix: post-build patch in build.ts reads dist/index.js, detects missing Photon import, injects import from photon.js chunk"
  - "Signal fix: switched from bun build API to tsup (esbuild-based) which correctly bundles all exports"
  - "dist/ files are gitignored - fix must be in build.ts to persist across rebuilds"
  - "Signal CJS: tsup outputs index.js for CJS format; copy to index.cjs to match package.json exports.require field"

patterns-established:
  - "Build bug detection: verify dist bundle size before accepting build output"
  - "Bun bundler compatibility: use tsup as fallback when bun build produces incorrect bundles"

requirements-completed:
  - CORE-02
  - CORE-04

duration: 11min
completed: 2026-03-24
---

# Phase 01 Plan 02: Gap Closure - Photon and Signal dist bundles

**Patched Bun v1.3.10 bundler bug via post-build injection for photon and tsup migration for signal, restoring dist/index.js (20 exports) and dist/index.mjs+cjs (20 exports each)**

## Performance

- **Duration:** 11 minutes
- **Started:** 2026-03-24T14:48:59Z
- **Completed:** 2026-03-24T14:59:59Z
- **Tasks:** 2 (combined Task 1 and Task 2 into single commit due to dependency)
- **Files modified:** 2 (packages/photon/build.ts, packages/signal/build.ts)

## Accomplishments

- Photon `dist/index.js` is importable with 20 exports including Photon class
- Signal `dist/index.mjs` is importable with 20 exports including OrbitSignal
- Signal `dist/index.cjs` is require-able with 20 exports including OrbitSignal
- Build system permanently fixed — future `bun run build` calls will generate correct artifacts
- Root cause of Bun v1.3.10 bundler bug identified and documented in build.ts comments

## Task Commits

1. **Task 1+2: Rebuild and verify Photon and Signal dist bundles** - `e3a182f6` (fix)

## Files Created/Modified

- `packages/photon/build.ts` - Added post-build `patchPhotonIndexImport()` function that detects missing Photon import and injects it from photon.js chunk
- `packages/signal/build.ts` - Replaced bun build API with tsup for ESM/CJS bundling; added CJS rename logic (index.js → index.cjs)

## Decisions Made

- **Use post-build patch for photon** (not rebuild config): The splitting:true multi-entrypoint architecture is correct; only the missing import in index.js needs patching. Stable patch because chunk filenames are deterministic.
- **Use tsup for signal** (not patch): Signal's issue is fundamental — bun build emits only 1.5KB (just mjml-templates.ts) instead of 3MB full bundle. No simple patch possible; tsup with same external deps produces correct 2.77-2.78MB bundle.
- **Copy index.js → index.cjs**: tsup CJS output defaults to .js extension; package.json expects .cjs. Simple file copy ensures compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Root cause was a Bun v1.3.10 bundler bug, not a stale cache**
- **Found during:** Task 1 (pre-flight verification and rebuild)
- **Issue:** Plan assumed the fix was simply re-running `bun run build`. After running build, dist files were still broken (same bug reproduced). Turbo cache was not the cause.
- **Fix:** Identified the specific Bun v1.3.10 bundler behavior and implemented permanent fixes in build.ts files
- **Files modified:** packages/photon/build.ts, packages/signal/build.ts
- **Verification:** Re-ran build.ts directly; photon patch message shown; signal tsup output 2.77MB/2.78MB; all three import/require tests pass
- **Committed in:** e3a182f6

**2. [Rule 2 - Missing Critical] Build.ts permanent fix (not just dist file patch)**
- **Found during:** Task 2 (verification step)
- **Issue:** dist/ is in .gitignore — can't commit dist files. Without a build.ts fix, the problem would recur on every `bun run build`
- **Fix:** Modified build.ts for both packages to produce correct output permanently
- **Files modified:** packages/photon/build.ts, packages/signal/build.ts
- **Verification:** Ran build.ts twice; second run also produces correct output
- **Committed in:** e3a182f6

---

**Total deviations:** 2 auto-fixed (1 bug root-cause correction, 1 missing critical persistence)
**Impact on plan:** Both deviations essential for correctness. The plan's `git add packages/photon/dist/` instruction was not executable (dist/ is gitignored); build.ts fix is the correct permanent solution.

## Issues Encountered

- **dist/ is gitignored**: Plan's Task 2 Step 4 instructed `git add packages/photon/dist/ packages/signal/dist/`. Not possible — .gitignore excludes dist/. Resolved by fixing build.ts instead (permanent fix).
- **Bun v1.3.10 bundler bug (photon)**: splitting:true emits dist/index.js that lists Photon in exports but never imports it from the chunk. Bun.build() reports success=true with no error. Fixed via post-build text patch.
- **Bun v1.3.10 bundler bug (signal)**: splitting:false with dynamic imports from external packages emits only 1.5KB partial bundle (only mjml-templates.ts content). Bun.build() reports success=true and 1595 byte output. Fixed by switching to tsup.
- **tsup --out-extension flag**: tsup v8.5.1 doesn't support the `--out-extension` CLI flag. Fixed by using default output names and copying index.js → index.cjs in post-build step.

## Known Stubs

None — this plan produces build artifacts, not UI rendering code.

## Next Phase Readiness

- CRIT-01 (photon dist/index.js) resolved
- CRIT-02 (signal MJS/CJS bundle) resolved
- Phase 2A complete: photon and signal dist bundles fully functional
- Ready for next Phase 2A items: fix 4 implicit atlas dependencies (fortify/graphql/pulse/spectrum)

---
*Phase: 01-1-2-days*
*Completed: 2026-03-24*
