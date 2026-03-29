# Pitfalls Research

**Domain:** DX improvements to an existing TypeScript monorepo — star export removal, exception consolidation, config type changes, @internal API hiding, with 38 downstream consumers
**Researched:** 2026-03-29
**Confidence:** HIGH (based on direct codebase analysis of gravito-core v2.0.0 state)

---

## Critical Pitfalls

### Pitfall 1: Star Export Removal Silently Breaks Re-Exporting Packages

**What goes wrong:**
When `export * from './exceptions'` in `packages/core/src/index.ts` is replaced with explicit named exports, any downstream package that does `export { HttpException } from '@gravito/core'` continues to work fine — but packages that do `export * from '@gravito/core'` or that relied on an exception class being in the namespace _without knowing the exact import path_ will break at TypeScript check time. The breakage is silent at runtime (modules are still exported) but shows as type errors in dependent packages.

In this repo, `packages/photon/src/http-exception.ts` already re-exports `HttpException` from `@gravito/core`. If the star export from `./exceptions` is removed and `HttpException` is no longer in the explicit named list, photon's re-export silently exports `undefined` at runtime even though TypeScript already reported an error.

**Why it happens:**
Star exports collapse namespaces. When `export * from './exceptions'` covers 17 classes at once, a developer removing it for a "named-only" refactor may only explicitly list the ones they _remember_. The test suite for `@gravito/core` itself passes; failures appear only when running `bun run typecheck` at the workspace root or when affected packages rebuild.

**How to avoid:**
Before removing any `export *`, generate a full symbol inventory: `tsc --declaration --emitDeclarationOnly` produces `.d.ts` files listing every exported symbol. Diff the symbol list before and after the change. Gate the phase on `bun run typecheck` passing across all 38 consumers, not just the package under edit.

**Warning signs:**
- `bun run typecheck` passes for `packages/core` but fails for `packages/photon`, `packages/sentinel`, or `packages/fortify`
- A symbol appears as `any` or `undefined` in downstream `.d.ts` output after the change
- Any package using `export * from '@gravito/core'` starts emitting "Module X has no exported member Y"

**Phase to address:**
Module organization cleanup phase — must run full workspace typecheck (`bun run typecheck`) as acceptance gate, not just per-package typecheck.

---

### Pitfall 2: AuthException / AuthenticationException Consolidation Breaks Catch Blocks and instanceof Checks

**What goes wrong:**
Currently the codebase has two coexisting but semantically different auth exception classes:
- `AuthException` — abstract base class, extended by `FortifyError` and `SentinelError`
- `AuthenticationException` — concrete leaf class, thrown by `sentinel` middleware

If consolidation removes `AuthException` in favor of `AuthenticationException` (or vice versa), any `catch (e) { if (e instanceof AuthException) }` block in consuming application code stops matching. Because `instanceof` checks cross ESM/CJS boundaries, the failure can be silent at compile time (the class name is still exported) but broken at runtime (the prototype chain is wrong).

Specifically: `fortify` (`FortifyError extends AuthException`) and `sentinel` (`SentinelError extends AuthException`, separate from `AuthenticationException`) both depend on `AuthException` existing as an abstract base. Removing it forces both packages to change their hierarchy in the same release.

**Why it happens:**
Two classes with overlapping names exist because they were added at different times for different purposes (`AuthException` as an abstract domain base, `AuthenticationException` as a concrete HTTP 401 class). Consolidation looks superficially simple — "they're the same thing" — but their inheritance roles differ.

**How to avoid:**
Do not delete `AuthException`. Deprecate it with `@deprecated` JSDoc pointing to the replacement, keep it as a re-export alias for one release cycle. Mark with `@deprecated` and export the alias:
```typescript
/** @deprecated Use AuthenticationException instead */
export { AuthenticationException as AuthException } from './AuthenticationException'
```
Only remove in a subsequent major version. This keeps `instanceof AuthException` working via the prototype chain.

