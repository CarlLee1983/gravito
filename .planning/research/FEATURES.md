# Feature Research

**Domain:** TypeScript framework DX (developer experience) — @gravito/core v2.1.0
**Researched:** 2026-03-29
**Confidence:** HIGH — codebase audit + verified patterns from Hono, Elysia, AdonisJS, Effect, NestJS

---

## Context: What Was Already Built

The v2.0.0 milestone shipped a production-ready error model and resilience layer. v2.1.0 targets
**developer experience improvements only** — no new runtime features. DX in this context means:
the experience of a developer writing code against `@gravito/core` API for the first time or
the fifth time; what they see in their editor, what they read in docs, and how fast they get unblocked.

Known footguns audited from codebase (confirmed, HIGH confidence):

| Footgun | Evidence | Impact |
|---------|----------|--------|
| `Router.ts:610` — `console.log` leaks on every route registration | Direct codebase read | Every request handler registration pollutes stdout in prod |
| `Router.ts:436` — `throw new Error('ModelNotFound')` string-compare sentinel | Direct codebase read | Brittle: string comparison `=== 'ModelNotFound'` on line 475; any typo silently breaks 404 handling |
| `AuthException` vs `AuthenticationException` naming conflict | Both exist in `exceptions/` | Confusing hierarchy — `AuthException` is abstract base, `AuthenticationException` is concrete; names don't communicate this clearly |
| `core.services` public deprecated `Map` | `PlanetCore.ts:203` has `@deprecated Use core.container instead` | Deprecated API is still public, no runtime warning, leads new devs to wrong pattern |
| 69 occurrences of `: any` / `<any>` in public-facing src | Grep count across 31 files | Type safety holes surface as `any` propagation into user code |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features any production TypeScript framework must have. Missing these = framework feels amateurish.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Zero-noise stdout in production** | Frameworks never log to stdout in library code — Hono, Elysia, Express all use logger hooks, not direct `console.log` | LOW | One fix: `Router.ts:610` — replace with `this.logger?.debug(...)` or remove entirely |
| **Typed exception hierarchy that is self-documenting** | NestJS, AdonisJS, Effect all use names that communicate role — `HttpException`, `NotFoundException`; two "auth" classes with similar names breaks this | LOW | Rename `AuthException` → `AuthBaseException` or merge; JSDoc `@deprecated` on old name |
| **No deprecated API in discoverable surface** | Star-exported deprecated APIs appear in IDE autocomplete, training devs into wrong patterns | LOW | Add `@deprecated` JSDoc annotation + TypeScript `@deprecated` tag on `services` property; consider `@internal` move |
| **Actionable runtime error messages** | Hono prints "Expected a Response object" with the handler signature; Elysia prints the mismatched type. Raw `new Error('ModelNotFound')` as sentinel value gives IDE-opaque errors | MEDIUM | Replace string sentinel with `throw new ModelNotFoundException(param, value)` directly; remove intermediate string throw |
| **Stable, discoverable public API** | Star exports (`export *`) from large barrel files break IDE completion ranking, slow tsserver, and hide what's truly public — documented by Vercel, AdonisJS, and TypeScript core team | MEDIUM | Converge `export *` usages (currently 15+ in `index.ts`) into explicit named exports for the public surface |
| **README that matches current API** | EventManager/HookManager public methods documented in README must match source exactly; mismatches are #1 new-dev frustration (NestJS community issues, AdonisJS v6 launch post-mortem) | LOW | Audit README API section against source; sync or remove stale examples |
| **Consistent JSDoc across public API** | IDE tooltip is the primary discovery surface; inconsistent or missing `@param`/`@returns`/`@example` forces devs to read source | LOW | Already 100% covered (v1.4.0), but language consistency (Chinese/English mix) breaks IDE experience |

### Differentiators (Competitive Advantage)

