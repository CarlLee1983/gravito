---
phase: 20-integration-verification-graceful-degradation
plan: "03"
subsystem: infra
tags: [semver, version-bump, peer-dependencies, package-management, release]

# Dependency graph
requires:
  - phase: 20-01
    provides: DegradationManager implementation in @gravito/resilience
  - phase: 16-core-error-model-foundation
    provides: Error hierarchy for all 38 modified packages
  - phase: 17-resilience-infrastructure
    provides: CircuitBreaker, withResilience, ResiliencePolicy
  - phase: 18-foundation-orbit-migration
    provides: Foundation Orbit migrations
  - phase: 19-secondary-orbit-migration
    provides: Secondary Orbit migrations
provides:
  - All 38 Phase 16-19 modified packages bumped to next major version (D-07)
  - 53 peerDependency entries updated to new major ranges (D-08)
  - Reusable scripts/bump-v2-versions.ts for future major bumps
  - workspace:* protocol entries preserved unchanged
affects:
  - 20-04 (satellite contract tests + migration guide need correct versions)
  - npm publish workflow (all 38 packages have NEW VERSION status)
  - downstream consumers of @gravito/core, photon, signal, stream, plasma, etc.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Major version bump: (currentMajor + 1).0.0 per package, independent evolution"
    - "peerDep range update: ^{newMajor}.0.0 for all bumped package consumers"
    - "workspace:* preservation: internal devDependencies never changed by bump scripts"

key-files:
  created:
    - scripts/bump-v2-versions.ts
  modified:
    - packages/astral/package.json
    - packages/atlas/package.json
    - packages/beam/package.json
    - packages/cli/package.json
    - packages/constellation/package.json
    - packages/core/package.json
    - packages/cosmos/package.json
    - packages/dark-matter/package.json
    - packages/echo/package.json
    - packages/flare/package.json
    - packages/flux/package.json
    - packages/forge/package.json
    - packages/fortify/package.json
    - packages/freeze/package.json
    - packages/graphql/package.json
    - packages/horizon/package.json
    - packages/impulse/package.json
    - packages/impulse-bridge/package.json
    - packages/launchpad/package.json
    - packages/luminosity/package.json
    - packages/monitor/package.json
    - packages/monolith/package.json
    - packages/nebula/package.json
    - packages/nebula-s3/package.json
    - packages/photon/package.json
    - packages/plasma/package.json
    - packages/prism/package.json
    - packages/pulsar/package.json
    - packages/quark/package.json
    - packages/quasar/package.json
    - packages/radiance/package.json
    - packages/resilience/package.json
    - packages/ripple/package.json
    - packages/sentinel/package.json
    - packages/signal/package.json
    - packages/stasis/package.json
    - packages/stream/package.json
    - packages/zenith/package.json
    - packages/ether/package.json
    - packages/ion/package.json
    - packages/luminosity-adapter-photon/package.json
    - packages/mass/package.json
    - packages/nova/package.json
    - packages/orbit-cloudflare/package.json
    - packages/scaffold/package.json
    - packages/spectrum/package.json

key-decisions:
  - "D-06: Only 38 packages with actual source changes from Phase 16-19 get bumped"
  - "D-07: Each package gets major+1 (e.g., core 2.0.6->3.0.0, photon 1.1.4->2.0.0)"
  - "D-08: peerDependencies updated to ^{newMajor}.0.0; workspace:* stays unchanged"
  - "Pre-existing stream#build:dts failure documented as out-of-scope (not caused by bumps)"
  - "freeze beta version 1.0.0-beta.8 correctly parsed: parseInt('1')=1 -> 2.0.0"

patterns-established:
  - "Version bump script: Phase-specific scripts in scripts/ using Bun APIs, idempotent and logged"
  - "peerDep scan: scan ALL packages, not just bumped 38, to catch all consumers"
  - "Workspace:* guard: skip any peerDep value === 'workspace:*' to preserve monorepo protocol"

requirements-completed: [RELS-01]

# Metrics
duration: 12min
completed: 2026-03-29
---

# Phase 20 Plan 03: Version Bump Summary

**38 packages bumped to next major version (core 3.0.0, photon 2.0.0, signal 4.0.0, etc.) with 53 peerDependency entries updated across all consumers using an automated Bun script**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-29T12:07:58Z
- **Completed:** 2026-03-29T12:20:00Z
- **Tasks:** 2
- **Files modified:** 47 (38 bumped + 9 peerDep consumers + 1 new script)