**Warning signs:**
- `FortifyError` or `SentinelError` constructor calls throw at runtime even though TypeScript is clean
- Auth middleware starts returning 500 instead of 401 (catch block missed)
- `e instanceof AuthException` returns `false` for errors that are clearly auth errors

**Phase to address:**
API footgun / exception naming phase — add deprecation before removing, never remove in the same PR that adds the replacement.

---

### Pitfall 3: GravitoConfig Type Changes Break defineConfig() Consumers at Runtime Without TypeScript Errors

**What goes wrong:**
`defineConfig()` in `packages/core/src/index.ts` is typed as `(config: GravitoConfig): GravitoConfig`. It is a pass-through identity function — it does no validation at runtime. If `GravitoConfig` adds new required fields or changes an existing field's type (e.g., `observability` going from `unknown` to a structured type), consumer `gravito.config.ts` files across applications will:

1. Fail TypeScript typecheck if the new field is required
2. Pass TypeScript typecheck but break at runtime if the new field is optional but `boot()` now dereferences it differently

The `boot()` footgun already present (`observabilityProvider` is not forwarded from `GravitoConfig` to the `PlanetCore` constructor — see `PlanetCore.ts` line 788-811) means that even fixing `GravitoConfig` to include `observabilityProvider` may not fix the runtime behavior unless `boot()` is also patched to pass it through.

**Why it happens:**
`GravitoConfig` is an exported type contract, but `boot()` destructures it manually and can fall behind when new fields are added to the type. The identity function `defineConfig()` provides zero runtime protection.

**How to avoid:**
When adding or changing any field in `GravitoConfig`:
1. Check every place `GravitoConfig` is destructured (grep for `config.observability`, `config.adapter`, etc.)
2. Ensure `boot()` forwards every field from `GravitoConfig` to the `PlanetCore` constructor
3. Add a test that passes a `GravitoConfig` with the new field through `boot()` and asserts the field is reachable on the resulting instance

**Warning signs:**
- A new field added to `GravitoConfig` typechecks clean but `PlanetCore.boot()` doesn't use it
- `defineConfig({ observabilityProvider: ... })` compiles but the provider is silently ignored at runtime
- Application code passes `config.newField` and gets `undefined` despite setting it

**Phase to address:**
Config type changes phase — pair every `GravitoConfig` change with a `boot()` audit and a test that verifies propagation end-to-end.

---

### Pitfall 4: Hiding @internal Exports Breaks Module Augmentation in Orbit Packages

**What goes wrong:**
`GravitoVariables` is extended via TypeScript module augmentation in at least 14 packages:
```typescript
declare module '@gravito/core' {
  interface GravitoVariables { myService: MyService }
}
```
Module augmentation only works when the augmented interface is exported from the package's public surface. If `GravitoVariables` is moved behind an `@internal` barrel or removed from the root export of `@gravito/core`, the `declare module '@gravito/core'` blocks in all 14 consuming packages silently augment the _wrong_ declaration, causing the added fields to be invisible to TypeScript. Application code gets `Property 'myService' does not exist on type 'GravitoVariables'` errors across the entire monorepo.

This also applies to any interface that downstream packages augment: `GravitoContext`, `GravitoOrbit`, `GravitoConfig` augmentable sections.

**Why it happens:**
`@internal` tagging is a documentation convention, not a TypeScript enforced boundary. A developer sees `@internal` on a helper and removes it from the public index, not realizing that 14 other packages depend on the interface being at the `@gravito/core` module resolution path.

**How to avoid:**
Never move any interface that has `declare module '@gravito/core'` augmentations out of the public export surface. Use a dedicated `@public` JSDoc tag on all augmentable interfaces and include in the PR description: "This interface is augmented in N packages — do not make @internal."

Before any export cleanup, grep for `declare module '@gravito/core'` to enumerate all augmentation sites.

