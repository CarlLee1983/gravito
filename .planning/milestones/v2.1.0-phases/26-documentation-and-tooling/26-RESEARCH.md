# Phase 26: Documentation and Tooling - Research

**Researched:** 2026-03-30
**Domain:** Biome lint configuration, publint CI integration, JSDoc language unification, README API accuracy
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Upgrade `noExplicitAny` from `warn` to `error` via Biome override scoped to `packages/core/src/**`. The global default stays `warn`; only core gets `error`.

**D-02:** Fix all 16 existing violations (not biome-ignore). Breakdown: `types.ts` (3), `HookManager.ts` (4), `GravitoServer.ts` (2), `ConfigManager.ts` (1), `RequestScopeManager.ts` (1), and 5 test files under `__tests__/`. Replace `any` with concrete types or `unknown` as appropriate.

**D-03:** Add `noConsole: error` via Biome override scoped to `packages/core/src/**`.

**D-04:** Exclude `cli/` subdirectory and `Logger.ts` from the noConsole rule. Use a second Biome override to set `noConsole: off` for `packages/core/src/cli/**` and `packages/core/src/Logger.ts`.

**D-05:** Remaining ~20 non-CLI/non-Logger console usages in core/src (error handlers, adapters, MigrationWarner, etc.) must be converted to use Logger or receive `biome-ignore` with a reason comment.

**D-06:** Install `publint` as a devDependency. Add a `"publint"` task to `turbo.json` pipeline that runs after `build`. Every package with an `exports` map (57/59 packages) runs publint. Failure blocks CI.

**D-07:** Each package gets a `"publint"` script in its `package.json` (e.g., `"publint": "publint"`).

**D-08:** Replace incorrect `emit/on/off` API reference in README with actual public API: `dispatch/listen/unlisten/clear`.

**D-09:** Remove `core.hooks.setRetryScheduler(scheduler)` example from README line 151. Ensure HookManager section documents only methods that exist: `addFilter`, `applyFilters`, `addAction`, `doAction`, etc.

**D-10:** Add new section in `packages/core/README.md` titled "When to use orbit() vs register() vs use()" below existing API reference. Include decision tree and concrete examples. Keep in README, not separate file.

**D-11:** All public API JSDoc comments in `packages/core/src/` must be in English. Convert mixed-language blocks (Chinese JSDoc) to English. Internal comments outside JSDoc are not in scope.

### Claude's Discretion
- Specific type replacements for each `any` violation (e.g., `unknown`, generic parameter, or concrete type)
- Exact Logger method mapping for each console replacement
- publint script naming and configuration details
- Decision tree formatting and examples in the orbit/register/use guide
- Order of operations across the 7 requirements

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | Biome noExplicitAny from warn to error (scoped to core/src) | Biome override pattern confirmed via graphql precedent in biome.json; 16 violations mapped |
| DOC-02 | Biome noConsole rule (scoped to packages/core/src/) | noConsole belongs to `suspicious` category; verified JSON syntax; exclusion via second override |
| DOC-03 | publint added to CI pipeline | publint 0.3.18; Turbo `dependsOn: ["build"]` pattern; per-package script required |
| DOC-04 | README EventManager API synced to dispatch/listen/unlisten | Actual EventManager.ts public API confirmed: dispatch, listen, unlisten, clear, getListeners |
| DOC-05 | README HookManager setRetryScheduler removed | setRetryScheduler is on EventPriorityQueue, not HookManager; README line 151 identified |
| DOC-06 | orbit() vs register() vs use() decision guide added | All three methods in PlanetCore.ts verified; semantics documented |
| DOC-07 | Public API JSDoc unified to English | 81 files with Chinese characters found; only JSDoc blocks in scope; key files identified |
</phase_requirements>

## Summary

Phase 26 is a documentation and tooling hardening phase with no runtime behavior changes. All seven requirements are mechanical changes with clear boundaries: two Biome config additions, one Turbo pipeline task with per-package scripts, two README corrections, one README addition, and one JSDoc language sweep.

