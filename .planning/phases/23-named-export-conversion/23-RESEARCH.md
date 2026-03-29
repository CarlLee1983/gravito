# Phase 23: Named Export Conversion - Research

**Researched:** 2026-03-29
**Domain:** TypeScript barrel file refactoring — star-to-named export conversion
**Confidence:** HIGH

## Summary

Phase 23 is a pure source-code surgery task on two files: `packages/core/src/index.ts` and `packages/core/src/index.browser.ts`. The goal is to replace 6 `export *` statements with explicit named export lists, and remove `setApp` from both barrel files. There are no external library dependencies, no new packages to install, and no runtime behaviour changes.

The work is low-risk in isolation because all target modules already have small, well-defined export surfaces — the 17 exception symbols, 5 helpers/data symbols, 4 helpers/errors symbols, 6 helpers/response symbols, 3 testing symbols, and 11 adapters/bun symbols are fully enumerated below. The primary risk is accidental symbol omission, which is guarded by a `tsc --declaration --emitDeclarationOnly` diff (Decision D-04).

The browser barrel sync (D-03) is a subset operation: only 3 `helpers/*` star exports and the `setApp` removal are replicated there. Browser-specific star exports (`export * from './events'`, `export * from './runtime/index.browser'`) stay untouched.

**Primary recommendation:** Enumerate all symbols mechanically from source files first, write the named export blocks, then run the d.ts diff to confirm zero symbol drift before committing.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Top-level only — convert the 6 star exports in `index.ts` to explicit named export lists. Nested barrel files (`exceptions/index.ts`, `testing/index.ts`, `adapters/bun/index.ts`) keep their own `export *` re-exports unchanged.
- **D-02:** Remove `setApp` from the named export list in both `index.ts` and `index.browser.ts`. No `@internal` JSDoc or `@deprecated` annotation needed — just remove from the barrel exports. The function source file remains unchanged; internal code can still import directly from the source module.
- **D-03:** Only sync MOD-01 and MOD-02 changes to `index.browser.ts` — convert the 3 shared helper exports (`helpers/data`, `helpers/errors`, `helpers/response`) to named exports and remove `setApp`. Leave browser-specific star exports (`export * from './events'`, `export * from './runtime/index.browser'`) untouched.
- **D-04:** Use automated `tsc --declaration --emitDeclarationOnly` diff to verify zero symbols accidentally removed. Run before conversion to capture baseline d.ts output, run after to capture new output, then diff.

### Claude's Discretion

- Exact ordering of named exports in the barrel files (alphabetical, grouped by type, etc.)
- Whether to use `type` keyword for type-only re-exports (`export type { ... }`)
- Implementation of the d.ts diff verification script (one-off inline or separate script file)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOD-01 | 6 個 star export 轉為明確 named export（exceptions, helpers/data, helpers/errors, helpers/response, testing, adapters/bun） | Full symbol inventory below; all 6 modules enumerated |
| MOD-02 | setApp() 從 index.ts 和 index.browser.ts 公開 export 中移除 | setApp appears at index.ts:485 and index.browser.ts:85; no downstream package imports it from the barrel |
| MOD-03 | index.browser.ts 與 index.ts named export 變更保持同步 | index.browser.ts lines 91-93 are the 3 helpers star exports; identified exactly |
</phase_requirements>

---

## Standard Stack

No new libraries. This phase operates entirely within the existing toolchain.

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | project tsconfig | Type-checking and d.ts generation |
| Bun | project default | Running typecheck, tests |
| Biome | project default | Lint/format after edits |

**Installation:** None required.

---

## Architecture Patterns

### Conversion Target Map

The 6 star exports in `index.ts` and their complete symbol inventories:

#### 1. `export * from './exceptions'` (index.ts line 392)

The nested barrel at `exceptions/index.ts` re-exports from 17 individual class files. Each file exports exactly one or two top-level symbols:

| Symbol | Kind | Source file |
|--------|------|-------------|
| `AuthenticationException` | class | AuthenticationException.ts |
| `AuthException` | abstract class | AuthException.ts |
| `AuthorizationException` | class | AuthorizationException.ts |
| `CacheException` | abstract class | CacheException.ts |
| `CircularDependencyException` | class | CircularDependencyException.ts |
| `ConfigurationException` | class | ConfigurationException.ts |
| `DatabaseException` | abstract class | DatabaseException.ts |
| `DomainException` | abstract class | DomainException.ts |
| `ExceptionOptions` | interface | GravitoException.ts |
| `GravitoException` | abstract class | GravitoException.ts |
| `HttpException` | class | HttpException.ts |
| `InfrastructureException` | abstract class | InfrastructureException.ts |
| `InfrastructureExceptionOptions` | interface | InfrastructureException.ts |
| `ModelNotFoundException` | class | ModelNotFoundException.ts |
| `QueueException` | abstract class | QueueException.ts |
| `StorageException` | abstract class | StorageException.ts |
| `StreamException` | abstract class | StreamException.ts |
| `SystemException` | abstract class | SystemException.ts |
| `ValidationError` | interface | ValidationException.ts |
| `ValidationException` | class | ValidationException.ts |