**Warning signs:**
- After hiding an interface, `bun run typecheck` emits errors in unrelated orbit packages
- `ctx.vars.myService` starts returning `any` instead of a typed service
- Module augmentation blocks in orbit packages show TypeScript warning "Augmentations for the global scope can only be directly nested in external modules or ambient module declarations"

**Phase to address:**
Star export / module organization phase — before removing any export, run `grep -r "declare module '@gravito/core'" packages/` to identify all augmentation sites.

---

### Pitfall 5: Router console.log Removal Masks Missing Test Coverage

**What goes wrong:**
`packages/core/src/Router.ts` line 610 has `console.log('[Router] Registering ...')`. Removing it is correct for DX, but this log is often the only signal in failing tests that a route was registered at the wrong path. After removal, failing route tests produce no useful diagnostic output, making flaky or broken tests much harder to debug.

More critically: the two skipped tests in `packages/core/tests/orbit-middleware-isolation.test.ts` were likely skipped _because_ route registration debugging was done via this log. Removing the log without first re-enabling and fixing those skipped tests risks shipping broken middleware isolation silently.

**Why it happens:**
Removing debug logs is treated as a pure cleanup. The dependency between a specific log statement and the ability to diagnose test failures is invisible until a test breaks in CI.

**How to avoid:**
Before removing `console.log` from `Router.ts`, investigate and fix the two skipped middleware isolation tests (`orbit-middleware-isolation.test.ts`). Ensure test failure messages are sufficient without the log. Add a `debug` flag to Router that emits route registration logs only when explicitly enabled (e.g., `new Router({ debug: true })`).

**Warning signs:**
- Skipped tests (`it.skip`) remain skipped after the console.log is removed
- Route-related test failures produce no useful diagnostic output
- CI passes but `bun test --verbose` shows no route registration confirmation

**Phase to address:**
API footgun fixes phase — fix skipped tests before removing the log, not after.

---

### Pitfall 6: Barrel Refactoring Creates Name Collisions Between Modules

**What goes wrong:**
`packages/atlas/src` exports `ModelNotFoundError` (a `DatabaseException` subclass). `packages/core/src/exceptions` exports `ModelNotFoundException` (a separate class). When `export * from './exceptions'` in core is replaced with named exports, the opportunity to accidentally include `ModelNotFoundError` from an atlas import or vice versa creates name collision errors. More dangerously: if a developer adds `export { ModelNotFoundError as ModelNotFoundException }` as an alias without realizing the class hierarchy differs (one extends `DatabaseException`, the other extends `HttpException`), catch blocks in atlas-consuming code start matching the wrong class.

**Why it happens:**
Similar names across packages are a natural result of the domain model. Barrel refactoring that collapses multiple namespaces increases collision risk.

**How to avoid:**
When refactoring barrels, explicitly verify that no re-exported symbol name appears in more than one source module. The TypeScript compiler will catch _type_ conflicts but not _semantic_ conflicts when two classes have the same name and compatible structures.

**Warning signs:**
- `tsc` reports "Duplicate identifier" during barrel refactoring
- `instanceof ModelNotFoundException` starts returning `false` in atlas error handlers
- Code that previously caught `ModelNotFoundException` starts catching atlas database errors

**Phase to address:**
Module organization cleanup phase — run symbol deduplication check after every barrel change.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `export * from './exceptions'` as-is | No downstream breakage | Uncontrolled namespace growth, makes tree-shaking harder | Acceptable until explicit audit is done |
| Add `@deprecated` JSDoc only, no runtime warning | Clean deprecation without behavior change | Developers ignore JSDoc-only deprecations | Only if CI enforces `no-deprecated` lint rule |
| Keep `AuthException` as alias to `AuthenticationException` | Avoids breaking `fortify`/`sentinel` | Two names for overlapping concepts remain in docs | Acceptable for one minor version cycle |
| `any` on `GravitoVariables` core properties (current state: `core?: unknown`) | Avoids circular reference | IDE offers no autocomplete for `ctx.vars.core` | Acceptable while circular ref exists; fix with opaque type |
| Defer skipped tests (`it.skip`) | Faster CI | Middleware isolation could be broken undetected | Never — fix before shipping DX improvements |