The most labor-intensive work is DOC-02 (console migration) and DOC-07 (JSDoc language). DOC-02 requires auditing approximately 20 non-CLI/non-Logger `console.*` calls across files like `GravitoServer.ts`, `ActionManager.ts`, `FilterManager.ts`, `RequestScopeManager.ts`, `DeadLetterQueueManager.ts`, `AdaptiveAdapter.ts`, `queue-core.ts`, and `task-executor.ts`. DOC-07 requires converting Chinese JSDoc blocks in files across all of `packages/core/src/` — 81 files contain Chinese characters, though only those with JSDoc `/** ... */` blocks containing Chinese are in scope (internal `//` comments are excluded).

The Biome override pattern is already established in the project (see the graphql override in `biome.json`). The publint CLI runs as a bare `publint` command against the package root and must be invoked after `build` in the Turbo graph.

**Primary recommendation:** Execute the requirements in order: (1) Biome config changes first to establish the new error baseline, (2) fix violations immediately after so CI is green, (3) publint installation and pipeline wiring, (4) README edits, (5) JSDoc sweep.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| publint | 0.3.18 | Validates package.json exports map against dist files | De facto standard for npm package validation; catches missing entry points before publish |
| biome | 2.4.4 (already installed) | Lint and format enforcement | Already project standard; noConsole and noExplicitAny rules are built-in |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| turbo | already installed | Pipeline task orchestration | Add publint as pipeline task after build |

**Installation:**
```bash
bun add -D publint  # in repo root or per-package
```

**Version verification:** publint 0.3.18 confirmed via `npm view publint version` on 2026-03-30. Latest as of research date.

## Architecture Patterns

### Biome Override Pattern (Already Established)

The project already uses Biome overrides for scoping. The GraphQL override in `biome.json` lines 9-19 is the canonical pattern:

```json
{
  "overrides": [
    {
      "includes": ["packages/graphql/**/*.ts", "packages/graphql/**/*.tsx"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "error"
          }
        }
      }
    }
  ]
}
```

For DOC-01 and DOC-02, add two new entries to the `overrides` array:

**Override 1 — noExplicitAny error + noConsole error for core/src:**
```json
{
  "includes": ["packages/core/src/**/*.ts"],
  "linter": {
    "rules": {
      "suspicious": {
        "noExplicitAny": "error",
        "noConsole": "error"
      }
    }
  }
}
```

**Override 2 — noConsole off for CLI and Logger (must come AFTER override 1):**
```json
{
  "includes": [
    "packages/core/src/cli/**/*.ts",
    "packages/core/src/Logger.ts"
  ],
  "linter": {
    "rules": {
      "suspicious": {
        "noConsole": "off"
      }
    }
  }
}
```

Override ordering matters: later overrides in the array take precedence for files that match multiple overrides. The CLI/Logger exclusion override must appear after the core/src override.

### Turbo Pipeline Pattern for publint

```json
{
  "tasks": {
    "publint": {
      "dependsOn": ["build"],
      "inputs": ["dist/**", "package.json"],
      "outputs": [],
      "cache": false
    }
  }
}
```

Note: `cache: false` because publint reads the `dist/` output which is already cached by the build task. Setting to false avoids stale cache confusion.

Each package's `package.json` needs:
```json
{
  "scripts": {
    "publint": "publint"
  }
}
```

Packages without an `exports` map (2/59) do not need the script.

### noConsole Biome Suppression Pattern

For the ~20 cases where `console` is genuinely needed (e.g., process-level error fallbacks where Logger is unavailable):

```typescript
// biome-ignore lint/suspicious/noConsole: Logger not available at this call site — process error handler
console.error('[@gravito/core] Failed to handle process-level error:', e)
```

The suppression comment must be on the line immediately before the `console.*` call.

### Anti-Patterns to Avoid
- **Scoping with `linter.includes` at top level instead of inside `overrides`:** Top-level `linter.includes` restricts which files the linter runs on at all. Use `overrides[].includes` to scope rules to specific files.
- **Single override combining enable + exclusion:** Biome applies overrides in order; a single override cannot both enable and disable for different subdirectories. Two separate override blocks are required.
- **Running publint before build:** publint validates the `dist/` directory. If run before `build`, it will validate stale or missing dist files. Turbo `dependsOn: ["build"]` enforces correct ordering.
- **Adding `biome-ignore` without reason comment:** The project requires reason comments per CLAUDE.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Package exports validation | Custom script checking file existence | publint | Handles all entry point formats, browser/node conditions, types resolution |
| Console ban scoped to subdirectory | Complex biome.json with nested includes | Two Biome overrides (enable + disable) | Biome override ordering is the idiomatic approach |

