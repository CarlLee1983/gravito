# Project Research Summary

**Project:** @gravito/core v2.1.0 DX Improvements
**Domain:** TypeScript monorepo framework — public API surface hardening
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

This is a DX improvement pass on an existing, production-ready framework — not a greenfield feature build. The codebase already has a solid foundation (TypeScript strict mode, Biome, Bun test, pre-commit hooks), but has accumulated specific API surface problems that degrade the developer experience for both internal contributors and external consumers: unconditional `console.log` in library code, brittle string-sentinel error throwing, confusingly-named exception classes, star exports that hide the true public API, and a config type that silently drops fields at runtime.

The recommended approach is a phased, backwards-compatible cleanup in priority order: fix the most visible footguns first (console.log, string sentinel, deprecated API annotation), then consolidate the module organization (named exports, @internal hiding), then improve config type accuracy and exception clarity, and finally add tooling validation (publint, TypeDoc for core). Every change should be gated by `bun run typecheck` at workspace root — not just per-package — because 352 import sites across 38+ downstream packages are all affected by export surface changes to `@gravito/core`.

The primary risk in this project is not any single code change but rather the combination of export refactoring across a large package graph without complete verification gates. The two most dangerous operations are: (1) removing any symbol from the public export surface that downstream packages re-export or augment via `declare module`, and (2) modifying `AuthException` without first confirming that `fortify` and `sentinel` `instanceof` checks remain intact. Both risks are fully preventable with the audit patterns documented in PITFALLS.md.

## Key Findings

### Recommended Stack

The toolchain needs only two new devDependencies: `publint` (package export validation, zero runtime deps) and `typedoc@^0.28.18` (API docs for `@gravito/core`, which lacks it despite 100% JSDoc coverage). Everything else is configuration changes to existing tools — specifically, upgrading Biome's `noExplicitAny` from `warn` to `error` and enabling the `noConsole` rule scoped to `packages/core/src/` (excluding the CLI subtree).

**Core technologies:**
- **Biome 2.3.10** (already installed): upgrade `noExplicitAny` to `error`, add `noConsole` with override scope — fixes the enforcement gap that lets new `any` and debug `console.log` slip through CI
- **publint ^0.3.18** (new, root devDep): validates `package.json` exports maps across all 50+ packages — catches the class of publish bugs where consumers get `Cannot find module` despite a clean build
- **TypeDoc ^0.28.18** (new, per `@gravito/core` only): generates API reference from existing 100% JSDoc coverage; `excludeInternal: true` enforces the `@internal` boundary in generated output
- **TypeScript 5.9.3** (already configured): no changes needed; `noUnusedLocals` and `noUnusedParameters` already ON

Do NOT add: `@microsoft/api-extractor` (DTS rollup overhead not warranted), `type-coverage` (redundant with `noExplicitAny: error`), `knip` (50-package scope is too noisy for v2.1.0), ESLint (Biome already covers the lint surface).

### Expected Features

Research is against a DX improvement milestone with known, audited footguns. This is not a feature-discovery exercise — it is a prioritized fix list.

**Must have (table stakes — v2.1.0):**
- **Zero stdout in library code** — remove `Router.ts:610` console.log; every serious framework does this; one-line fix with disproportionate professional signal
- **ModelNotFound as typed exception** — replace `throw new Error('ModelNotFound')` string sentinel (lines 436/475) with direct `throw new ModelNotFoundException(param, value)`; eliminates brittle string comparison
- **AuthException vs AuthenticationException clarity** — JSDoc clarification that `AuthException` is abstract base, `AuthenticationException` is concrete 401; no file deletions
- **`core.services` TypeScript `@deprecated` annotation** — IDE strikethrough prevents new devs from following the wrong pattern; JSDoc `@deprecated` already exists but TS decorator does not
- **README API section sync** — audit EventManager/HookManager public methods against source; fix concrete discrepancies
- **JSDoc language unification** — English-only consistency across public API (already 100% covered, language is inconsistent)
- **orbit vs register vs use decision guide** — single doc section + JSDoc `@see` cross-references; top onboarding confusion point

**Should have (v2.1.x follow-up):**
- **Named export convergence** — convert `export * from './exceptions'`, `./helpers/data`, `./helpers/errors`, `./helpers/response`, `./testing`, `./adapters/bun/index` to explicit named exports
- **Actionable error messages with `suggestion` field** — extend `GravitoException` constructor; apply to top 5 DI resolution errors
- **Update 3-5 canonical examples** — `ecommerce-mvc`, `blog-mvc`, `auth-verification` to v2 API patterns