**Total: 20 symbols** (17 classes/abstracts + 3 interfaces). The nested `exceptions/index.ts` keeps its own `export *` statements — only the top-level barrel changes.

Because `exceptions/index.ts` uses `export *`, the top-level barrel cannot say `export { ... } from './exceptions/index'` and enumerate individual symbols — it must enumerate them and point to `'./exceptions'`. The named export list in `index.ts` should use `export { AuthenticationException, ... } from './exceptions'`.

For type-only symbols (`ExceptionOptions`, `InfrastructureExceptionOptions`, `ValidationError`), the discretion to use `export type { ... }` applies.

#### 2. `export * from './helpers/data'` (index.ts line 496)

`helpers/data.ts` is a single file (not a directory barrel). Direct symbol enumeration:

| Symbol | Kind |
|--------|------|
| `PathSegment` | type |
| `DataPath` | type |
| `dataGet` | function |
| `dataHas` | function |
| `dataSet` | function |

**Total: 5 symbols** (2 types + 3 functions)

#### 3. `export * from './helpers/errors'` (index.ts line 502)

`helpers/errors.ts` is a single file:

| Symbol | Kind |
|--------|------|
| `ErrorBag` | interface |
| `createErrorBag` | function |
| `errors` | function |
| `old` | function |

**Total: 4 symbols** (1 interface + 3 functions)

#### 4. `export * from './helpers/response'` (index.ts line 508)

`helpers/response.ts` is a single file:

| Symbol | Kind |
|--------|------|
| `ApiSuccess` | type |
| `ApiFailure` | type |
| `ok` | function |
| `fail` | function |
| `jsonSuccess` | function |
| `jsonFail` | function |

**Total: 6 symbols** (2 types + 4 functions)

#### 5. `export * from './testing'` (index.ts line 705)

`testing/index.ts` re-exports from 2 files:

| Symbol | Kind | Source file |
|--------|------|-------------|
| `HttpTester` | class | HttpTester.ts |
| `createHttpTester` | function | HttpTester.ts |
| `TestResponse` | class | TestResponse.ts |

**Total: 3 symbols**

#### 6. `export * from './adapters/bun/index'` (index.ts line 874)

`adapters/bun/index.ts` re-exports from 7 files:

| Symbol | Kind | Source file |
|--------|------|-------------|
| `BunContext` | class | BunContext.ts |
| `BunNativeAdapter` | class | BunNativeAdapter.ts |
| `BunRequest` | class | BunRequest.ts |
| `WebSocketRouteHandlers` | interface | BunWebSocketHandler.ts |
| `BunWebSocketHandler` | class | BunWebSocketHandler.ts |
| `RadixNode` | class | RadixNode.ts |
| `RadixRouter` | class | RadixRouter.ts |
| `RouteHandler` | type | types.ts |
| `RouteMatch` | interface | types.ts |
| `NodeType` | enum | types.ts |

**Total: 10 symbols** (Note: `AdaptiveAdapter` and `AdaptiveAdapterConfig` in `AdaptiveAdapter.ts` are NOT in `adapters/bun/index.ts` — they are package-private and must NOT be included.)

### setApp Removal

`setApp` appears in two places:
- `index.ts` line 485: within the named `export { ..., setApp, ... } from './helpers'` block — delete just the `setApp,` line
- `index.browser.ts` line 85: same pattern within the helpers destructured export block — delete just the `setApp,` line

Verification: `grep -n "setApp" packages/core/src/index.ts packages/core/src/index.browser.ts` should return zero results after removal.

No downstream packages import `setApp` from `@gravito/core` barrel. Internal tests (`route-extra.test.ts`, `helpers.test.ts`) import from `'../src/helpers'` directly and are unaffected.

### index.browser.ts Sync (D-03)

Three star exports in `index.browser.ts` to convert (lines 91-93):

```typescript
// BEFORE
export * from './helpers/data'
export * from './helpers/errors'
export * from './helpers/response'

// AFTER — same named lists as index.ts
export { type DataPath, dataGet, dataHas, dataSet, type PathSegment } from './helpers/data'
export { createErrorBag, type ErrorBag, errors, old } from './helpers/errors'
export { type ApiFailure, type ApiSuccess, fail, jsonFail, jsonSuccess, ok } from './helpers/response'
```

