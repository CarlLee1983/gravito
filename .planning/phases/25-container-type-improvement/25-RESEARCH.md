# Phase 25: Container Type Improvement - Research

**Researched:** 2026-03-30
**Domain:** TypeScript type system — module augmentation, declaration merging, function overloads
**Confidence:** HIGH

## Summary

Phase 25 is a minimal, surgical TypeScript change with two file edits and test expansion. The core issue is that `export type ServiceMap = {}` in `Container.ts` uses a type alias, which TypeScript forbids augmenting via `declare module`. Changing it to `export interface ServiceMap {}` enables downstream packages to perform declaration merging, making `container.make('myService')` return the concrete type from the ServiceMap without any cast.

The function overloads (`make<K extends keyof ServiceMap>(key: K): ServiceMap[K]` + `make<T>(key: ServiceKey): T`) are already present and correct in both `Container.ts` and `Container.d.ts`. They need verification only — no changes. The Biome suppression comment also needs updating: `type ServiceMap = {}` triggers `lint/complexity/noBannedTypes`, while `interface ServiceMap {}` triggers `lint/suspicious/noEmptyInterface`. The comment text must track this change.

**Primary recommendation:** Change `type ServiceMap = {}` to `interface ServiceMap {}` in both `Container.ts` and `Container.d.ts`, update the Biome ignore comment, and expand `service-map.test.ts` with tests that confirm type inference and fallback behavior.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Change `export type ServiceMap = {}` to `export interface ServiceMap {}` in Container.ts — enables TypeScript module augmentation (declaration merging). The existing `type` alias prevents downstream packages from augmenting ServiceMap via `declare module`.
- **D-02:** Synchronously update Container.d.ts to match — keep the manual maintenance approach. Do not switch to build-generated .d.ts.
- **D-03:** Expand existing `service-map.test.ts` with additional tests: type inference verification (confirm return type is concrete, not `any`) and fallback behavior for keys not in ServiceMap. The existing overload signatures are already present — verify they work correctly after the type→interface change.
- **D-04:** This phase modifies ONLY `packages/core/`. No orbit packages receive ServiceMap augmentation. Adoption is left for v2.2 or individual package maintainers.
- **D-05:** No cleanup of existing `as T` or `as any` casts in downstream packages. Correct sequence: fix type foundation (this phase) → adopt ServiceMap augmentation (future) → clean up casts (future).

### Claude's Discretion

- Biome ignore comment update (currently says `noBannedTypes` but code was `type`; after interface change, comment needs updating to `noEmptyInterface`)
- JSDoc wording adjustments on ServiceMap
- Test structure within service-map.test.ts

### Deferred Ideas (OUT OF SCOPE)

- ServiceMap augmentation in orbit packages — each orbit package could add `interface ServiceMap { db: DatabaseManager }` style augmentation. Belongs in v2.2 or per-package adoption.
- Cast cleanup across codebase — depends on augmentation adoption first.
- Container full generic refactor (TYPE-04) — `Container<TServices>` parameterization. Explicitly v2.2+ per REQUIREMENTS.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPE-02 | Container.make() — ServiceMap-keyed overload returns concrete type, not `any` | The overload signatures already exist in Container.ts:183-185 and Container.d.ts:133-134. The blocker is `type ServiceMap = {}` preventing augmentation. Changing to `interface ServiceMap {}` unblocks declaration merging, enabling the existing overloads to work. No overload signature changes needed. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type system | Project-standard; `interface` declaration merging is core TS feature since v1.x |
| Bun test | 1.3.10 | Test runner | Project-standard; `bun:test` used throughout packages/core |
| Biome | 2.4.4 | Lint/format | Project-standard linter/formatter |

### No Additional Libraries Needed

This phase is purely a TypeScript type declaration change. No new libraries are installed.

## Architecture Patterns

### TypeScript Declaration Merging vs Type Alias

The fundamental difference between `type` and `interface` for module augmentation:

```typescript
// Source: TypeScript Handbook — Declaration Merging
// CANNOT be augmented — type aliases do not support declaration merging
export type ServiceMap = {}

// CAN be augmented — interfaces support declaration merging
export interface ServiceMap {}

// In a downstream package:
declare module '@gravito/core' {
  interface ServiceMap {       // Works when ServiceMap is an interface
    logger: Logger             // Fails to merge when ServiceMap is a type alias
    db: DatabaseConnection
  }
}
```

**Confidence:** HIGH — verified in TypeScript 5.9.3 official documentation

### Existing Overload Pattern (Already Correct)

The `make()` overloads are already in place and correct. They require verification only:

```typescript
// Source: packages/core/src/Container.ts:183-185
make<K extends keyof ServiceMap>(key: K): ServiceMap[K]  // typed path
make<T>(key: ServiceKey): T                               // fallback path
make<T>(key: ServiceKey): T { /* implementation */ }
```

The `ServiceKey` type (`keyof ServiceMap | (string & {}) | symbol`) works identically for both `type` and `interface` when the definition is empty — `keyof` of an empty type or interface is `never`, so the fallback path (`string & {}`) handles all calls.

### Module Augmentation Pattern (Already Established)

The project already uses this pattern for `GravitoVariables` across 14+ orbit packages. The same mechanism applies to `ServiceMap`:

```typescript
// Source: packages/core/tests/service-map.test.ts (already working)
declare module '../src/Container' {
  interface ServiceMap {
    logger: Logger
    db: Database
  }
}
```

After changing to `interface`, the standard `declare module '@gravito/core'` path will work for production consumers.

### Biome Suppression Comment Change

| Before (type alias) | After (interface) |
|---------------------|-------------------|
| `export type ServiceMap = {}` triggers `lint/complexity/noBannedTypes` | `export interface ServiceMap {}` triggers `lint/suspicious/noEmptyInterface` |
| `// biome-ignore lint/complexity/noBannedTypes: ...` | `// biome-ignore lint/suspicious/noEmptyInterface: ...` |

**Confidence:** HIGH — verified against Biome 2.4.4 documentation and current Container.ts state.

The `.d.ts` file does NOT need a Biome ignore comment — Biome does not lint `.d.ts` files.

### Test Expansion Pattern

The existing `service-map.test.ts` has two runtime tests. The planned expansion adds type-level assertions using TypeScript's native `satisfies` operator and `ReturnType` utility:

```typescript
// Type inference verification — confirms return type is NOT any
// by asserting it satisfies the concrete type without a cast
it('should return concrete type without cast', () => {
  const container = new Container()
  container.bind('logger', () => new Logger())

  const logger = container.make('logger')
  // If logger is `any`, this line would not produce a TS error even if wrong
  // The satisfies check below verifies TypeScript inferred the concrete type
  const _check: Logger = logger   // should compile without error or cast
  expect(logger).toBeInstanceOf(Logger)
})

it('should return fallback type for unknown keys', () => {
  const container = new Container()
  container.bind('custom', () => 'value')

  const value = container.make<string>('custom')   // generic cast still works
  expect(value).toBe('value')
})
```

**Confidence:** HIGH — the pattern is used in `packages/core/tests/contract/core-exceptions.contract.test.ts` in this project.

### Anti-Patterns to Avoid

- **Do NOT change the overload signatures** — they are already correct. Modifying them risks breaking the 50+ downstream packages.
- **Do NOT remove the biome-ignore comment** — an empty interface will trigger `lint/suspicious/noEmptyInterface` by default.
- **Do NOT convert Container.d.ts to generated** — D-02 locks manual maintenance.
- **Do NOT augment orbit packages** — D-04 limits this phase to `packages/core/` only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type-safe DI overloads | Custom generic Container class | TypeScript function overloads + ServiceMap interface | Already implemented; overloads handle both typed and untyped resolution paths |
| Module augmentation | Custom plugin/registration API | TypeScript `declare module` + `interface` merging | Language-native; zero runtime overhead; 14+ orbit packages already use this pattern for GravitoVariables |

