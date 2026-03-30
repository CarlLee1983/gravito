# Phase 21: API Footgun Fixes - Research

**Researched:** 2026-03-29
**Domain:** @gravito/core internal API cleanup (Router, PlanetCore, TypeScript annotations)
**Confidence:** HIGH

## Summary

Phase 21 targets five discrete, surgical fixes inside `packages/core` only. All fixes are backward-compatible. The required changes are small (1–10 lines each), the root causes are verified by direct source-code inspection, and the test infrastructure (Bun test runner with `spyOn`) is already proven in the codebase.

FIX-01 through FIX-04 are straightforward one-location changes. FIX-05 is the most complex: the two skipped `mountOrbit` tests expose a genuine routing gap in `BunNativeAdapter.mount()` — the sub-adapter receives a prefix-stripped path (e.g. `/posts`) but only has middleware registered at `/`, so the request falls through to 404. The fix requires ensuring the mount handler routes to the sub-adapter's root when the stripped path would otherwise miss all registered handlers.

FIX-03 has a tracing conflict: REQUIREMENTS.md maps it to Phase 24, but Phase 21 success criteria #3 requires it. The CONTEXT.md guidance is to treat it as a simple one-line `boot()` spread fix that can land in Phase 21.

**Primary recommendation:** Implement in order FIX-05 → FIX-01 → FIX-02 → FIX-03 → FIX-04. FIX-05 first because its tests guard the exact behavior FIX-01 modifies (router console.log output path).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Tests for each fix should be added to existing test files, not new dedicated files. FIX-01/02 go into Router tests, FIX-03 into PlanetCore tests, FIX-04 into existing type/deprecation tests, FIX-05 restores the already-existing skipped tests.
- **D-02:** FIX-01 (console.log removal) should be verified via `spyOn(console, 'log')` — spy after route registration and assert it was not called.
- **D-03:** FIX-05 (skipped tests) — the two `it.skip` tests in `orbit-middleware-isolation.test.ts` may require changes to mountOrbit path stripping or middleware dispatch logic in Router/PlanetCore. Scope of implementation changes is at Claude's discretion based on analysis, but existing tests must not break.

### Claude's Discretion
- FIX-02 implementation approach: whether to throw ModelNotFoundException directly at Router.ts:436 (eliminating the two-stage throw/catch) or keep the catch structure with a different signal mechanism.
- FIX-05 fix scope: analyze the root cause and determine the minimal fix needed; escalate to a future phase if the change would be too invasive.
- FIX-03/Phase ownership: resolve the REQUIREMENTS.md vs Phase 21 success criteria conflict during planning — likely a simple one-line fix in boot() that can be done in Phase 21.

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIX-01 | Router route registration produces zero console output on stdout | Delete `console.log` at Router.ts:610; verify via `spyOn(console, 'log')` |
| FIX-02 | Router model() uses ModelNotFoundException instead of string sentinel | Throw `ModelNotFoundException` directly at Router.ts:436, remove string-comparison catch at 473-476 |
| FIX-03 | PlanetCore.boot() forwards observabilityProvider to constructor | Add `...(config.observabilityProvider && { observabilityProvider: config.observabilityProvider })` to spread at PlanetCore.ts:789-794 |
| FIX-04 | core.services property has TypeScript @deprecated annotation | `@deprecated` JSDoc already present at PlanetCore.ts:202 — verify IDE rendering and add `@deprecated` to type-level if needed |
| FIX-05 | Two skipped tests in orbit-middleware-isolation.test.ts pass | Fix BunNativeAdapter.mount() so sub-adapter routes to root `/` when prefix-stripped path is non-empty but no specific route matches |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bun:test | Built-in | Test runner with spyOn, describe, it | Already used in all packages/core tests |
| TypeScript JSDoc `@deprecated` | Language built-in | IDE strikethrough signal | Standard TS mechanism, no runtime cost |

No new dependencies required. All fixes use existing code paths and test utilities.

**Environment:** All work is inside `packages/core/src/` and `packages/core/tests/`. No cross-package changes.

---

## Architecture Patterns

### Pattern 1: Exception-first model binding (FIX-02)

**What:** Throw typed exception directly from resolver instead of throwing a sentinel string and re-catching it.