---

## Integration Gotchas

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|------------------|
| `GravitoVariables` augmentation in orbit packages | Moving the interface out of the public export breaks all `declare module` blocks | Keep `GravitoVariables` at the root public export of `@gravito/core` permanently |
| `photon` re-exporting from `@gravito/core` | Removing a core export breaks photon's re-export without a core typecheck failure | Run full workspace typecheck after every core export change |
| `fortify` extending `AuthException` | Renaming/removing `AuthException` forces `fortify` to change its class hierarchy | Deprecate with alias; never remove in the same release |
| `sentinel` using `AuthenticationException` | Both `AuthException` and `AuthenticationException` are imported; consolidating them changes catch semantics | Keep both exported; make `AuthenticationException extends AuthException` |
| `defineConfig()` in consumer `gravito.config.ts` | Adding required fields to `GravitoConfig` without a migration guide | Make all new config fields optional with sensible defaults for one release |
| Module augmentation `declare module '@gravito/core'` | 14 orbit packages use this; any export surface change breaks them | Grep for augmentations before any export cleanup |
| `instanceof` checks across ESM/CJS boundaries | Renaming a class while keeping the same file path silently breaks instanceof | `Object.setPrototypeOf(this, new.target.prototype)` already in place — preserve it in all new exception classes |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Adding required runtime validation to `defineConfig()` | Boot time increases; tests that construct config objects inline slow down | Keep `defineConfig()` as identity function; do validation in `boot()` with a fast Zod schema | At ~100+ boot cycles in test suite |
| Eager-loading all exception classes during import | First import of `@gravito/core` triggers loading 17 exception classes even if only `PlanetCore` is used | Lazy-load exception sub-modules; the current `export * from './exceptions'` already defers to module bundler | No threshold — affects cold start time |
| Deep `instanceof` chains for exception hierarchy checks | `e instanceof GravitoException` checked before more specific classes is O(chain depth) | Order catch blocks from most specific to least specific; document hierarchy depth | Not a concern at current hierarchy depth (3 levels) |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing `@internal` bootstrap helpers in public API surface | Internal helpers may manipulate global state or bypass validation; making them public invites misuse | Keep `setGlobalCore()` and similar bootstrap helpers behind explicit `@internal` — and verify they are not in the named export list |
| Removing type-narrowing from `GravitoVariables` | Wide `[key: string]: unknown` makes it easy to access sensitive context properties without type checking | Keep typed core properties (`core?: PlanetCore`) even at risk of needing an opaque type to avoid circular ref |
| README examples showing unsafe config patterns | Outdated examples may use deprecated/removed APIs that expose security gaps | Update examples as part of the same PR that changes the API, not separately |

---

## "Looks Done But Isn't" Checklist

