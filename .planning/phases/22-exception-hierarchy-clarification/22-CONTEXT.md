# Phase 22: Exception Hierarchy Clarification - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Add clear JSDoc role-separation documentation to AuthException (abstract base) and AuthenticationException (concrete 401) in @gravito/core. No renames, no deletions, no structural changes. The goal is that a developer reading the VS Code hover tooltip can immediately distinguish which class to extend and which to throw.

</domain>

<decisions>
## Implementation Decisions

### JSDoc Language & Depth
- **D-01:** JSDoc written in **English** — consistent with existing JSDoc on these classes and appropriate for public API surface
- **D-02:** **Role description only**, no `@example` blocks — success criteria #4 requires hover-tooltip clarity, which is best served by concise role statements rather than lengthy code examples

### Inheritance Reality (Finding)
- **D-03:** AuthenticationException extends **DomainException**, not AuthException — they are siblings, not parent-child. JSDoc must accurately reflect this inheritance without implying AuthenticationException is a subclass of AuthException. AuthException's subclasses are FortifyError (fortify) and SentinelError (sentinel).

### Claude's Discretion
- Exact wording of JSDoc — Claude should write clear, concise role descriptions that satisfy all 4 success criteria
- Whether to add `@see` cross-references between the two classes — Claude can decide if this aids tooltip clarity
- Whether to add `@abstract` tag to AuthException (it's already declared `abstract` in code but the JSDoc tag would reinforce it in tooltips)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Code (targets)
- `packages/core/src/exceptions/AuthException.ts` — Abstract base class, current JSDoc is minimal
- `packages/core/src/exceptions/AuthenticationException.ts` — Concrete 401 class, current JSDoc is minimal
- `packages/core/src/exceptions/AuthenticationException.d.ts` — Declaration file, may need JSDoc sync

### Downstream consumers (instanceof chains to verify unaffected)
- `packages/fortify/src/errors/FortifyError.ts` — extends AuthException
- `packages/sentinel/src/errors/SentinelError.ts` — extends AuthException
- `packages/core/tests/contract/intermediate-exceptions.contract.test.ts` — AuthException contract tests
- `packages/core/tests/contract/core-exceptions.contract.test.ts` — AuthenticationException contract tests

### Requirements
- `.planning/REQUIREMENTS.md` — EXC-01 definition

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Both classes already have basic JSDoc (`@public` tags) — enhancement, not creation from scratch
- Exception hierarchy is well-established: GravitoException > DomainException > AuthException (abstract) and AuthenticationException (concrete, sibling)

### Established Patterns
- GravitoException hierarchy uses `@public`/`@internal` JSDoc tags consistently
- `abstract` keyword is used in TypeScript class declarations
- Contract tests verify `instanceof` chains for both classes

### Integration Points
- fortify and sentinel packages extend AuthException — their contract tests verify instanceof AuthException
- No code depends on the JSDoc content itself — changes are purely documentation

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint: JSDoc must be accurate about the inheritance relationship (AuthenticationException is a sibling of AuthException, not a child).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-exception-hierarchy-clarification*
*Context gathered: 2026-03-29*
