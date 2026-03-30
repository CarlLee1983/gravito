# Phase 21: API Footgun Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 21-api-footgun-fixes
**Areas discussed:** Testing Strategy

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| FIX-02 string comparison elimination strategy | Router.ts:436 throw pattern — direct throw vs catch restructure | |
| FIX-05 skipped test fix strategy | Two it.skip tests with KNOWN LIMITATION — scope of Router changes | |
| FIX-03 ownership clarification | REQUIREMENTS.md maps to Phase 24 but Phase 21 success criteria includes it | |
| Testing strategy | Test organization, verification methods, coverage targets | ✓ |

**User's choice:** Testing strategy only — other areas clear enough for Claude's discretion.

---

## Testing Strategy

### Test Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing test files (Recommended) | FIX-01/02 into Router tests, FIX-03 into PlanetCore tests, FIX-05 restores existing skipped tests | ✓ |
| Dedicated test file | Create api-footgun-fixes.test.ts for all 5 fixes | |
| Mixed approach | Small fixes extend existing, larger Router changes get own file | |

**User's choice:** Extend existing test files
**Notes:** No new test files needed — each fix adds to the test file closest to the modified code.

### FIX-01 Verification Method

| Option | Description | Selected |
|--------|-------------|----------|
| spy console.log (Recommended) | spyOn(console, 'log'), register routes, assert not called | ✓ |
| Capture stdout | Child process execution, capture actual stdout output | |
| Claude decides | Let downstream agent choose | |

**User's choice:** spy console.log
**Notes:** Simple and precise approach for verifying no stdout output during route registration.

### FIX-05 Fix Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Allow necessary Router changes | Adjust mountOrbit path stripping or middleware dispatch if needed, ensure existing tests pass | |
| Minimal changes only | Prefer minimal fix, escalate to future phase if invasive | |
| Claude's judgment | Let downstream agent analyze root cause and determine scope | ✓ |

**User's choice:** Claude's judgment
**Notes:** Agent should analyze the root cause and determine minimal fix, escalating if too invasive.

---

## Claude's Discretion

- FIX-02 implementation approach (direct throw vs catch restructure)
- FIX-05 fix scope (minimal vs allowing Router changes)
- FIX-03 phase ownership resolution

## Deferred Ideas

None — discussion stayed within phase scope