Features that distinguish Gravito's DX from competitors — not required, but meaningful.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Actionable error messages with fix suggestions** | Effect and Zod lead the ecosystem here — errors say "Did you mean X?" or "You likely forgot to call boot()" rather than raw stack traces. No framework does this systematically for DI/config errors | HIGH | Requires error constructor to accept `suggestion?: string`; applies to DI resolution failures, config errors, lifecycle errors |
| **`orbit` / `register` / `use` decision guide** | AdonisJS v6 explicitly called out in their launch notes that `container.bind` vs `singleton` vs service providers confused devs; same problem exists here with `orbit()`, `register()`, `use()` having subtle behavioral differences | LOW | A single "when to use which" doc section + JSDoc cross-references pays huge dividends |
| **Type-safe container with zero `any` in public generics** | tsyringe/typedi still use `any` in resolution path; Gravito's `Container<ServiceMap>` augmentation pattern is ahead — but 69 `any` usages in public src undercut this story | HIGH | Requires audit of `HookManager`, `Router`, `TestResponse`, `engine/types.ts` for `: any` in callable public API |
| **v2-correct examples** | Hono's playground examples always use latest API; Elysia ships working examples in the repo. Gravito has 20+ example directories; if they use v1 patterns, they actively mislead | LOW | Update 3-5 key examples (`ecommerce-mvc`, `blog-mvc`, `auth-verification`) to v2 API |
| **Troubleshooting FAQ covering top 5 bootstrap errors** | NestJS has an official FAQ page covering DI errors, circular deps, etc.; AdonisJS added a "common gotchas" page in v6. These dramatically reduce issue noise | LOW | 5 entries in a troubleshooting doc: boot() order, orbit vs register, ModelNotFound setup, container augmentation, GravitoConfig typing |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Global `export *` expansion** | Seems to make "everything available" from one import | Barrel files slow tsserver (documented TypeScript perf issue), break tree-shaking, collapse discriminated namespace info in autocomplete | Explicit named exports grouped by category in index.ts — same discoverability, better tooling |
| **Runtime type validation on every API call** | Elysia does this with Eden; looks like DX improvement | Adds latency; Gravito targets Bun performance story; type-level validation (compile-time) is the correct layer for a framework | Keep validation at Zod/schema layer in user code; framework trusts TypeScript at runtime |
| **Automatic deprecation migration scripts** | Seems helpful for `services` → `container` migration | High maintenance burden; scripts bitrot faster than docs; generates false confidence | Clear `@deprecated` JSDoc + one-line README migration note is sufficient |
| **Universal i18n on exception messages** | `GravitoException` already has `i18nKey`; tempting to localize all error text | Framework errors should be in English for searchability and GitHub issues; i18n is for end-user messages, not developer errors | Reserve `i18nKey` for user-facing exception messages propagated to HTTP responses; internal errors stay English |
| **Auto-generated README from JSDoc** | TypeDoc can do this; keeps docs "always up to date" | Auto-generated READMEs are verbose, miss narrative context, and look machine-generated — Hono and AdonisJS write READMEs by hand | Use TypeDoc for API reference site; hand-maintain the README's "why/how" narrative |

---

## Feature Dependencies

```
[Zero-noise stdout]
    └── LOW — standalone, no deps

[Typed exception hierarchy cleanup]
    └── enables──> [Actionable error messages with fix suggestions]
                       └── uses──> [Consistent JSDoc]

[Stable named exports]
    └── improves──> [IDE discoverability]
    └── requires──> [Deprecated API cleanup]

[v2 examples]
    └── requires──> [README sync] (examples should match README)

[Troubleshooting FAQ]
    └── requires──> [orbit/register/use decision guide]
    └── informed-by──> [Typed exception hierarchy cleanup]
```

### Dependency Notes

- **Exception cleanup blocks actionable errors:** You can't add `suggestion` fields to errors until the hierarchy is stable — otherwise you're building on a foundation that may rename.
- **Named exports and deprecated API are coupled:** Converting `export *` to named exports is the natural time to drop the deprecated `services` property from the public surface.
- **Examples must come after README sync:** Examples that contradict the README create worse confusion than no examples.

---

## MVP Definition

This milestone is an improvement pass, not a greenfield MVP. The definition of "done" is:
no new footgun surfaces, docs match code, onboarding path is clear.

### Launch With (v2.1.0)