## Accomplishments

- Created `scripts/bump-v2-versions.ts` — reusable, idempotent script using Bun APIs
- Bumped all 38 Phase 16-19 packages to (currentMajor+1).0.0 via automated script
- Updated 53 peerDependency entries across all consuming packages (mass, monitor, fortify, stasis, impulse-bridge, forge, etc.)
- Preserved all `workspace:*` devDependency entries unchanged (D-08)
- Confirmed no new TypeScript errors introduced by version changes
- Confirmed 254/254 resilience tests pass after bumps

## Version Change Summary

| Package | Old Version | New Version |
|---------|-------------|-------------|
| @gravito/core | 2.0.6 | **3.0.0** |
| @gravito/photon | 1.1.4 | **2.0.0** |
| @gravito/signal | 3.1.2 | **4.0.0** |
| @gravito/atlas | 2.6.0 | **3.0.0** |
| @gravito/plasma | 2.0.3 | **3.0.0** |
| @gravito/stream | 2.1.2 | **3.0.0** |
| @gravito/resilience | 1.0.2 | **2.0.0** |
| @gravito/monitor | 3.1.2 | **4.0.0** |
| @gravito/freeze | 1.0.0-beta.8 | **2.0.0** (beta stripped) |
| @gravito/nebula | 4.1.3 | **5.0.0** |
| @gravito/sentinel | 4.0.2 | **5.0.0** |
| @gravito/ripple | 4.0.3 | **5.0.0** |
| @gravito/flare | 4.0.2 | **5.0.0** |
| ... (38 total) | | |

## Task Commits

Each task was committed atomically:

1. **Task 1: Create and run version bump script for 38 packages + peerDep updates** - `e172a8e7` (feat)
2. **Task 2: Validate version consistency and run full test suite** - `64a12534` (chore)

## Files Created/Modified

- `scripts/bump-v2-versions.ts` — Phase 1-3 automated bump script (Phase 1: version bumps, Phase 2: peerDep scans, Phase 3: summary log)
- `packages/*/package.json` — 38 package.json files with bumped versions
- `packages/{mass,monitor,fortify,flux,nebula,constellation,prism,cosmos,stasis,ripple,horizon,sentinel,ether,impulse-bridge,forge,graphql,nebula-s3,beam,quark,spectrum,pulsar,scaffold,orbit-cloudflare,ion,nova,luminosity-adapter-photon,signal,flare}/package.json` — peerDependency updates

## Decisions Made

- Confirmed that `freeze: 1.0.0-beta.8 -> 2.0.0` is correct: `parseInt('1') = 1`, so `1+1 = 2`
- `@gravito/signal` peerDeps in `flare` also updated (`@gravito/prism` in signal's own peerDeps updated from ^3.1.1 -> ^4.0.0)
- Pre-existing `@gravito/stream#build:dts` TypeScript failure logged as out-of-scope — not caused by version bumps (confirmed via git stash test)

## Deviations from Plan

None - plan executed exactly as written.

The pre-existing `stream#build:dts` failure was verified as out-of-scope (existed before our changes). Logged in deferred-items per scope boundary rules.

## Issues Encountered

**Pre-existing typecheck failure:** `@gravito/stream#build:dts` fails due to missing `@gravito/atlas` type declarations in stream's MySQLPersistence.ts and SQLitePersistence.ts. Confirmed pre-existing via `git stash` test — present before our version bumps. Not caused by this plan. Deferred.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 38 packages are at their correct major versions for v2.0.0 release
- peerDependency graph is consistent with new major versions
- Plan 04 (satellite contract tests + migration guide) can proceed with correct versions
- `bun run version:check` will show NEW VERSION for all 38 packages (requires NPM connectivity)

## Self-Check: PASSED

- scripts/bump-v2-versions.ts: FOUND
- 20-03-SUMMARY.md: FOUND
- Commit e172a8e7: FOUND
- Commit 64a12534: FOUND
- packages/core version 3.0.0: OK
- packages/fortify peerDep @gravito/core ^3.0.0: OK

---
*Phase: 20-integration-verification-graceful-degradation*
*Completed: 2026-03-29*