## Common Pitfalls

### Pitfall 1: Biome Override Order
**What goes wrong:** The noConsole exclusion for `cli/` and `Logger.ts` does not take effect — CLI files still trigger noConsole errors.
**Why it happens:** The exclusion override was placed before the enabling override in the `overrides` array. Later overrides win for matching files.
**How to avoid:** Always place the more-specific exclusion override after the enabling override.
**Warning signs:** `biome lint packages/core/src/cli/queue-commands.ts` reports noConsole errors.

### Pitfall 2: any in Test Files vs Source Files
**What goes wrong:** DOC-01 requires fixing all 16 violations. CONTEXT.md D-02 specifies 5 are in `__tests__/` — the scoped override covers `packages/core/src/**` which includes `__tests__/` subdirectory. Test files are in scope.
**Why it happens:** Assuming test files are outside src scope.
**How to avoid:** Verify glob: `packages/core/src/**` includes `packages/core/src/__tests__/`.
**Warning signs:** After fixing source violations, running `biome lint` still reports errors in `__tests__/DLQMetrics.test.ts` and `__tests__/DeadLetterQueue.test.ts`.

### Pitfall 3: publint on Packages Without exports Map
**What goes wrong:** Running publint on a package with no `exports` field causes publint to exit with an error about missing entry points that don't apply.
**Why it happens:** publint expects at least a basic package structure.
**How to avoid:** Only add the `"publint"` script to packages with an `exports` map. The 2 packages without exports maps should be excluded.
**Warning signs:** `turbo run publint` fails on a package that never had an exports map.

### Pitfall 4: JSDoc vs Internal Comment Distinction
**What goes wrong:** Over-correcting DOC-07 by converting `//` comments or inline comments in function bodies to English, creating unnecessary churn.
**Why it happens:** Broad grep for Chinese characters hits all comment types.
**How to avoid:** Only convert `/** ... */` JSDoc blocks (those immediately preceding class/interface/method declarations). Internal implementation comments (`//`) are out of scope per D-11.
**Warning signs:** Touching files that have Chinese only in `//` inline comments.

### Pitfall 5: README setRetryScheduler — Wrong Target
**What goes wrong:** Thinking `setRetryScheduler` needs to be moved rather than removed.
**Why it happens:** The method exists on `EventPriorityQueue`, not `HookManager`. README section 5 ("Reliability & Distributed Retries") references `core.hooks.setRetryScheduler(scheduler)` which calls a method that does not exist on `HookManager`.
**How to avoid:** Remove the entire section 5 from README (lines 138-152 approximately) or replace with correct distributed retry documentation that does not reference `core.hooks.setRetryScheduler`.
**Warning signs:** Leaving the `core.hooks.setRetryScheduler` call in any README example.

## Code Examples

### Current any Violations in Scope (source files only)

**packages/core/src/types.ts** (3 violations):
```typescript
// Current
export interface GravitoContext {
  req: any
  res: any
  json(data: any, status?: number): Response
  ...
}
// Fix: use unknown or specific types
export interface GravitoContext {
  req: unknown
  res: unknown
  json(data: unknown, status?: number): Response
  ...
}
```

**packages/core/src/HookManager.ts** (4 violations — lines 57, 695, 733 + messageQueueBridge):
```typescript
// Line 57 — messageQueueBridge
private messageQueueBridge?: any
// Fix: use unknown (the bridge is an external injection point with no shared type)
private messageQueueBridge?: unknown
```

**packages/core/src/GravitoServer.ts** (2 violations — lines 19-20 and 34):
```typescript
// Line 19: ModuleResolver return type
export type ModuleResolver = () => Promise<any>
// Fix: use unknown
export type ModuleResolver = () => Promise<unknown>

// Line 34: baseOrbits parameter
static async create(..., baseOrbits: any[] = []): Promise<PlanetCore>
// Fix: use GravitoOrbit[] from PlanetCore types (orbit() method accepts GravitoOrbit)
static async create(..., baseOrbits: GravitoOrbit[] = []): Promise<PlanetCore>
```

