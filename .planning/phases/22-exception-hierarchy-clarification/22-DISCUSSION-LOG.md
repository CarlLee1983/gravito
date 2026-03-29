# Phase 22: Exception Hierarchy Clarification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 22-exception-hierarchy-clarification
**Areas discussed:** JSDoc Language & Depth

---

## JSDoc Language & Depth

### Q1: JSDoc Language

| Option | Description | Selected |
|--------|-------------|----------|
| English (Recommended) | Consistent with existing JSDoc, appropriate for public API | :white_check_mark: |
| Chinese | Matches project conventions, easier for team | |
| Bilingual | English primary with Chinese summary in parentheses | |

**User's choice:** English (Recommended)
**Notes:** Consistent with existing exception class JSDoc and public API convention

### Q2: JSDoc Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Role description only (Recommended) | Concise role statement satisfies hover-tooltip clarity requirement | :white_check_mark: |
| Include @example | Adds usage examples, richer but longer tooltips | |

**User's choice:** Role description only (Recommended)
**Notes:** Success criteria #4 focuses on tooltip clarity — concise descriptions serve this better

## Areas Not Discussed (user chose not to discuss)

- **Inheritance relationship description** — AuthenticationException extends DomainException, not AuthException. Finding noted in CONTEXT.md D-03 for Claude's discretion.
- **Cross-package references** — Whether JSDoc should mention fortify/sentinel by name. Left to Claude's discretion.

## Claude's Discretion

- Exact JSDoc wording
- Whether to add `@see` cross-references
- Whether to add `@abstract` JSDoc tag

## Deferred Ideas

None