**Defer (v2.2+):**
- **Zero `any` in public generics** — 69 occurrences across 31 files; high complexity, generic threading risk; requires stabilized API surface first
- **Troubleshooting FAQ** — 5-entry doc; requires stabilized API to write accurately
- **TypeDoc API reference site** — useful once named exports are converged

### Architecture Approach

All DX improvements are API surface changes and type-level changes — no file moves, no new directories. The existing structure is sound, and with 352 import sites across 38+ consumer packages, file moves carry high regression risk. The work is: (1) what gets exported and how (`index.ts` star to named), (2) what is hidden (`setApp` removed from public barrel), (3) type accuracy (`GravitoConfig` + `ApplicationConfig` via extension, `Container.make()` overload), and (4) exception documentation (JSDoc on `AuthException` / `AuthenticationException`).

**Major components and their DX state:**
1. **`src/index.ts` (875-line barrel)** — 6 remaining star exports hide the true public API surface; target is explicit named export blocks for `exceptions`, `helpers/*`, `testing`, `adapters/bun`
2. **`src/exceptions/`** — `AuthException` (abstract base) and `AuthenticationException` (concrete 401) coexist with confusingly similar names; both must be kept (fortify + sentinel extend/use both); fix is JSDoc only
3. **`src/PlanetCore.ts`** — `GravitoConfig` missing `observabilityProvider` forwarding in `boot()` (confirmed line 788-811); `ApplicationConfig` duplicates `logger`/`config` fields; target is `ApplicationConfig extends Pick<GravitoConfig, ...>`
4. **`src/Container.ts`** — `make()` returns `any`; target is overload signature for `ServiceMap`-keyed lookups; heavier generic refactor deferred
5. **`src/helpers.ts`** — `setApp` is `@internal` bootstrap glue but is currently public-exported; must be removed from `index.ts` and `index.browser.ts` named export lists

The `events` star export is intentional (broad legitimate API) and should NOT be converted. `@gravito/core/engine`, `/ffi`, `/compat` sub-path exports are clean and untouched.

### Critical Pitfalls

1. **Star export removal silently breaks downstream re-exports** — If any symbol is missing from the explicit named list, packages like `photon` that re-export from `@gravito/core` break at runtime without a core-level typecheck failure. Prevention: run `bun run typecheck` at workspace root (not per-package) after every export change; generate symbol inventory with `tsc --declaration --emitDeclarationOnly` and diff before/after.

2. **`GravitoVariables` module augmentation breaks if interface is hidden** — 14 orbit packages use `declare module '@gravito/core' { interface GravitoVariables { ... } }`. Moving `GravitoVariables` behind `@internal` makes all 14 augmentations silently target the wrong declaration. Prevention: run `grep -r "declare module '@gravito/core'" packages/` before any export cleanup; never make augmentable interfaces internal.

3. **AuthException instanceof checks break if class is removed or renamed** — `FortifyError extends AuthException` and `SentinelError extends AuthException`; removing or aliasing `AuthException` away from the concrete class breaks catch blocks in both packages. Prevention: keep `AuthException` as abstract base; only add JSDoc; no structural changes.

4. **GravitoConfig changes not forwarded by `boot()`** — `defineConfig()` is a no-op identity function; `boot()` manually destructures config and already silently drops `observabilityProvider`. Adding new `GravitoConfig` fields without also updating `boot()` produces a type-clean but runtime-silent config drop. Prevention: pair every `GravitoConfig` field change with a `boot()` audit and an end-to-end propagation test.

5. **Router console.log removal exposes skipped tests** — Two middleware isolation tests in `orbit-middleware-isolation.test.ts` are currently skipped; they likely relied on route registration logs for diagnosis. Prevention: re-enable and fix skipped tests before removing the log, not after.

## Implications for Roadmap

Based on research, suggested phase structure (7 execution phases):

### Phase 1: API Footgun Fixes

**Rationale:** Highest-value, lowest-risk changes. Standalone fixes with no downstream type cascade risk. Produces immediate, visible DX improvement before touching the export surface.
**Delivers:** Clean stdout in production, typed exception throwing, deprecated API annotation, foundation for exception hierarchy clarity
**Addresses:** Router console.log removal, ModelNotFound string sentinel replacement, `core.services` TypeScript `@deprecated` annotation, skipped test re-enablement
**Avoids:** Pitfall 5 (console.log removal masks broken tests) — fix skipped tests in the same phase