## Common Pitfalls

### Pitfall 1: Not Updating Container.d.ts

**What goes wrong:** `Container.ts` is changed to `interface` but `Container.d.ts` still has `type ServiceMap = {}`. Downstream packages that import from the built dist get the `.d.ts` version, not `.ts`. Module augmentation fails silently at the consumer's call site despite the source being correct.

**Why it happens:** Forgetting that `Container.d.ts` is manually maintained and diverges from the `.ts` source.

**How to avoid:** Edit both files in the same task. The CONTEXT.md canonical refs list both explicitly.

**Warning signs:** `bun run typecheck` passes in core package but fails in orbit packages after augmentation adoption.

### Pitfall 2: Wrong Biome Ignore Comment Rule Name

**What goes wrong:** After changing to `interface`, the Biome comment still references `noBannedTypes` (the old rule for `type = {}`). Biome then reports an "unnecessary suppression comment" error and CI fails.

**Why it happens:** The rule name changes with the syntax change: `{}` type alias → `noBannedTypes`; empty interface → `noEmptyInterface`.

**How to avoid:** Update the comment from `lint/complexity/noBannedTypes` to `lint/suspicious/noEmptyInterface`.

**Warning signs:** Biome reports "Suppression comment is not applicable. The rule lint/complexity/noBannedTypes did not emit any diagnostics."

### Pitfall 3: Removing the Biome Ignore Comment Entirely

**What goes wrong:** The comment is removed thinking the empty interface is fine. Biome's `noEmptyInterface` is enabled by default (recommended ruleset) and will immediately flag `interface ServiceMap {}` as an error.

**Why it happens:** Assuming an empty interface is uncontroversial in a linter.

**How to avoid:** Keep the comment — just change the rule name.

### Pitfall 4: Assuming `bun run typecheck` at Package Level is Sufficient

**What goes wrong:** Only running `cd packages/core && bun run typecheck`. The change passes, but the workspace-level typecheck (`bun run typecheck` at root) could fail if the photon package pre-existing error obscures the signal.

**Why it happens:** Photon has a pre-existing typecheck failure (seen during research). A developer assumes the workspace typecheck failure is unrelated.

**How to avoid:** Verify the pre-existing photon typecheck failure exists BEFORE the change. After the change, confirm the failure count has not increased. The acceptance criterion (SC-3) is "no new errors" — not "zero total errors across workspace," given photon's pre-existing issue.

**Note:** Running `bun run typecheck` at root currently has 1 failure (`@gravito/photon`). This is pre-existing and not related to Phase 25. Verify this baseline before implementing.

## Code Examples

### Task 1: Container.ts Change

```typescript
// BEFORE (packages/core/src/Container.ts:30-31)
// biome-ignore lint/complexity/noBannedTypes: empty interface needed for module augmentation
export type ServiceMap = {}

// AFTER
// biome-ignore lint/suspicious/noEmptyInterface: empty interface needed for module augmentation
export interface ServiceMap {}
```

### Task 2: Container.d.ts Change

```typescript
// BEFORE (packages/core/src/Container.d.ts:20)
export type ServiceMap = {};

// AFTER
// biome-ignore lint/suspicious/noEmptyInterface: empty interface needed for module augmentation
export interface ServiceMap {}
```

Note: No biome-ignore comment exists in the current `.d.ts`. After the interface change, Biome does not lint `.d.ts` files, so the comment is unnecessary — but it also does no harm. Confirm with `bunx biome lint packages/core/src/Container.d.ts` after the change.

### Task 3: service-map.test.ts Expansion

