# Phase 23: Named Export Conversion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 23-named-export-conversion
**Areas discussed:** Conversion depth, setApp removal, Browser barrel sync, Verification method

---

## Conversion Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level only | Only convert 6 star exports in index.ts. Nested barrels keep their star re-exports. Smallest diff, matches MOD-01 scope exactly. | ✓ |
| Full depth | Also convert nested barrel files (exceptions/index.ts, testing/index.ts, adapters/bun/index.ts). Maximum auditability but bigger diff. | |
| Top-level + exceptions only | Convert index.ts AND exceptions/index.ts (17 re-exports). Middle ground. | |

**User's choice:** Top-level only (Recommended)
**Notes:** Matches MOD-01 scope exactly. Nested barrels are an internal implementation detail.

---

## setApp Removal

| Option | Description | Selected |
|--------|-------------|----------|
| Remove from barrel only | Remove setApp from export lists in index.ts and index.browser.ts. Function source stays unchanged. Internal code can still import directly. | ✓ |
| Remove + add @internal JSDoc | Remove from barrel AND add @internal JSDoc tag to function definition. | |
| Remove + deprecate | Keep in barrel but mark @deprecated with warning message. Migration window. | |

**User's choice:** Remove from barrel only (Recommended)
**Notes:** Clean removal, no extra annotations needed.

---

## Browser Barrel Sync

| Option | Description | Selected |
|--------|-------------|----------|
| MOD-03 scope only | Only sync MOD-01/MOD-02 changes: convert 3 shared helpers to named exports and remove setApp. Leave events and runtime star exports untouched. | ✓ |
| Convert all browser star exports | Also convert events and runtime/index.browser star exports. Consistent but expands scope. | |

**User's choice:** MOD-03 scope only (Recommended)
**Notes:** Browser-specific exports are out of scope for this phase.

---

## Verification Method

| Option | Description | Selected |
|--------|-------------|----------|
| Automated d.ts diff | Run tsc --declaration before and after, diff the .d.ts files. Script-based, repeatable. | ✓ |
| Manual review | Manually compare star-exported symbols against new named export list. Simpler but error-prone. | |
| You decide | Claude picks approach during planning/execution. | |

**User's choice:** Automated d.ts diff (Recommended)
**Notes:** Satisfies success criteria #1 with repeatable verification.

---

## Claude's Discretion

- Export ordering style (alphabetical, grouped by type, etc.)
- Whether to use `export type` for type-only re-exports
- D.ts diff script implementation approach

## Deferred Ideas

None — discussion stayed within phase scope