**packages/core/src/ConfigManager.ts** (1 violation — line 55):
```typescript
let current: any = this.config.get(rootKey)
// Fix: use unknown (the pattern already has type guards below)
let current: unknown = this.config.get(rootKey)
```

**packages/core/src/Container/RequestScopeManager.ts** (1 violation — needs inspection):
The file is `packages/core/src/Container/RequestScopeManager.ts`. The `any` is in the console.error call context on line 120 — verify the actual `any` annotation in the source.

### Console Violations Requiring Logger Migration (non-CLI/non-Logger)

Files with actual console calls (not in JSDoc examples, not in cli/, not Logger.ts):

| File | Lines | console calls | Action |
|------|-------|---------------|--------|
| `GravitoServer.ts` | 43, 65, 68 | console.log, console.log, console.error | Migrate to Logger or biome-ignore with reason |
| `router/RequestValidator.ts` | 74, 76 | console.warn × 2 | Migrate to Logger |
| `Container.ts` | 210 | console.warn | Migrate to Logger |
| `error-handling/RequestScopeErrorContext.ts` | 174 | console.error | biome-ignore — error handler boundary |
| `reliability/DeadLetterQueueManager.ts` | 316, 543, 574 | console.error, console.error, console.info | Migrate to Logger |
| `GlobalErrorHandlers.ts` | 182 | console.error | biome-ignore — process error handler fallback |
| `ffi/NativeAccelerator.ts` | 72 | console.log | Migrate to Logger |
| `hooks/dlq-operations.ts` | 100, 132, 153 | console.error × 3 | Migrate to Logger |
| `hooks/ActionManager.ts` | 179, 222, 248, 253 | console.error, console.warn × 3 | Migrate to Logger |
| `hooks/MigrationWarner.ts` | 32-35 | console.warn × 4 | biome-ignore — migration warning system design |
| `hooks/FilterManager.ts` | 67 | console.error | Migrate to Logger |
| `Container/RequestScopeManager.ts` | 120 | console.error | Migrate to Logger |
| `adapters/bun/BunNativeAdapter.ts` | 295, 298 | console.error × 2 | Migrate to Logger |
| `adapters/bun/AdaptiveAdapter.ts` | 194, 221 | console.log × 2 | Migrate to Logger |
| `events/queue-core.ts` | 276, 293-314 | console.warn × 5 | Migrate to Logger |
| `engine/Gravito.ts` | 382, 536 | console.error × 2 | Migrate to Logger |
| `events/EventPriorityQueue.ts` | 265 | console.error | Migrate to Logger |
| `events/task-executor.ts` | 165, 184, 192, 204, 219, 251, 255, 290, 312, 315, 318 | console.warn/error × 11 | Migrate to Logger |
| `events/RetryScheduler.ts` | 95, 183 | console.warn, console.error | Migrate to Logger |
| `events/DeadLetterQueue.ts` | 179, 324 | console.error, console.warn | Migrate to Logger |
| `events/MessageQueueBridge.ts` | 155, 193, 201, 207, 235, 249, 251 | console.info/error × 7 | Migrate to Logger |
| `events/aggregation/EventBatcher.ts` | 213, 236 | console.error × 2 | Migrate to Logger |
| `HookManager.ts` | 785 | console.error | Migrate to Logger |

Note: Logger interface (`packages/core/src/Logger.ts`) exposes `debug`, `info`, `warn`, `error`. Some files do not have direct access to a Logger instance — these need `biome-ignore` with reason, particularly edge case error handlers where Logger itself may not be initialized.

### Logger Migration Pattern

Most files in the event system do not hold a Logger reference. The standard migration pattern is to pass Logger through constructor or use a module-level approach:

```typescript
// Before
console.error(`[EventPriorityQueue] Error processing task ${task.id}:`, error)

// After option 1: biome-ignore if no logger available
// biome-ignore lint/suspicious/noConsole: No Logger instance available in this static context
console.error(`[EventPriorityQueue] Error processing task ${task.id}:`, error)
```