**When to use:** When the failure is unambiguous and the error type is already imported at the call site.

**Current code (Router.ts:426-479):**
```typescript
// Resolver (line 436): throws string sentinel
if (!instance) {
  throw new Error('ModelNotFound')
}
// ...
// Middleware (line 473-476): catches string, re-throws typed
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : undefined
  if (message === 'ModelNotFound') {
    throw new ModelNotFoundException(param, value)
  }
  throw err
}
```

**Recommended fix (cleanest approach — Claude's discretion confirmed):**
```typescript
// Resolver: throw typed exception directly
if (!instance) {
  throw new ModelNotFoundException(param, String(id))
}
// ...
// Middleware catch: remove string-comparison branch entirely
// Only re-throw whatever comes up
} catch (err: unknown) {
  throw err
}
// Or simplify: remove try/catch entirely since resolver now throws typed
```

Note: The `model()` method's anonymous resolver closes over `param` but not `value` (it receives `value` as the argument `id`). The direct throw works because `ModelNotFoundException` constructor accepts `(model: string, id?: string | number)`.

### Pattern 2: boot() spread fix (FIX-03)

**What:** Add the missing field to the options spread in `PlanetCore.boot()`.

**Current code (PlanetCore.ts:789-794):**
```typescript
const core = new PlanetCore({
  ...(config.logger && { logger: config.logger }),
  ...(config.config && { config: config.config }),
  ...(config.adapter && { adapter: config.adapter }),
  ...(config.container && { container: config.container }),
})
```

**Fix:**
```typescript
const core = new PlanetCore({
  ...(config.logger && { logger: config.logger }),
  ...(config.config && { config: config.config }),
  ...(config.adapter && { adapter: config.adapter }),
  ...(config.container && { container: config.container }),
  ...(config.observabilityProvider && { observabilityProvider: config.observabilityProvider }),
})
```

The `PlanetCore` constructor already accepts `observabilityProvider?: ObservabilityProvider` (confirmed at line 560). The `GravitoConfig` interface already declares `observabilityProvider?: ObservabilityProvider` (confirmed at line 156). This is a single-line addition.

### Pattern 3: FIX-05 mountOrbit path-stripping root cause

**What:** `BunNativeAdapter.mount()` creates a wildcard route `/blog/*`. When a request for `/blog/posts` arrives, the mount handler strips `/blog` → `/posts`, then calls `subAdapter.fetch(newReq)`. Inside the sub-adapter, `use('/', handler)` registers middleware for the path `/`. The `matchesPath('/', '/posts')` check fails because `/posts !== /` and `/posts` does not start with `//`. So the sub-adapter receives no matching handlers and returns 404.

**Root cause confirmed:** In `BunNativeAdapter.matchesPath()`:
```typescript
// Line 114-116
return path === pattern || path.startsWith(`${pattern}/`)
// For pattern='/', path='/posts': '/' === '/posts' → false
// '/posts'.startsWith('//') → false
// Result: no middleware match
```

Additionally, routes registered with `adapter.use('/', handler)` are middleware (not route handlers), and the sub-adapter has no routes registered via `route()`. The RadixRouter's `match('GET', '/posts')` returns null. No notFound handler is set. `executeChain` runs with empty handlers and returns a default empty response.

**Fix options (Claude's discretion):**

Option A — In `mount()`, normalize the stripped path: if `newPath === ''` or `newPath === '/'`, pass `/` (already done). But the issue is for non-empty paths like `/posts` with no matching route. This requires the sub-adapter to have a catch-all route.

Option B — In the test, register the sub-adapter handler at `use('*', ...)` instead of `use('/', ...)`. This is a test-only change. The test description says "route to / fallback" which implies this is intentional behavior. But changing the test defeats the purpose of the test (testing the framework, not changing the test to fit the bug).

Option C — In `mount()`, after stripping the prefix, also create a fallback: if the sub-adapter returns 404, retry with `/`. This is fragile and wrong.

Option D — Fix `matchesPath` to treat `'/'` as a wildcard prefix (i.e., `/` matches any path). This aligns with Express/Hono semantics where `app.use('/')` is equivalent to `app.use('*')`. This is the minimal correct fix: change the `/` prefix match to match any path that starts with `/` (which is all paths).

**Recommended approach (Option D):**
In `BunNativeAdapter.matchesPath()`, add a special case: if `pattern === '/'` treat it as global wildcard (same as `'*'`). This matches HTTP framework conventions and unblocks the mount tests.

```typescript
private matchesPath(pattern: string, path: string): boolean {
  if (pattern === '*') {
    return true
  }
  if (pattern === '/') {
    return true  // '/' means "match all" in middleware semantics
  }
  // ... rest unchanged
}
```

**Risk assessment:** This change affects all usages of `use('/', ...)`. Existing tests that register middleware at `/` and expect it to fire on all routes: this already works (those tests pass). Existing tests that expect `/` middleware NOT to fire on non-root paths: search required to verify none exist.

### Pattern 4: FIX-04 @deprecated verification

The `@deprecated` JSDoc is already present at PlanetCore.ts:202:
```typescript
/** @deprecated Use core.container instead */
public services: Map<string, unknown> = new Map()
```

TypeScript IDEs (VSCode, WebStorm) render `@deprecated` as strikethrough automatically. No code change needed unless the annotation is malformed. The planner should verify the JSDoc is on its own line and not embedded in a block that TypeScript ignores. Current form is a single-line `/** */` comment — this is valid.

**The planner task for FIX-04 is verification only** (confirm strikethrough renders) plus writing a test that accessing `core.services` does not throw a TypeScript error (type check passes).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Console spy in tests | Custom stdout capture | `spyOn(console, 'log')` from `bun:test` | Already proven in shutdown-global-timeout.test.ts |
| Typed exceptions | New error class | `ModelNotFoundException` (already imported in Router.ts) | Class exists, tested, follows GravitoException hierarchy |
| Deprecation signal | Custom `__deprecated` property | TypeScript JSDoc `@deprecated` | Zero runtime overhead, IDE-native |

---

## Common Pitfalls

### Pitfall 1: FIX-02 — param name vs value in resolver closure

**What goes wrong:** The `model()` method's anonymous resolver function receives `id` as argument (the raw URL param value). The `param` variable is the binding name (e.g., `'post'`). If Claude throws `new ModelNotFoundException(param, value)` using the outer scope `value` instead of the resolver argument `id`, the wrong value is passed.

**How to avoid:** Inside the resolver: `throw new ModelNotFoundException(param, id)` where `id` is the resolver's argument, not any outer variable.

**Warning signs:** TypeScript `noUnusedLocals` would not catch this; it's a semantic bug not a type error.

### Pitfall 2: FIX-02 — removing try/catch may break other resolver errors

**What goes wrong:** The current catch block also re-throws non-ModelNotFound errors (`throw err`). If the try/catch is removed entirely, resolver errors would propagate naturally — which is actually fine. But if there's middleware after the resolver that expects the catch block behavior, removing it changes semantics.

**How to avoid:** Keep the catch block, just remove the string-comparison branch. Or confirm no middleware depends on the two-stage behavior.

### Pitfall 3: FIX-05 — matchesPath('/', ...) affects all existing middleware tests

**What goes wrong:** Changing `/` to match all paths could break tests that register middleware at `/` expecting it only fires on root requests.

**How to avoid:** Grep for `use('/', ...)` in all test files. Verify no test asserts that `use('/', handler)` does NOT execute on `/non-root` paths. If such tests exist, use Option B (sub-adapter uses `'*'`) or add a narrower test-fixture-level workaround.

**Warning signs:** Test failures in `adapters-bun-native.test.ts`, `middleware-semantics-regression.test.ts`, or `adapters-integration.test.ts`.

### Pitfall 4: FIX-03 — conditional spread with falsy ObservabilityProvider

**What goes wrong:** Using `...(config.observabilityProvider && ...)` with a valid but falsy-ish provider object will silently drop the value. Since `ObservabilityProvider` is an object, this is safe — objects are truthy. But if someone passes `null` intentionally to disable the provider, the condition correctly omits it.

**How to avoid:** Keep the conditional spread pattern consistent with the existing fields in boot(). No special case needed.

### Pitfall 5: FIX-01 — console.log removal affects debug workflows

**What goes wrong:** Developers may rely on the `[Router] Registering GET /path` output during development to confirm route registration. Removing it silently could confuse them.

**How to avoid:** This is a footgun fix — the output should not exist in a production library. The planner should note this is intentional. No alternative logging needed (logger.debug would require passing the logger into Router, which is a larger change outside scope).

---

## Code Examples

### FIX-01: Remove console.log (Router.ts:610)

```typescript
// Source: packages/core/src/Router.ts line 609-610
// Before:
const fullPath = (options.prefix || '') + path
console.log(`[Router] Registering ${method.toUpperCase()} ${fullPath}`)

// After:
const fullPath = (options.prefix || '') + path
// (line deleted)
```

### FIX-01: Test (router.test.ts or route-extra.test.ts)

```typescript
// Source pattern: bun:test spyOn — verified in shutdown-global-timeout.test.ts
import { spyOn } from 'bun:test'

it('should not log to console when registering routes', () => {
  const core = new PlanetCore()
  const spy = spyOn(console, 'log').mockImplementation(() => {})
  core.router.get('/test', async (c) => c.text('ok'))
  expect(spy).not.toHaveBeenCalled()
  spy.mockRestore()
})
```

### FIX-02: Direct throw (Router.ts:436)

```typescript
// Before:
if (!instance) {
  throw new Error('ModelNotFound')
}

// After:
if (!instance) {
  throw new ModelNotFoundException(param, String(id))
}
```

Then in the middleware catch (lines 473-479), remove the string-comparison branch:

```typescript
// Before:
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : undefined
  if (message === 'ModelNotFound') {
    throw new ModelNotFoundException(param, value)
  }
  throw err
}

// After: the catch block can be simplified or removed entirely
// since ModelNotFoundException now propagates directly
```

### FIX-03: boot() one-line addition (PlanetCore.ts:789-794)

```typescript
const core = new PlanetCore({
  ...(config.logger && { logger: config.logger }),
  ...(config.config && { config: config.config }),
  ...(config.adapter && { adapter: config.adapter }),
  ...(config.container && { container: config.container }),
  ...(config.observabilityProvider && { observabilityProvider: config.observabilityProvider }),
})
```

### FIX-05: matchesPath root-as-wildcard (BunNativeAdapter.ts)

```typescript
private matchesPath(pattern: string, path: string): boolean {
  if (pattern === '*') {
    return true
  }
  // HTTP framework convention: use('/', ...) means "match all"
  if (pattern === '/') {
    return true
  }
  // ... rest of method unchanged
}
```

---

## Runtime State Inventory

Not applicable — this is a greenfield bug-fix phase with no rename, rebrand, or migration. No stored data, live service config, OS-registered state, secrets, or build artifacts reference the changed code paths.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `throw new Error('ModelNotFound')` string sentinel | Direct `throw new ModelNotFoundException()` | This phase | Enables `instanceof` checks in catch blocks |
| `console.log` in Router.req() | Silent registration | This phase | Clean stdout in production |
| `observabilityProvider` silently dropped by boot() | Forwarded via spread | This phase | @gravito/monitor integration works correctly |

---

## Open Questions

1. **FIX-05: matchesPath('/', ...) side-effects**
   - What we know: `use('/', handler)` is used in tests (test file `orbit-middleware-isolation.test.ts` line 62 and 101); `matchesPath` is called for every middleware on every request
   - What's unclear: Whether any existing test asserts that `use('/', handler)` does NOT fire on non-root paths
   - Recommendation: Planner should include a grep task (`grep -r "use('/', " packages/core/tests/`) before applying the fix; if conflicting tests found, scope to Option B (test fixture uses `'*'` instead of `'/'`)

2. **FIX-04: @deprecated IDE rendering**
   - What we know: `/** @deprecated Use core.container instead */` is present at PlanetCore.ts:202
   - What's unclear: Whether the annotation renders as strikethrough in all target IDE environments or needs a `@deprecated` tag in a multiline block comment to be recognized by all TypeScript language services
   - Recommendation: The current single-line `/** */` form is valid TypeScript JSDoc. No code change needed — the planner task is verification + type-level test.

3. **FIX-03 Phase ownership conflict**
   - What we know: REQUIREMENTS.md maps FIX-03 to Phase 24; Phase 21 success criteria #3 includes it; CONTEXT.md guidance says to treat as a simple one-line fix
   - What's unclear: Whether Phase 24 plans to do something more with observabilityProvider that the Phase 21 fix would conflict with
   - Recommendation: Do the one-line fix in Phase 21. Document in STATE.md that FIX-03 is completed in Phase 21, Phase 24 only needs to handle TYPE-01 (ApplicationConfig).

---

## Environment Availability

Step 2.6: No external dependencies beyond the project's own toolchain. All fixes are code-only changes within `packages/core/`.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bun test | All test verification | Yes (project uses Bun throughout) | Bun built-in | — |
| TypeScript strict | FIX-04 type check | Yes (tsconfig noUnusedLocals enabled) | Project-configured | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) |
| Config file | `packages/core/package.json` test script |
| Quick run command | `cd packages/core && bun test --testPathPattern orbit-middleware-isolation` |
| Full suite command | `cd packages/core && bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | No console.log during route registration | unit | `cd packages/core && bun test --testPathPattern router` | Needs new test in existing file |
| FIX-02 | Router model() throws ModelNotFoundException (instanceof check works) | unit | `cd packages/core && bun test --testPathPattern router` | Needs new test in existing file |
| FIX-03 | boot() forwards observabilityProvider to constructor | unit | `cd packages/core && bun test --testPathPattern planet-core` (or application.test.ts) | Needs new test in existing file |
| FIX-04 | core.services @deprecated renders without type error | type | `bun run typecheck` | Verification task |
| FIX-05 | Skipped tests pass: mount routes to orbit, middleware isolation | integration | `cd packages/core && bun test --testPathPattern orbit-middleware-isolation` | ✅ orbit-middleware-isolation.test.ts:33,74 (currently skipped) |

### Sampling Rate

- **Per task commit:** `cd packages/core && bun test --testPathPattern <relevant-file>`
- **Per wave merge:** `cd packages/core && bun test`
- **Phase gate:** `bun run typecheck` (full workspace) green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. No new test files needed; new tests go inside existing files per D-01.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Source | Implication for this phase |
|-----------|--------|---------------------------|
| TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`) | CLAUDE.md key constraints #1 | After removing the `message` local variable from the FIX-02 catch block, ensure no unused variable warning |
| Forbid `@ts-ignore` without explanation | CLAUDE.md key constraints #2 | FIX-04 @deprecated access in test must not use @ts-ignore |
| No mutation (immutability) | global CLAUDE.md coding-style | Not relevant for these fixes |
| Code style: 100 char width, 2 spaces, single quotes, no semicolons | CLAUDE.md key constraints #5 | All new code must follow |
| Commit messages in English | CLAUDE.md key constraints #6 | e.g. `fix: [core] remove Router console.log stdout leakage` |
| Satellite isolation (no direct cross-import) | CLAUDE.md key constraints #3 | Not relevant — all changes in packages/core only |
| FIX-05 must complete before FIX-01 | STATE.md key decisions | Enforce execution order in plan waves |

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection: `packages/core/src/Router.ts` lines 436, 473-479, 610
- Direct source code inspection: `packages/core/src/PlanetCore.ts` lines 156, 202-203, 554-567, 788-794
- Direct source code inspection: `packages/core/src/adapters/bun/BunNativeAdapter.ts` lines 62-116, 166-194
- Direct source code inspection: `packages/core/src/adapters/bun/RadixRouter.ts` lines 107-198
- Direct source code inspection: `packages/core/src/exceptions/ModelNotFoundException.ts`
- Direct source code inspection: `packages/core/tests/orbit-middleware-isolation.test.ts`
- Direct source code inspection: `packages/core/tests/shutdown-global-timeout.test.ts` (spyOn pattern)

### Secondary (MEDIUM confidence)
- TypeScript handbook: `@deprecated` JSDoc renders as strikethrough in all major TypeScript language servers (VS Code, WebStorm, coc.nvim)
- HTTP framework conventions (Express, Hono, Koa): `app.use('/')` is semantically equivalent to `app.use('*')` (match-all middleware)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing tooling confirmed
- Architecture: HIGH — all fix locations verified by direct source reading
- Pitfalls: HIGH — derived from actual code paths, not assumptions
- FIX-05 side-effects: MEDIUM — matchesPath change impact on existing tests requires grep validation at plan time

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable codebase, 30-day window)
