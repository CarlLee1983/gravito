# Phase 23: Named Export Conversion - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert @gravito/core's public API surface from implicit star re-exports to explicit named exports. Six top-level star exports in index.ts become named export lists, setApp is removed from public barrels, and index.browser.ts is synced to match. The goal is that every exported symbol is visible by name in the barrel files rather than hidden behind `export *`.

</domain>

<decisions>
## Implementation Decisions

### Conversion Depth
- **D-01:** Top-level only — convert the 6 star exports in `index.ts` to explicit named export lists. Nested barrel files (`exceptions/index.ts`, `testing/index.ts`, `adapters/bun/index.ts`) keep their own `export *` re-exports unchanged.

### setApp Removal
- **D-02:** Remove `setApp` from the named export list in both `index.ts` and `index.browser.ts`. No `@internal` JSDoc or `@deprecated` annotation needed — just remove from the barrel exports. The function source file remains unchanged; internal code can still import directly from the source module.

### Browser Barrel Sync (MOD-03)
- **D-03:** Only sync MOD-01 and MOD-02 changes to `index.browser.ts` — convert the 3 shared helper exports (`helpers/data`, `helpers/errors`, `helpers/response`) to named exports and remove `setApp`. Leave browser-specific star exports (`export * from './events'`, `export * from './runtime/index.browser'`) untouched.

### Verification Method
- **D-04:** Use automated `tsc --declaration --emitDeclarationOnly` diff to verify zero symbols accidentally removed. Run before conversion to capture baseline d.ts output, run after to capture new output, then diff. This satisfies success criteria #1 with a repeatable, script-based approach.

### Claude's Discretion
- Exact ordering of named exports in the barrel files (alphabetical, grouped by type, etc.)
- Whether to use `type` keyword for type-only re-exports (`export type { ... }`)
- Implementation of the d.ts diff verification script (one-off inline or separate script file)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Code (conversion targets)
- `packages/core/src/index.ts` — Lines 392, 496, 502, 508, 705, 874 (6 star exports to convert); line 485 (setApp to remove)
- `packages/core/src/index.browser.ts` — Lines 59, 85, 91-93, 106 (browser barrel; sync helpers + remove setApp)
- `packages/core/src/exceptions/index.ts` — 17 star re-exports (NOT being converted, but read to enumerate symbols for top-level named export)
- `packages/core/src/helpers/data.ts` — Exports: `dataGet`, `dataHas`, `dataSet`, `type PathSegment`, `type DataPath`
- `packages/core/src/helpers/errors.ts` — Exports: `ErrorBag`, `createErrorBag`, `errors`, `old`
- `packages/core/src/helpers/response.ts` — Exports: `ApiSuccess`, `ApiFailure`, `ok`, `fail`, `jsonSuccess`, `jsonFail`
- `packages/core/src/testing/index.ts` — 2 star re-exports (`HttpTester`, `TestResponse`)
- `packages/core/src/adapters/bun/index.ts` — 7 star re-exports (`BunContext`, `BunNativeAdapter`, `BunRequest`, `BunWebSocketHandler`, `RadixNode`, `RadixRouter`, `types`)

### Requirements
- `.planning/REQUIREMENTS.md` — MOD-01, MOD-02, MOD-03 definitions

### Success Criteria
- SC-1: `tsc --declaration --emitDeclarationOnly` before/after produces same exported symbols
- SC-2: Six modules have explicit named export lists in index.ts
- SC-3: `setApp` not present in compiled output of index.ts or index.browser.ts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- All 6 target modules already have well-defined export surfaces — enumeration is straightforward
- 3 helpers are single files (not directories), so named exports can be read directly from the file
- `testing/index.ts` and `adapters/bun/index.ts` are small barrels (2 and 7 re-exports respectively)
- `exceptions/index.ts` is the largest with 17 re-exports — all are class exports

### Established Patterns
- `index.ts` uses both `export * from` (barrel re-exports) and `export { specific } from` (named re-exports) — the named export pattern already exists in the file
- `export * as engine from './engine'` (line 830) is a namespace re-export, NOT a star re-export — leave untouched

### Integration Points
- `index.browser.ts` imports `setApp` at line 85 within a destructured named import block — removal means deleting it from that import list
- Any downstream package importing from `@gravito/core` will continue to work as long as all symbols are preserved in the named export lists

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-named-export-conversion*
*Context gathered: 2026-03-29*
