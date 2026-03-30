---
milestone: v2.1.0
version: 1.0
created: 2026-03-29
status: approved
---

# Gravito-Core v2.1.0 Roadmap

**Milestone:** v2.1.0 — Core DX 改進
**Phase numbering:** Continues from v2.0.0 (last phase: 20), starts at Phase 21
**Requirements:** 18 total across API Footguns, Exception Hierarchy, Module Organization, Type Improvements, Documentation & Tooling
**Coverage:** 18/18 requirements mapped

---

## Phases

- [x] **Phase 21: API Footgun Fixes** — Fix Router console.log, ModelNotFoundException string sentinel, boot() observabilityProvider, deprecated annotation, and skipped tests (completed 2026-03-29)
- [x] **Phase 22: Exception Hierarchy Clarification** — Add JSDoc role separation for AuthException (abstract base) and AuthenticationException (concrete 401); no structural changes (completed 2026-03-29)
- [x] **Phase 23: Named Export Conversion** — Convert 6 star exports to explicit named exports; remove setApp from public barrel; mirror index.browser.ts (completed 2026-03-29)
- [x] **Phase 24: Config Type Unification** — ApplicationConfig extends Pick<GravitoConfig>; boot() forwards observabilityProvider without silent drop (completed 2026-03-30)
- [x] **Phase 25: Container Type Improvement** — Add ServiceMap-keyed overload to Container.make() eliminating any in primary DI resolution path (completed 2026-03-30)
- [x] **Phase 26: Documentation and Tooling** — Biome noExplicitAny upgrade, noConsole rule, publint CI gate, README sync, orbit/register/use guide, JSDoc language unification (gap closure in progress) (completed 2026-03-30)

---

## Phase Details

### Phase 21: API Footgun Fixes
**Goal**: Developers using @gravito/core get clean stdout, typed exceptions from Router, clear deprecation warnings, and no skipped tests hiding regressions
**Depends on**: Nothing (first v2.1.0 phase)
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05
**Success Criteria** (what must be TRUE):
  1. Requiring @gravito/core and registering routes produces zero console output on stdout in a production Node/Bun process
  2. A router catch block can do `if (e instanceof ModelNotFoundException)` instead of `if (e.message === 'ModelNotFound')` — string comparison is eliminated
  3. Passing `observabilityProvider` to `PlanetCore.boot()` correctly forwards it; the config field is no longer silently dropped at runtime
  4. TypeScript IDEs show `core.services` with strikethrough (@deprecated); accessing it does not cause a type error but signals migration to the new API
  5. The two previously-skipped tests in orbit-middleware-isolation.test.ts pass — they exist to guard the behavior FIX-01 modifies
**Plans:** 3/3 plans complete
Plans:
- [x] 21-01-PLAN.md — Fix BunNativeAdapter.matchesPath and unskip orbit-middleware tests (FIX-05)
- [x] 21-02-PLAN.md — Remove Router console.log and replace string sentinel with ModelNotFoundException (FIX-01, FIX-02)
- [x] 21-03-PLAN.md — Forward observabilityProvider in boot() and verify @deprecated annotation (FIX-03, FIX-04)

### Phase 22: Exception Hierarchy Clarification
**Goal**: Developers reading the @gravito/core exception module understand the role of AuthException and AuthenticationException without guessing from names alone
**Depends on**: Phase 21
**Requirements**: EXC-01
**Success Criteria** (what must be TRUE):
  1. The JSDoc on AuthException states it is the abstract base class for all authentication-related errors and must not be thrown directly
  2. The JSDoc on AuthenticationException states it is the concrete 401 Unauthorized implementation that should be thrown and caught
  3. Both classes remain in the codebase with no renames or deletions; fortify and sentinel instanceof chains are unaffected
  4. A developer reading only the hover tooltip in VS Code can distinguish which class to extend and which to throw
**Plans:** 1/1 plans complete
Plans:
- [x] 22-01-PLAN.md — Add role-clarifying JSDoc to AuthException, AuthenticationException, and declaration file (EXC-01)

### Phase 23: Named Export Conversion
**Goal**: The public API surface of @gravito/core is explicit and auditable — every exported symbol is visible by name in index.ts rather than hidden behind star re-exports
**Depends on**: Phase 22
**Requirements**: MOD-01, MOD-02, MOD-03
**Success Criteria** (what must be TRUE):
  1. Running `tsc --declaration --emitDeclarationOnly` before and after produces the same set of exported symbols — zero symbols are accidentally removed
  2. The six previously-star-exported modules (exceptions, helpers/data, helpers/errors, helpers/response, testing, adapters/bun) now have explicit named export lists in index.ts
  3. `setApp` is not present in the compiled output of index.ts or index.browser.ts — it is inaccessible to downstream consumers as a public import
  4. index.browser.ts exports the same named symbols as index.ts for the shared surface; differences are intentional and documented
  5. `bun run typecheck` at workspace root passes with zero new errors after export conversion