- [ ] **Remove Router console.log** — zero-noise stdout in library code; 5-minute fix with disproportionate professional signal
- [ ] **Fix ModelNotFound string sentinel** — replace `throw new Error('ModelNotFound')` with direct `throw new ModelNotFoundException(param, value)`; eliminates brittle string comparison
- [ ] **Clarify AuthException vs AuthenticationException** — rename or add JSDoc clarifying `AuthException` is abstract base, `AuthenticationException` is the concrete 401 class; add `@deprecated` redirects if renaming
- [ ] **Mark `core.services` with TypeScript `@deprecated`** — IDE will show strikethrough; no runtime cost
- [ ] **README API section sync** — audit EventManager/HookManager public methods in README; fix 3-5 concrete discrepancies; add helpers module table
- [ ] **JSDoc language unification** — decide English-only or Chinese+English; apply consistently across public API (already 100% covered, this is language consistency only)
- [ ] **`orbit` vs `register` vs `use` explanation** — one section in docs, cross-referenced from each method's JSDoc `@see`

### Add After Validation (v2.1.x)

- [ ] **Named export convergence** — convert `export *` from `./exceptions`, `./helpers/data`, `./helpers/errors`, `./helpers/response` to explicit named exports; profile tsserver speed improvement before/after
- [ ] **Actionable error messages with `suggestion` field** — extend `GravitoException` constructor to accept optional `suggestion: string`; apply to top 5 DI resolution errors and config errors
- [ ] **Update 3-5 canonical examples** — `ecommerce-mvc`, `blog-mvc`, `auth-verification` to use v2 API patterns (container augmentation, GravitoException, orbit registration)

### Future Consideration (v2.2+)

- [ ] **Type-safe public API (zero `any` in generics)** — systematic audit of 69 `any` usages; high complexity, requires careful generic threading; better deferred until API surface is stabilized
- [ ] **Troubleshooting FAQ document** — 5-entry FAQ covering boot order, orbit vs register, ModelNotFound setup, container augmentation, GravitoConfig typing; low complexity but requires stabilized API to write accurately
- [ ] **TypeDoc API reference site** — generate from existing JSDoc; useful once named exports are converged (ensures generated output is clean)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Remove Router console.log | HIGH — affects all prod users | LOW | P1 |
| Fix ModelNotFound string sentinel | HIGH — affects all model binding users | LOW | P1 |
| AuthException/AuthenticationException clarity | HIGH — confuses new devs daily | LOW | P1 |
| README API sync | HIGH — first thing new devs read | LOW | P1 |
| `core.services` @deprecated annotation | MEDIUM — reduces wrong-path discovery | LOW | P1 |
| orbit/register/use decision guide | HIGH — top onboarding confusion | LOW | P1 |
| JSDoc language unification | MEDIUM — affects IDE DX quality | LOW | P1 |
| Named export convergence | MEDIUM — IDE perf + discoverability | MEDIUM | P2 |
| Actionable errors with suggestion field | HIGH — dramatically reduces support burden | HIGH | P2 |
| Update canonical examples | MEDIUM — affects new-dev success rate | LOW | P2 |
| Zero `any` in public generics | HIGH long-term — type propagation safety | HIGH | P3 |
| Troubleshooting FAQ | MEDIUM — reduces GitHub issue noise | LOW | P3 |
| TypeDoc API reference site | LOW short-term | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v2.1.0 — targeted fixes with high value-to-effort ratio
- P2: Should have — add in v2.1.x follow-up
- P3: Nice to have — future milestone

---

## Competitor Feature Analysis

How comparable frameworks handle the same DX concerns in 2025-2026:

