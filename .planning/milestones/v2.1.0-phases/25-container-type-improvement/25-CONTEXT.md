# Phase 25: Container Type Improvement - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Make `Container.make()` return concrete types when called with a ServiceMap-registered key, eliminating `any` and manual casts in the primary DI resolution path. Fix `ServiceMap` to properly support TypeScript module augmentation. Scope is strictly limited to TYPE-02 — Container type improvement only.

</domain>

<decisions>
## Implementation Decisions

### ServiceMap Type Fix
- **D-01:** Change `export type ServiceMap = {}` to `export interface ServiceMap {}` in Container.ts to enable proper TypeScript module augmentation (declaration merging). The existing `type` alias prevents downstream packages from augmenting ServiceMap via `declare module`.
- **D-02:** Synchronously update Container.d.ts to match — keep the manual maintenance approach. Do not switch to build-generated .d.ts.

### Overload Verification
- **D-03:** Expand existing `service-map.test.ts` with additional tests: type inference verification (confirm return type is concrete, not `any`) and fallback behavior for keys not in ServiceMap. The existing overload signatures (`make<K extends keyof ServiceMap>(key: K): ServiceMap[K]` + `make<T>(key: ServiceKey): T`) are already present — verify they work correctly after the type→interface change.

### Downstream Package Adoption
- **D-04:** This phase modifies ONLY `packages/core/`. No orbit packages receive ServiceMap augmentation. Adoption is left for v2.2 or individual package maintainers. This aligns with v2.1.0 scope (core DX only).

### Cast Cleanup
- **D-05:** No cleanup of existing `as T` or `as any` casts in downstream packages. Correct sequence: fix type foundation (this phase) → adopt ServiceMap augmentation (future) → clean up casts (future). Cleaning casts without augmentation would just change one cast pattern to another.

### Claude's Discretion
- Biome ignore comment update (currently says "empty interface" but code was `type`)
- JSDoc wording adjustments on ServiceMap
- Test structure within service-map.test.ts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Code (modification targets)
- `packages/core/src/Container.ts` — Lines 17-37: `ServiceMap` type definition (change to interface), `ServiceKey` type
- `packages/core/src/Container.ts` — Lines 183-185: `make()` overload signatures (verify, do not change)
- `packages/core/src/Container.d.ts` — Lines 20-25: `ServiceMap` declaration (sync with .ts change)
- `packages/core/src/Container.d.ts` — Lines 133-134: `make()` overload signatures (verify consistency)

### Test Files
- `packages/core/tests/service-map.test.ts` — Existing ServiceMap type safety tests (expand)

### Requirements
- `.planning/REQUIREMENTS.md` — TYPE-02 definition
- `.planning/REQUIREMENTS.md` — TYPE-04 (Container full generic refactor) explicitly OUT OF SCOPE for v2.1.0

### Success Criteria (from ROADMAP.md)
- SC-1: `container.make('myService')` where 'myService' is a key in ServiceMap returns the concrete type — TypeScript infers without cast
- SC-2: `container.make()` with a key not in ServiceMap still compiles and returns existing fallback type — no call sites broken
- SC-3: `bun run typecheck` at workspace root passes with zero errors

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ServiceMap` type (Container.ts:31) — already defined, needs type→interface change
- `ServiceKey` type (Container.ts:37) — `keyof ServiceMap | (string & {}) | symbol`, should work unchanged after interface conversion
- `make()` overloads (Container.ts:183-185) — already have ServiceMap-keyed signature, need verification only
- `service-map.test.ts` — existing test with module augmentation pattern, working base to expand

### Established Patterns
- Module augmentation via `declare module '@gravito/core'` — 14+ orbit packages use this for `GravitoVariables`
- Container.d.ts is manually maintained alongside Container.ts
- Biome ignore comments used for intentional empty types/interfaces

### Integration Points
- `ServiceKey` is used throughout Container.ts for all bind/singleton/scoped/instance/make/has/forget methods
- `ServiceMap` is exported from `packages/core/src/index.ts` and `index.browser.ts` (Phase 23 named exports)
- 50+ downstream packages import from `@gravito/core` — typecheck must pass across all

### Risk Assessment
- **Low risk:** `type → interface` for empty type is source-compatible
- **Low risk:** overloads already exist, no signature changes needed
- **Verify:** `ServiceKey = keyof ServiceMap | (string & {}) | symbol` — `keyof` of an empty interface is `never`, same as empty type. No behavioral change expected.

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond TYPE-02 success criteria. This is a focused type-system fix — change one keyword (`type` → `interface`), sync the .d.ts, and verify with expanded tests.

</specifics>

<deferred>
## Deferred Ideas

- **ServiceMap augmentation in orbit packages** — Each orbit package (atlas, echo, flux, etc.) could add `interface ServiceMap { db: DatabaseManager }` style augmentation to enable typed `container.make('db')`. Belongs in v2.2 or per-package adoption.
- **Cast cleanup across codebase** — After ServiceMap adoption, `make('health') as HealthRegistry` patterns can be simplified. Depends on augmentation adoption first.
- **Container full generic refactor (TYPE-04)** — `Container<TServices>` parameterization. Explicitly v2.2+ per REQUIREMENTS.md.

</deferred>

---

*Phase: 25-container-type-improvement*
*Context gathered: 2026-03-30*