Files deeply embedded in the event system (EventPriorityQueue, task-executor, RetryScheduler, DeadLetterQueue, MessageQueueBridge) likely need the biome-ignore approach since they don't hold a PlanetCore/Logger reference. Evaluate each file's constructor for available logger injection points.

### Actual EventManager Public API (for README DOC-04)

Confirmed from `packages/core/src/EventManager.ts`:
- `listen(event, listener, options?)` — Register a listener
- `unlisten(event, listener)` — Remove a listener
- `dispatch(event)` — Dispatch an event (async)
- `clear()` — Clear all listeners
- `getListeners(event?)` — Get registered listeners (inspection utility)
- `setBroadcastManager(manager)` — Internal: called by orbit-broadcasting
- `setQueueManager(manager)` — Internal: called by orbit-queue

README should document only: `dispatch`, `listen`, `unlisten`, `clear`.

### HookManager Public API (for README DOC-05)

Confirmed from `packages/core/src/HookManager.ts`:
- `addFilter(hook, callback)` — Register a filter
- `applyFilters(hook, initialValue, ...args)` — Apply filters
- `addAction(hook, callback, options?)` — Register an action
- `doAction(hook, args, options?)` — Run actions (async)
- `doActionSync(hook, args)` — Run actions synchronously (legacy)
- `doActionAsync(hook, args, options)` — Run via priority queue

`setRetryScheduler` does NOT exist on HookManager. It exists on `EventPriorityQueue` (internal).

### orbit() vs register() vs use() Semantics (for DOC-06)

Confirmed from `packages/core/src/PlanetCore.ts`:

```typescript
// orbit() — installs a GravitoOrbit (mounting protocol)
async orbit(orbit: GravitoOrbit | (new () => GravitoOrbit)): Promise<this>
// Calls orbit.install(this). Used for infrastructure-level plugins (DB, Auth, Cache).

// register() — registers a ServiceProvider (synchronous, returns this)
register(provider: ServiceProvider): this
// Calls provider.register() and provider.boot() via bootstrap().
// Used for service bindings in the IoC container.

// use() — accepts either a ServiceProvider or a setup function
async use(satellite: ServiceProvider | ((core: PlanetCore) => Promise<void>)): Promise<this>
// If function: calls satellite(this) directly.
// If ServiceProvider: delegates to register().
// Used for satellite modules and functional setup callbacks.
```

Decision guide structure for README:
- Use `orbit()` when integrating a GravitoOrbit (implements `install()`) — e.g., OrbitDatabase, OrbitAuth
- Use `register()` when adding a ServiceProvider to the IoC container — e.g., CacheServiceProvider
- Use `use()` when adding a satellite module or a one-off setup function — e.g., `core.use(new CartSatellite())` or `core.use(async (c) => { c.register(...) })`

### Chinese JSDoc Files Requiring Conversion

Key source files with Chinese in JSDoc blocks (not just `//` comments):

| File | Chinese JSDoc Location |
|------|----------------------|
| `HookManager.ts` | Class-level JSDoc (lines 36-46): facade description in Chinese |
| `HookManager.ts` | `doAction()` JSDoc body (line 184-185): dispatch mode note in Chinese |
| `GravitoServer.ts` | Class-level JSDoc (line 23): description in Chinese |
| `GravitoServer.ts` | `create()` param JSDoc (lines 26-30): param descriptions in Chinese |
| `types.ts` | None — only interface, no JSDoc block |

Additional files with Chinese characters are primarily `.d.ts` generated files or files where Chinese appears only in `//` inline comments (out of scope). The implementer should grep each `.ts` file in `packages/core/src/` for `/** ... */` blocks containing `[\u4e00-\u9fff]` to get the complete list.

## Runtime State Inventory

Step 2.5: SKIPPED — This is not a rename/refactor/migration phase. No runtime state changes.

## Environment Availability

Step 2.6: External dependencies are minimal for this phase.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Biome | DOC-01, DOC-02 (lint rule changes) | Already installed | 2.4.4 | — |
| publint | DOC-03 | Not yet installed | 0.3.18 (latest) | — |
| Turbo | DOC-03 pipeline | Already installed | present | — |
| Bun | Running tests/typecheck | Already available | present | — |