- [ ] **Star export removal:** Verify with `bun run typecheck` at workspace root, not just `cd packages/core && bun run typecheck` — they check different things
- [ ] **Exception consolidation:** Verify `instanceof AuthException` still returns `true` in both `fortify` and `sentinel` after any renaming
- [ ] **GravitoConfig change:** Verify that `PlanetCore.boot()` actually uses the new/changed field — grep for every field name in `GravitoConfig` and confirm it appears in `boot()`
- [ ] **@internal hiding:** Verify that no `declare module '@gravito/core'` block in any orbit package references the hidden interface — run `grep -r "declare module '@gravito/core'" packages/`
- [ ] **README update:** Verify examples compile against the current API by adding them as `//example` blocks in a type-check-only test file
- [ ] **console.log removal from Router:** Verify the two skipped tests in `orbit-middleware-isolation.test.ts` are re-enabled and passing before removing the log
- [ ] **`defineConfig()` change:** Verify a fresh `gravito.config.ts` using the new API compiles without errors in a separate `examples/` directory test

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Star export removed, downstream package broken | MEDIUM | Re-add the missing named export, release a patch version, run workspace typecheck to confirm |
| AuthException removed, fortify/sentinel broken | HIGH | Restore the abstract class, re-export both names, publish patch to affected packages before any consumers update |
| GravitoConfig field added, boot() doesn't use it | LOW | Add the missing forward in `boot()`, add regression test, patch release |
| @internal hiding breaks module augmentation | HIGH | Restore the interface to the public export immediately; augmentation blocks in 14 packages all fail simultaneously; requires republishing core and all affected orbit packages |
| Router console.log removed, skipped tests reveal breakage | MEDIUM | Re-add the log temporarily, fix the failing middleware isolation tests, then remove the log in a follow-up PR |
| AuthException renamed to AuthenticationException without alias | HIGH | Restore old name as an alias (`export { AuthenticationException as AuthException }`); issue a semver minor version (not major) since it was previously shipped as stable API |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Star export removal breaks downstream | Module organization cleanup | `bun run typecheck` at workspace root with zero errors |
| AuthException consolidation breaks instanceof | API footgun / exception naming | `grep -rn "instanceof Auth"` returns non-zero results; each result still compiles and passes at runtime |
| GravitoConfig changes not forwarded by boot() | Config type unification | Test: `PlanetCore.boot(config)` with every `GravitoConfig` field populated; assert each field on resulting instance |
| @internal hiding breaks module augmentation | Module organization cleanup | `grep -r "declare module '@gravito/core'" packages/` returns list; each listed file compiles after export change |
| Router console.log removal masks broken tests | API footgun fixes | Skipped tests in `orbit-middleware-isolation.test.ts` re-enabled and passing before log is removed |
| Barrel refactor creates name collisions | Module organization cleanup | Symbol deduplication check: no exported name appears in two different source modules |
| README drift (fixed without CI enforcement) | Documentation sync | Compile-check every README code block via `examples/` or a dedicated type-test file; add to CI |
| `any` elimination introduces breaking generic changes | Type safety phase | `bun run typecheck` at workspace root; check that photon, sentinel, forge still compile with no new errors |

---

## Sources

- Direct codebase analysis: `packages/core/src/exceptions/index.ts`, `AuthException.ts`, `AuthenticationException.ts`
- Direct codebase analysis: `packages/core/src/PlanetCore.ts` (boot() body, lines 788-811)
- Direct codebase analysis: `packages/core/src/index.ts` (star export sites, lines 392-874)
- Direct codebase analysis: `packages/core/src/Router.ts` (console.log line 610, ModelNotFound string compare lines 436/475)
- Direct codebase analysis: `packages/core/src/http/types.ts` (GravitoVariables module augmentation pattern)
- Direct codebase analysis: `packages/fortify/src/errors/FortifyError.ts` (extends AuthException)
- Direct codebase analysis: `packages/sentinel/src/errors/SentinelError.ts` (extends AuthException)
- Direct codebase analysis: `packages/sentinel/src/middleware/auth.ts` (throws AuthenticationException)
- Direct codebase analysis: `packages/atlas/src/orm/model/errors.ts` (ModelNotFoundError vs ModelNotFoundException naming)
- Direct codebase analysis: 14 orbit packages augmenting `GravitoVariables` via `declare module '@gravito/core'`
- Codebase concerns: `.planning/codebase/CONCERNS.md` (skipped tests, ESM/CJS build complexity)
- Project context: `.planning/PROJECT.md` (v2.1.0 DX goals, 38 downstream consumers, TypeScript strict constraint)

---
*Pitfalls research for: DX improvements to @gravito/core in a 38-consumer TypeScript monorepo*
*Researched: 2026-03-29*