### Phase 2: Exception Hierarchy Clarification

**Rationale:** Depends on Phase 1 (exception throwing stabilized). JSDoc-only changes — zero runtime risk. Must come before named export conversion so the export list reflects a clarified hierarchy.
**Delivers:** Clear role separation between `AuthException` (abstract base) and `AuthenticationException` (concrete 401) via JSDoc; both classes retained
**Addresses:** AuthException/AuthenticationException naming confusion feature
**Avoids:** Pitfall 2 (instanceof breakage) — no structural changes, JSDoc only

### Phase 3: Module Organization — Named Export Conversion

**Rationale:** Highest structural risk; must come after Phases 1-2 so the exception and helper surfaces are stable before being enumerated. Requires full workspace typecheck gate.
**Delivers:** Explicit named exports for `exceptions`, `helpers/*`, `testing`, `adapters/bun`; `setApp` removed from public barrel; `index.browser.ts` mirrored
**Uses:** Symbol inventory audit (`tsc --declaration --emitDeclarationOnly`), `grep -r "declare module '@gravito/core'"` augmentation check
**Avoids:** Pitfall 1 (missing symbols break downstream), Pitfall 4 (GravitoVariables augmentation), Pitfall 6 (name collisions between atlas/core exception names)

### Phase 4: Config Type Unification

**Rationale:** Depends on Phase 3 (public surface stable). `GravitoConfig` + `ApplicationConfig` unification and `boot()` forwarding fix are higher risk than export changes due to type cascade across 50+ packages.
**Delivers:** `observabilityProvider` forwarded by `boot()`; `ApplicationConfig extends Pick<GravitoConfig, 'logger' | 'config'>`; no field duplication
**Implements:** Config type unification pattern (Pattern 2 from ARCHITECTURE.md)
**Avoids:** Pitfall 3 (GravitoConfig changes not forwarded by boot())

### Phase 5: Container Type Improvement

**Rationale:** Last structural change before documentation. Modifies `Container.make()` return type — highest cascade risk to all 50+ packages using Container. Isolated as its own phase so typecheck failures are attributable.
**Delivers:** `Container.make<K extends keyof ServiceMap>()` overload; eliminates `any` in the primary DI resolution path
**Implements:** Pattern 5 (Container.make() inference) from ARCHITECTURE.md — lighter overload approach, not full generic Container refactor

### Phase 6: Documentation and Tooling

**Rationale:** Tooling changes (Biome config upgrade, publint addition, TypeDoc setup) have no runtime risk and can validate the export surface changes from Phase 3. Documentation sync requires a stable API — do last.
**Delivers:** `noExplicitAny: error` in Biome (CI gate for regressions), `noConsole` rule scoped to core src, publint in Turbo pipeline, TypeDoc config for `@gravito/core`, README API sync, orbit/register/use decision guide, JSDoc language unification
**Uses:** publint ^0.3.18 (new), typedoc ^0.28.18 (new to core), Biome 2.3.10 (config changes only)

### Phase 7: v2.1.x Follow-up Validation

**Rationale:** Features that require stable Phase 1-6 output to execute correctly. Lower urgency, higher complexity.
**Delivers:** `suggestion` field on `GravitoException`, updated canonical examples, named export convergence profiling
**Addresses:** Actionable error messages, v2 example updates, potential tsserver speed improvement measurement

### Phase Ordering Rationale