```typescript
// Source: Based on patterns in packages/core/tests/service-map.test.ts

it('should infer concrete type without explicit cast', () => {
  const container = new Container()
  container.bind('logger', () => new Logger())

  const logger = container.make('logger')  // TypeScript infers Logger
  const _typeCheck: Logger = logger        // compile error if inferred as any
  expect(logger).toBeInstanceOf(Logger)
})

it('should support generic cast for keys not in ServiceMap', () => {
  const container = new Container()
  container.bind('unknown-service', () => 42)

  const value = container.make<number>('unknown-service')
  expect(value).toBe(42)
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `export type ServiceMap = {}` | `export interface ServiceMap {}` | Phase 25 | Enables `declare module` augmentation by downstream packages |
| Biome ignore: `noBannedTypes` | Biome ignore: `noEmptyInterface` | Phase 25 | Different rule governs empty interface vs banned `{}` type alias |

**TypeScript module augmentation:** Only `interface` declarations support declaration merging. `type` aliases explicitly do not. This is documented TypeScript behavior that has been stable since TypeScript 1.x.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this is a pure TypeScript source file change within packages/core/)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test 1.3.10 |
| Config file | packages/core/bunfig.toml (inferred from project conventions) |
| Quick run command | `cd packages/core && bun test tests/service-map.test.ts` |
| Full suite command | `cd packages/core && bun run typecheck && bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-02 | `container.make('logger')` returns `Logger` (not `any`) without cast | unit | `cd packages/core && bun test tests/service-map.test.ts` | Partial — file exists, needs 2 new test cases |
| TYPE-02 | `container.make('unknown')` with generic still compiles (fallback) | unit | `cd packages/core && bun test tests/service-map.test.ts` | Partial — covered by existing test, needs type-level verification |
| TYPE-02 | Workspace typecheck passes (no new errors beyond pre-existing photon failure) | typecheck | `cd packages/core && bun run typecheck` | N/A — command-based |

### Sampling Rate

- **Per task commit:** `cd packages/core && bun test tests/service-map.test.ts`
- **Per wave merge:** `cd packages/core && bun run typecheck && bun test`
- **Phase gate:** `cd packages/core && bun run typecheck && bun test` green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. `service-map.test.ts` exists and runs (2 pass, 0 fail baseline confirmed during research). The phase adds test cases to an existing file, not a new file.

## Open Questions

1. **Photon pre-existing typecheck failure**
   - What we know: `bun run typecheck` at workspace root fails with `@gravito/photon:typecheck` code 2 — confirmed during research
   - What's unclear: Whether this was intentionally left for a future phase or is an active defect
   - Recommendation: Document the pre-existing failure count before implementing Phase 25. After implementation, confirm the count has not increased. SC-3 should be interpreted as "packages/core typecheck passes with zero errors" not "workspace-wide zero errors."

## Sources

### Primary (HIGH confidence)

- TypeScript Handbook (Declaration Merging) — `interface` vs `type` module augmentation behavior
- `packages/core/src/Container.ts` — direct code inspection: lines 30-31 (ServiceMap type), 183-185 (make() overloads)
- `packages/core/src/Container.d.ts` — direct code inspection: lines 20-25 (ServiceMap), 133-134 (overloads)
- `packages/core/tests/service-map.test.ts` — direct code inspection: existing tests confirmed passing (2 pass, 0 fail)
- Biome 2.4.4 documentation — `noEmptyInterface` rule: `lint/suspicious/noEmptyInterface`; `noBannedTypes` rule: `lint/complexity/noBannedTypes`
- `bunx biome lint packages/core/src/Container.ts` — confirmed zero lint errors on current file
- `cd packages/core && bun run typecheck` — confirmed zero type errors on current core package

### Secondary (MEDIUM confidence)

- Biome changelog/issue tracker — confirmed that as of January 2026, `useConsistentTypeDefinitions` was updated to NOT convert empty `type = {}` to `interface {}` to avoid conflict with `noEmptyInterface` rule

### Tertiary (LOW confidence)

None — all critical claims verified via direct code inspection or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — TypeScript 5.9.3 and Bun test confirmed via direct command output
- Architecture: HIGH — overload signatures verified by direct file reading; module augmentation behavior verified by testing existing `service-map.test.ts`
- Pitfalls: HIGH — all pitfalls identified from direct code inspection and Biome documentation

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable TypeScript behavior, Biome rule names do not change within a major version)