Lines to leave untouched in `index.browser.ts`:
- Line 59: `export * from './events'`
- Line 106: `export * from './runtime/index.browser'`

### Verification Script Pattern (D-04)

The d.ts diff approach should:
1. Run `tsc --declaration --emitDeclarationOnly --outDir /tmp/core-dts-before -p packages/core/tsconfig.json` before editing
2. Make all edits
3. Run `tsc --declaration --emitDeclarationOnly --outDir /tmp/core-dts-after -p packages/core/tsconfig.json` after editing
4. `diff /tmp/core-dts-before/index.d.ts /tmp/core-dts-after/index.d.ts`
5. Expected diff: only `setApp` removal lines; no new removals

Alternative lightweight approach: extract exported names from the d.ts using `grep "^export"` and sort/diff the lists. This is faster and sufficient for this phase.

### Anti-Patterns to Avoid

- **Re-enumerating into nested barrel path:** Do NOT write `export { HttpTester } from './testing/HttpTester'` — point to `'./testing'` to honour the nested barrel boundary (D-01).
- **Including `AdaptiveAdapter`:** It is in `adapters/bun/` directory but not in `adapters/bun/index.ts` — do not surface it.
- **Omitting enum members:** `NodeType` is an enum with values `STATIC`, `PARAM`, `WILDCARD` — the enum itself is the export, not its members. `export { NodeType }` is correct.
- **Double-exporting types:** Some symbols (`ApiSuccess`, `ApiFailure`, `PathSegment`, `DataPath`, `RouteHandler`, `RouteMatch`) are type-only. Using `export type { ... }` is correct per TypeScript best practice and consistent with existing patterns in index.ts (e.g., `export type { Logger } from './Logger'`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Symbol enumeration | Manual inspection of compiled output | Read source `.ts` files directly — types/interfaces/classes/enums are all top-level and visible |
| d.ts diff | Custom parser | `tsc --declaration --emitDeclarationOnly` + `diff` on the output |
| Typecheck gate | Custom script | `bun run typecheck` (runs `tsc --noEmit` at workspace root) |

---

## Common Pitfalls

### Pitfall 1: Missing symbols from nested barrel re-exports

**What goes wrong:** `exceptions/index.ts` uses `export *` from 17 files. If you enumerate only the classes and miss interfaces (`ExceptionOptions`, `InfrastructureExceptionOptions`, `ValidationError`), the d.ts diff will show removals.

**Why it happens:** Interfaces are easy to miss when skimming class-heavy files.

**How to avoid:** Run the before-d.ts capture first, then grep for exported symbols: `grep "export declare" /tmp/core-dts-before/exceptions/index.d.ts`.

**Warning signs:** d.ts diff shows `-export declare interface ...` lines.

### Pitfall 2: setApp still present after edit

**What goes wrong:** `setApp` is in a multi-line destructured export block. Editing with a line-aware tool (e.g., sed) might leave a trailing comma or blank line that causes a parse error.

**Why it happens:** The export block is:
```typescript
export {
  ...
  setApp,     ← remove this line
  tap,
  ...
} from './helpers'
```

**How to avoid:** After removing `setApp,`, verify the surrounding lines have correct comma placement. The line before `setApp` must end with `,` and the line after must also end with `,` (or be the closing brace).

**Warning signs:** `bun run typecheck` reports unexpected token errors near the helpers export block.

### Pitfall 3: index.browser.ts star exports for events/runtime removed accidentally

**What goes wrong:** Browser barrel has 5 star exports total. D-03 says convert only 3 (`helpers/*`). The other 2 (`./events`, `./runtime/index.browser`) must stay as `export *`.

**How to avoid:** Edit lines 91-93 only. Do not touch line 59 or line 106.

### Pitfall 4: `export type` vs `export` inconsistency breaks module augmentation

**What goes wrong:** Packages like `@gravito/plasma`, `@gravito/stream` augment `declare module '@gravito/core'`. These work because they extend interfaces that are live exports. Type-only exports (`export type { ServiceMap }`) vs value exports (`export { ServiceMap }`) behave differently under `isolatedModules`.

**Why it happens:** `@gravito/core` tsconfig does not set `isolatedModules: true`, so `export type` is safe for pure interfaces but care is needed for enums (enums have runtime value). `NodeType` enum must use `export { NodeType }` not `export type { NodeType }`.

**How to avoid:** Use `export type { ... }` only for pure type/interface symbols. Use `export { ... }` for classes, functions, enums, and constants.

---

## Code Examples

### Pattern: Named re-export from barrel module

```typescript
// Source: existing pattern in packages/core/src/index.ts (line 409-415)
export {
  type GlobalErrorHandlersMode,
  type GlobalProcessErrorHandlerContext,
  type GlobalProcessErrorKind,
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'
```

Use this exact pattern. Mixed `type` and non-`type` in the same export block is valid TypeScript.

### Pattern: Converting `export * from './exceptions'`

```typescript
// BEFORE (index.ts line 392)
export * from './exceptions'

// AFTER — point to './exceptions' barrel, NOT individual files
export {
  AuthenticationException,
  AuthException,
  AuthorizationException,
  CacheException,
  CircularDependencyException,
  ConfigurationException,
  DatabaseException,
  DomainException,
  type ExceptionOptions,
  GravitoException,
  HttpException,
  InfrastructureException,
  type InfrastructureExceptionOptions,
  ModelNotFoundException,
  QueueException,
  StorageException,
  StreamException,
  SystemException,
  type ValidationError,
  ValidationException,
} from './exceptions'
```

### Pattern: Converting `export * from './adapters/bun/index'`

```typescript
// BEFORE (index.ts line 874)
export * from './adapters/bun/index'

// AFTER — use './adapters/bun' (index implied) or './adapters/bun/index'
export {
  BunContext,
  BunNativeAdapter,
  BunRequest,
  type WebSocketRouteHandlers,
  BunWebSocketHandler,
  RadixNode,
  RadixRouter,
  type RouteHandler,
  type RouteMatch,
  NodeType,
} from './adapters/bun'
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) |
| Config file | `packages/core/package.json` (test script) |
| Quick run command | `cd packages/core && bun test tests/index.test.ts --timeout=10000` |
| Full suite command | `bun run typecheck` (workspace root) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOD-01 | 6 star exports replaced with named lists; no symbol removed | d.ts diff | `tsc --declaration --emitDeclarationOnly` before/after diff | Wave 0 script |
| MOD-02 | `setApp` not importable from `@gravito/core` barrel | compile check | `grep "setApp" packages/core/src/index.ts packages/core/src/index.browser.ts` exits non-zero | inline grep |
| MOD-03 | `index.browser.ts` helpers exports match index.ts | typecheck | `bun run typecheck` (workspace root) | ✅ existing |

### Sampling Rate

- **Per task commit:** `bun run typecheck` at workspace root
- **Per wave merge:** `bun run typecheck && cd packages/core && bun test --timeout=10000`
- **Phase gate:** Both pass with zero new errors before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/core/scripts/verify-exports-diff.ts` (or inline bash) — d.ts baseline capture before edits begin (MOD-01 gate)

*(Existing test infrastructure covers MOD-02 and MOD-03; only the d.ts baseline script is new)*

---

## Environment Availability

Step 2.6: No external dependencies beyond project toolchain (TypeScript, Bun). SKIPPED.

---

## Open Questions

1. **`export type` for `RouteHandler = Function`**
   - What we know: `RouteHandler` is a type alias for `Function` — it has no runtime value
   - What's unclear: Whether downstream packages assign a value to `RouteHandler` at runtime (unlikely given its alias target)
   - Recommendation: Use `export type { RouteHandler }` — it is a pure type alias

2. **JSDoc comment placement**
   - What we know: The 6 star exports all have JSDoc blocks above them in index.ts (e.g., the `/** Testing utilities... @public */` block before `export * from './testing'`)
   - What's unclear: CONTEXT.md does not specify whether JSDoc should be preserved
   - Recommendation: Preserve existing JSDoc blocks unchanged — they are public API documentation

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `packages/core/src/index.ts` (lines 392, 485, 496, 502, 508, 705, 874)
- Direct file inspection: `packages/core/src/index.browser.ts` (lines 59, 85, 91-93, 106)
- Direct file inspection: all 17 exception source files, 3 helpers files, testing/HttpTester.ts, testing/TestResponse.ts, all adapters/bun source files
- `packages/core/tsconfig.json` — strict mode confirmed, no isolatedModules
- `packages/core/package.json` — typecheck and test commands confirmed

### Secondary (MEDIUM confidence)
- Codebase-wide grep: no downstream package imports `setApp` from `@gravito/core` barrel (confirmed zero results)
- Codebase-wide grep: 20+ module augmentations of `@gravito/core` confirmed; none depend on star export behaviour

---

## Metadata

**Confidence breakdown:**
- Symbol inventory: HIGH — read directly from source files
- Conversion pattern: HIGH — existing named export pattern already in index.ts
- setApp removal safety: HIGH — verified no downstream barrel consumers
- d.ts diff approach: HIGH — standard tsc capability
- Pitfalls: HIGH — derived from direct inspection of file structure

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable codebase, 30-day window)