**Missing dependencies with no fallback:**
- publint must be installed as devDependency before DOC-03 work begins.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) |
| Config file | `bunfig.toml` per package |
| Quick run command | `cd packages/core && bun test --timeout=10000` |
| Full suite command | `bun run test` (Turbo orchestrated) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-01 | noExplicitAny produces errors in core/src | lint | `cd packages/core && biome lint src/` | N/A — lint output |
| DOC-02 | noConsole produces errors in core/src (not cli/, not Logger.ts) | lint | `cd packages/core && biome lint src/` | N/A — lint output |
| DOC-03 | publint passes on all 57 packages | build+publint | `bun run publint` (Turbo pipeline) | N/A — new task |
| DOC-04 | README documents dispatch/listen/unlisten | manual review | Read README and verify against EventManager.ts | N/A — doc review |
| DOC-05 | README has no setRetryScheduler reference | grep | `grep -r 'setRetryScheduler' packages/core/README.md` | N/A — grep check |
| DOC-06 | orbit/register/use guide exists in README | manual review | Read README section | N/A — doc review |
| DOC-07 | No Chinese in JSDoc blocks in core/src | grep | `grep -rn '[\u4e00-\u9fff]' packages/core/src/**/*.ts` then filter JSDoc | N/A — grep check |

### Sampling Rate
- **Per task commit:** `cd packages/core && bun run check && bun run typecheck`
- **Per wave merge:** `bun run typecheck && bun run test`
- **Phase gate:** All lint clean + typecheck passes + publint passes before `/gsd:verify-work`

### Wave 0 Gaps
None — no new test files required. All validation is via lint, typecheck, and grep checks.

## Project Constraints (from CLAUDE.md)

Directives that apply to this phase:

1. **TypeScript strict mode:** `noUnusedLocals` and `noUnusedParameters` enabled. When replacing `any` with `unknown`, ensure the replacement does not introduce unused variables (particularly in type guard patterns).
2. **No `@ts-ignore`:** All `any` replacements must be proper type fixes or `unknown`. `@ts-ignore` is prohibited.
3. **Code style:** 100 char width, 2-space indent, single quotes, no semicolons.
4. **Commit message format:** English, e.g., `fix: [core] replace any with unknown in types.ts`. Scope is `[core]`.
5. **Satellite isolation:** Not relevant — changes are limited to `packages/core/`.
6. **No circular dependencies:** Adding imports (e.g., Logger to event files) must be checked for circularity. Pre-push hook will catch violations.

## Sources

### Primary (HIGH confidence)
- Direct source file inspection: `biome.json` — override pattern, current noExplicitAny position
- Direct source file inspection: `turbo.json` — existing pipeline task structure
- Direct source file inspection: `packages/core/src/EventManager.ts` — actual public API
- Direct source file inspection: `packages/core/src/HookManager.ts` — actual public API, Chinese JSDoc
- Direct source file inspection: `packages/core/src/Logger.ts` — Logger interface and ConsoleLogger
- Direct source file inspection: `packages/core/src/GravitoServer.ts` — console + any violations
- Direct source file inspection: `packages/core/src/types.ts` — any violations
- Direct source file inspection: `packages/core/src/ConfigManager.ts` — any violation
- Direct source file inspection: `packages/core/README.md` — setRetryScheduler at line 151
- [Biome noConsole docs](https://biomejs.dev/linter/rules/no-console/) — configuration syntax, `suspicious` category confirmed

### Secondary (MEDIUM confidence)
- [publint npm registry](https://www.npmjs.com/package/publint) — version 0.3.18 verified via `npm view publint version`
- [publint.dev docs](https://publint.dev/docs/) — CLI usage, npm script pattern confirmed

### Tertiary (LOW confidence)
- None required — all critical claims verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — publint version verified via npm registry; Biome version from biome.json
- Architecture: HIGH — override pattern confirmed from existing biome.json graphql override; Biome noConsole syntax verified from official docs
- Pitfalls: HIGH — derived from direct code inspection and Biome documentation

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable tooling; biome 2.x and publint 0.3.x are not fast-moving)