**Plans:** 2/2 plans complete
Plans:
- [x] 23-01-PLAN.md — Capture d.ts baseline, convert 6 star exports to named exports, remove setApp from index.ts (MOD-01, MOD-02)
- [x] 23-02-PLAN.md — Sync index.browser.ts helper exports and run d.ts diff verification (MOD-03)

### Phase 24: Config Type Unification
**Goal**: ApplicationConfig and GravitoConfig share a single source of truth for overlapping fields; boot() does not silently drop config fields that developers pass
**Depends on**: Phase 23
**Requirements**: TYPE-01, FIX-03
**Success Criteria** (what must be TRUE):
  1. ApplicationConfig is defined as `extends Pick<GravitoConfig, 'logger' | 'config'>` — the logger and config field definitions exist in exactly one place
  2. Passing `observabilityProvider` in a GravitoConfig object to `PlanetCore.boot()` results in it being available inside the booted application — confirmed by a passing test
  3. `bun run typecheck` at workspace root passes with zero errors after the type change
**Plans:** 1/1 plans complete
Plans:
- [x] 24-01-PLAN.md — Unify ApplicationConfig via Pick<GravitoConfig>, add JSDoc, verify FIX-03 (TYPE-01, FIX-03)

### Phase 25: Container Type Improvement
**Goal**: Calling Container.make() with a known service key returns the concrete type, not any — eliminating the most common source of undetected type errors in DI resolution
**Depends on**: Phase 24
**Requirements**: TYPE-02
**Success Criteria** (what must be TRUE):
  1. `container.make('myService')` where 'myService' is a key in ServiceMap returns the concrete type declared in ServiceMap — TypeScript infers it without a cast
  2. Calling `container.make()` with a key not present in ServiceMap still compiles and returns the existing fallback type — no call sites are broken
  3. `bun run typecheck` at workspace root passes with zero errors — the overload does not cascade type errors into the 50+ downstream packages that use Container
**Plans:** 1/1 plans complete
Plans:
- [x] 25-01-PLAN.md — Change ServiceMap type to interface, sync Container.d.ts, expand tests (TYPE-02)

### Phase 26: Documentation and Tooling
**Goal**: CI enforces the improved API surface via lint rules and export validation; documentation matches the actual API that developers encounter
**Depends on**: Phase 25
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07
**Success Criteria** (what must be TRUE):
  1. CI fails on any new `any` annotation in packages/core/src/ — Biome noExplicitAny is set to error, not warn
  2. CI fails on any new console.log/error/warn in packages/core/src/ — Biome noConsole rule is active and scoped to core src
  3. `publint` runs in the Turbo pipeline and fails the build if any package's exports map is invalid or missing an expected entry point
  4. The README EventManager section documents dispatch/listen/unlisten and no other methods — the non-existent setRetryScheduler reference is absent
  5. The README HookManager section matches the actual public API surface — no methods that do not exist in source are referenced
  6. A developer choosing between orbit(), register(), and use() can find a decision guide (in README or docs) that explains when to use each with a concrete example
  7. All public API JSDoc comments in packages/core/src/ are written in English — no mixed-language blocks remain
**Plans:** 7 plans (6 complete, 1 gap closure pending)
Plans:
- [x] 26-01-PLAN.md — Biome noExplicitAny+noConsole overrides and fix 16 any violations (DOC-01, DOC-02)
- [x] 26-02-PLAN.md — Console migration/suppression across core/src event system and infrastructure (DOC-02)
- [x] 26-03-PLAN.md — publint CI gate with Turbo pipeline and per-package scripts (DOC-03)
- [x] 26-04-PLAN.md — README API corrections, orbit/register/use guide, JSDoc English unification (DOC-04, DOC-05, DOC-06, DOC-07)
- [x] 26-05-PLAN.md — Gap closure: fix 37 noExplicitAny violations in events/ (DOC-01)
- [x] 26-06-PLAN.md — Gap closure: fix 24 noExplicitAny violations in runtime/ and hooks/ (DOC-01)
- [ ] 26-07-PLAN.md — Gap closure: fix final 5 noExplicitAny + 1 noConsole violations (DOC-01, DOC-02)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. API Footgun Fixes | v2.1.0 | 3/3 | Complete    | 2026-03-29 |
| 22. Exception Hierarchy Clarification | v2.1.0 | 1/1 | Complete    | 2026-03-29 |
| 23. Named Export Conversion | v2.1.0 | 2/2 | Complete    | 2026-03-29 |
| 24. Config Type Unification | v2.1.0 | 1/1 | Complete    | 2026-03-30 |
| 25. Container Type Improvement | v2.1.0 | 1/1 | Complete    | 2026-03-30 |
| 26. Documentation and Tooling | v2.1.0 | 6/7 | Gap Closure | 2026-03-30 |