| DX Concern | Hono | Elysia | AdonisJS v6 | Effect | Gravito Current | Gravito Target |
|------------|------|--------|-------------|--------|-----------------|----------------|
| **Error messages** | HTTP errors with typed status codes; no suggestion strings | Type-mismatch errors surfaced at compile time via Eden inference | Descriptive runtime errors; container errors include binding name | Full typed error channel in type signature; `Effect.fail(new MyError())` | Raw `Error('ModelNotFound')` strings; actionable messages inconsistent | `ModelNotFoundException` direct; optional `suggestion` field on `GravitoException` |
| **No stdout leaks** | Zero — no console.log in library code | Zero — events only | Zero | Zero | `Router.ts:610` console.log on every route | Remove; route to `this.logger.debug()` |
| **Public API discoverability** | Explicit named exports; small surface | Named + plugin-extended; structured | Explicit named exports; IoC docs comprehensive | Fully typed modules, explicit imports | 15+ `export *` in index.ts; 830-line barrel file | Converge to explicit named exports |
| **Deprecated API handling** | Removed promptly; changelog notes | Removed with migration guide | `@deprecated` JSDoc + migration doc | N/A — breaking changes gated by major version | `services` prop still public and exported | `@deprecated` TypeScript annotation; move to `@internal` |
| **Container DX** | No DI container | No built-in DI | Simplified IoC in v6; extensive docs | Dependency via `Context` layer | `ServiceMap` augmentation pattern is industry-leading concept | Eliminate `any` in resolution path; add decision guide |
| **Documentation accuracy** | Manually maintained; high accuracy | Rapidly evolving; occasional lag | Comprehensive v6 rewrite; high accuracy | Excellent — type-driven so docs match types | JSDoc 100% (v1.4.0) but language inconsistency; README has stale API | Language-unified JSDoc; README audit |
| **Onboarding examples** | Working examples in repo; playground | Eden examples; interactive playground | `create-adonisjs` scaffolding with fresh examples | Comprehensive introductory docs | 20+ examples but may use v1 API | 3-5 canonical examples updated to v2 |

---

## Evidence-Based Confidence Notes

**HIGH confidence (direct codebase verification):**
- `console.log` in Router.ts — confirmed line 610
- String sentinel `'ModelNotFound'` — confirmed lines 436, 475
- `AuthException` vs `AuthenticationException` coexistence — confirmed both files exist
- `core.services` deprecated property — confirmed `@deprecated` JSDoc comment exists but no TypeScript `@deprecated` annotation or `@internal` tag
- 69 `any` occurrences in public src — counted via grep across 31 files
- 15+ `export *` in index.ts — confirmed via grep

**MEDIUM confidence (WebSearch-verified patterns):**
- Barrel file tsserver perf impact — multiple GitHub TypeScript issues + DEV community article
- Framework `console.log` conventions — Hono/Elysia/AdonisJS confirmed no stdout leaks in library code
- AdonisJS v6 documentation improvements motivation — InfoQ article + official blog
- Elysia tsserver slowdown with large route sets — GitHub issue #1031

**LOW confidence (training data + single source):**
- Exact Hono error message format for context variable type mismatches — needs direct verification
- Effect's `suggestion` field pattern — Effect uses typed errors, not string suggestions; this is an inference from the ecosystem trend, not a direct Effect feature

---

## Sources

- [Hono Best Practices — hono.dev](https://hono.dev/docs/guides/best-practices)
- [Hono vs Elysia 2026 — PkgPulse](https://www.pkgpulse.com/blog/hono-vs-elysia-2026)
- [AdonisJS v6 Released — InfoQ](https://www.infoq.com/news/2024/03/adonisjs-v6-released/)
- [AdonisJS Dependency Injection docs](https://docs.adonisjs.com/guides/concepts/dependency-injection)
- [Barrel files — stop using them — DEV Community](https://dev.to/tassiofront/barrel-files-and-why-you-should-stop-using-them-now-bc4)
- [pretty-ts-errors VSCode extension](https://github.com/yoavbls/pretty-ts-errors) — evidence of ecosystem demand for readable errors
- [Elysia tsserver performance issue #1031](https://github.com/elysiajs/elysia/issues/1031)
- [TypeScript DI containers comparison — LogRocket](https://blog.logrocket.com/top-five-typescript-dependency-injection-containers/)
- [Effect typed errors intro — aleksandra.codes](https://www.aleksandra.codes/effect-intro)
- Direct codebase reads: `packages/core/src/Router.ts`, `packages/core/src/exceptions/*.ts`, `packages/core/src/PlanetCore.ts`, `packages/core/src/index.ts`

---
*Feature research for: @gravito/core v2.1.0 DX improvements*
*Researched: 2026-03-29*
