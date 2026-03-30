# Phase 26: Documentation and Tooling - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

CI enforces the improved API surface via lint rules and export validation; documentation matches the actual API that developers encounter. Scope: DOC-01 through DOC-07.

</domain>

<decisions>
## Implementation Decisions

### Biome noExplicitAny Upgrade (DOC-01)
- **D-01:** Upgrade `noExplicitAny` from `warn` to `error` via Biome override scoped to `packages/core/src/**`. The global default stays `warn`; only core gets `error`.
- **D-02:** Fix all 16 existing violations (not biome-ignore). Breakdown: `types.ts` (3), `HookManager.ts` (4), `GravitoServer.ts` (2), `ConfigManager.ts` (1), `RequestScopeManager.ts` (1), and 5 test files under `__tests__/`. Replace `any` with concrete types or `unknown` as appropriate.

### Biome noConsole Rule (DOC-02)
- **D-03:** Add `noConsole: error` via Biome override scoped to `packages/core/src/**`.
- **D-04:** Exclude `cli/` subdirectory and `Logger.ts` from the noConsole rule (CLI commands legitimately use console for output; Logger.ts is the console wrapper itself). Use a second Biome override to set `noConsole: off` for `packages/core/src/cli/**` and `packages/core/src/Logger.ts`.
- **D-05:** Remaining ~20 non-CLI/non-Logger console usages in core/src (error handlers, adapters, MigrationWarner, etc.) must be converted to use Logger or receive `biome-ignore` with a reason comment explaining why direct console is needed.

### publint CI Gate (DOC-03)
- **D-06:** Install `publint` as a devDependency. Add a `"publint"` task to `turbo.json` pipeline that runs after `build`. Every package with an `exports` map (57/59 packages) runs publint. Failure blocks CI.
- **D-07:** Each package gets a `"publint"` script in its `package.json` (e.g., `"publint": "publint"`).

### README EventManager Sync (DOC-04)
- **D-08:** Replace the incorrect `emit/on/off` API reference in README with the actual public API: `dispatch/listen/unlisten/clear`. Remove any references to methods that don't exist on EventManager.

### README HookManager Fix (DOC-05)
- **D-09:** Remove the `core.hooks.setRetryScheduler(scheduler)` example from README line 151. `setRetryScheduler` exists on `EventPriorityQueue`, not on HookManager. Ensure HookManager section documents only methods that exist on the class: `addFilter`, `applyFilters`, `addAction`, `doAction`, etc.

### orbit/register/use Decision Guide (DOC-06)
- **D-10:** Add a new section in `packages/core/README.md` titled "When to use orbit() vs register() vs use()" below the existing API reference. Include a decision tree and concrete examples for each method. Keep it in README, not a separate file.

### JSDoc Language Unification (DOC-07)
- **D-11:** All public API JSDoc comments in `packages/core/src/` must be in English. Scan for mixed-language blocks (Chinese comments in JSDoc) and convert to English. Internal comments outside JSDoc are not in scope.

### Claude's Discretion
- Specific type replacements for each `any` violation (e.g., `unknown`, generic parameter, or concrete type)
- Exact Logger method mapping for each console replacement
- publint script naming and configuration details
- Decision tree formatting and examples in the orbit/register/use guide
- Order of operations across the 7 requirements

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Biome Configuration
- `biome.json` -- Current lint/format config; noExplicitAny at line 146 (global warn), line 15 (GraphQL error override)

### Core Package
- `packages/core/README.md` -- README to update (EventManager, HookManager, orbit/register/use sections)
- `packages/core/src/EventManager.ts` -- Actual EventManager public API (dispatch/listen/unlisten/clear)
- `packages/core/src/HookManager.ts` -- Actual HookManager public API (addFilter/applyFilters/addAction/doAction)
- `packages/core/src/PlanetCore.ts` -- orbit()/register()/use() method definitions and JSDoc
- `packages/core/src/Logger.ts` -- Logger class that console usages should migrate to
- `packages/core/src/types.ts` -- 3 noExplicitAny violations to fix

### Build Pipeline
- `turbo.json` -- Turbo pipeline config; publint task to be added here

### Requirements
- `.planning/REQUIREMENTS.md` -- DOC-01 through DOC-07 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Logger.ts` in core/src provides debug/info/warn/error methods -- target for console migration
- Biome override pattern already established for GraphQL package -- same pattern for core scoping

### Established Patterns
- Biome overrides use `includes` glob arrays for scoping
- Turbo pipeline tasks are defined in `turbo.json` with dependency chains
- Each package has its own `package.json` scripts

### Integration Points
- `biome.json` at repo root -- add 2 new overrides (core noExplicitAny error, core noConsole error with cli/Logger exclusion)
- `turbo.json` at repo root -- add publint pipeline task after build
- `packages/core/README.md` -- 3 sections to update/add (EventManager, HookManager, orbit guide)
- 59 `packages/*/package.json` -- add publint script to packages with exports

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches for all items.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 26-documentation-and-tooling*
*Context gathered: 2026-03-30*