- **Phases 1-2 before 3:** Export surface changes enumerate a stable symbol set. Fixing footguns and clarifying hierarchy first means the explicit named export list reflects the intended final API.
- **Phase 3 before 4-5:** Type-level changes (config unification, Container generics) compound with export changes. Isolating them makes typecheck failures attributable.
- **Phase 5 last among structural changes:** Container generics have the widest cascade risk (50+ consumers). Placing it last means a failure here does not block the higher-value Phases 1-4.
- **Phase 6 after all structural changes:** Documentation and tooling that validates the final surface cannot be written or configured until that surface is stable.
- **Full workspace typecheck (`bun run typecheck`) is the acceptance gate between every phase** — not per-package typecheck. This is the most important operational constraint from research.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Container type improvement):** The generic Container refactor (`Container<TServices>`) is a heavier approach deferred from v2.1.0. If stakeholders want to include it, it needs its own research pass on impact across 50+ consumer call sites.
- **Phase 7 (Actionable errors with `suggestion` field):** The `GravitoException` constructor extension pattern needs design work — how `suggestion` strings are structured, whether they are i18n-key-capable, how they surface in HTTP responses.

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (API Footgun Fixes):** All fixes are known, audited, and have exact file/line citations. No research needed.
- **Phase 2 (Exception Hierarchy Clarification):** JSDoc-only; documented pattern in ARCHITECTURE.md Pattern 4.
- **Phase 3 (Named Export Conversion):** Established pattern with clear audit steps from PITFALLS.md. Tooling (`tsc --declaration`) is standard.
- **Phase 4 (Config Type Unification):** `ApplicationConfig extends Pick<GravitoConfig, ...>` is a well-understood TypeScript pattern. ARCHITECTURE.md Pattern 2 covers it completely.
- **Phase 6 (Documentation and Tooling):** Biome config changes are config-file edits. publint and TypeDoc installation and config are fully documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All tool versions verified against npm registry; Biome rule existence confirmed via official docs; all recommendations from direct codebase audit |
| Features | HIGH | Every footgun has file and line citation from direct codebase read; competitor patterns (Hono, Elysia, AdonisJS) verified via web search |
| Architecture | HIGH | 875-line `index.ts` read in full; all 352 import sites grep-counted; all downstream dependency edges (fortify, sentinel, photon) confirmed from direct source reads |
| Pitfalls | HIGH | All pitfalls grounded in specific code locations confirmed via direct read; no hypothetical risks — all sourced from actual codebase state |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact count of `declare module '@gravito/core'` augmentation sites:** Research cites "14 orbit packages" but does not enumerate all 14 by name. Phase 3 planning must run `grep -r "declare module '@gravito/core'" packages/` to produce the exact list before starting export conversion.
- **Skipped test root cause:** The two skipped tests in `orbit-middleware-isolation.test.ts` are identified but their failure mode is not diagnosed. Phase 1 must investigate why they were skipped before re-enabling.
- **`index.browser.ts` full symbol inventory:** ARCHITECTURE.md audited `index.ts` (875 lines) in full but `index.browser.ts` (115 lines) was partially analyzed. Phase 3 must audit `index.browser.ts` completely to mirror named export changes.
- **`Container.make()` cascade impact:** The lighter overload approach (Pattern 5) is recommended for v2.1.0, but the exact number of call sites that would receive a type error from the heavier generic refactor is not quantified. Phase 5 planning should profile this before deciding on approach.

## Sources

### Primary (HIGH confidence)
- Direct codebase reads — `packages/core/src/index.ts`, `Router.ts`, `PlanetCore.ts`, `Application.ts`, `Container.ts`, `exceptions/*.ts`, `helpers.ts`, `adapters/bun/index.ts`, `testing/index.ts`
- Direct codebase reads — `packages/fortify/src/errors/FortifyError.ts`, `packages/sentinel/src/errors/SentinelError.ts`, `packages/sentinel/src/middleware/auth.ts`
- npm registry — publint@0.3.18, typedoc@0.28.18, knip@6.1.0, @microsoft/api-extractor@7.57.7 (verified 2026-03-29)
- [Biome noConsole rule](https://biomejs.dev/linter/rules/no-console/) — official docs confirming allow-list support
- [publint rules](https://publint.dev/rules) — exports field validation scope confirmed

### Secondary (MEDIUM confidence)
- [What's New in Biome v2.4](https://medium.com/@onix_react/whats-new-in-biome-v2-4-00890baad13b) — noConsole in suspicious group confirmed
- [AdonisJS v6 Released — InfoQ](https://www.infoq.com/news/2024/03/adonisjs-v6-released/) — documentation improvement motivation
- [Barrel files — stop using them — DEV Community](https://dev.to/tassiofront/barrel-files-and-why-you-should-stop-using-them-now-bc4) — tsserver performance impact
- [Hono Best Practices](https://hono.dev/docs/guides/best-practices) — no stdout in library code convention
- [Elysia tsserver performance issue #1031](https://github.com/elysiajs/elysia/issues/1031) — barrel file DX impact

### Tertiary (LOW confidence)
- Effect `suggestion` field pattern — inferred from ecosystem trend toward actionable error messages; not a direct Effect API feature

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
