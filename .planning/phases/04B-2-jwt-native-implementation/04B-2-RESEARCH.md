# Phase 04B-2: JWT Native Implementation - Research

**Researched:** 2026-03-26
**Domain:** JWT Authentication, jose library, TypeScript strict mode, test quality
**Confidence:** HIGH (primary sources: direct codebase inspection, test execution, git log)

---

## Summary

Phase 4B-2 的核心任務（將 `hono/jwt` 替換為 `jose` 原生實現）**已在 commit `6c2c99ae` 中完成**。`packages/photon/src/jwt.ts` 已是完全原生的 jose 實現（272 行），`packages/photon/tests/native/native-jwt.test.ts` 包含 42 個全部通過的測試。

然而，Phase 尚未完成驗收：存在 **2 個 TypeScript 錯誤**（在 `tests/exports.test.ts`）和 **1 個測試失敗**（在 `tests/exports.test.ts`，非 JWT 相關，屬 trie-router 退化問題）。此外，`verifyWithJwks` 仍以 stub（拋出 `not yet implemented` 錯誤）形式存在，需決定是實現還是標記為已棄用。

**Primary recommendation:** 修復 `tests/exports.test.ts` 的 TypeScript 錯誤和測試失敗（小範圍改動），確認 `verifyWithJwks` 策略，達成所有 verification gates。

---

## Current Implementation State (VERIFIED)

### jwt.ts — COMPLETE (native implementation)

| Function | Status | Implementation |
|----------|--------|----------------|
| `sign()` | ✅ Done | `jose.SignJWT`, HS256 default, string/Buffer/Uint8Array secret |
| `verify()` | ✅ Done | `jose.jwtVerify`, signature + expiration validation |
| `decode()` | ✅ Done | Manual base64 decode, no verification |
| `jwt()` | ✅ Done | Middleware, Bearer header + cookie extraction, context storage |
| `verifyWithJwks()` | ⚠️ Stub | Throws "not yet implemented" — needs decision |

### Dependencies

| Package | Version | Status |
|---------|---------|--------|
| `jose` | `^6.2.2` (latest: 6.2.2) | ✅ Already in package.json |
| `hono` | `^4.12.2` | Still present (other modules still depend on it) |

### Test Results (as of 2026-03-26)

| File | Tests | Pass | Fail |
|------|-------|------|------|
| `tests/native/native-jwt.test.ts` | 42 | 42 | 0 |
| `tests/exports.test.ts` (JWT sections) | 7 | 7 | 0 |
| `tests/exports.test.ts` (trie-router section) | 1 | 0 | 1 |
| Photon suite total | 284 | 283 | 1 |

---

## Remaining Issues

### Issue 1: TypeScript Errors in tests/exports.test.ts (BLOCKING)

**File:** `packages/photon/tests/exports.test.ts`
**Errors:**

```
tests/exports.test.ts(3,1): error TS6133: 'Hono' is declared but its value is never read.
tests/exports.test.ts(139,33): error TS7006: Parameter 'c' implicitly has an 'any' type.
tests/exports.test.ts(142,25): error TS7006: Parameter 'c' implicitly has an 'any' type.
```

**Root cause:**
- Line 3: `import { Hono } from 'hono'` — imported but never used in the current test code (likely leftover from refactoring)
- Lines 139, 142: Two middleware callbacks use `(c)` parameter without type annotation — `(c: GravitoContext)` needed

**Fix:** Remove unused `Hono` import; add explicit type annotation to `c` parameters.

### Issue 2: Test Failure in exports.test.ts (BLOCKING)

**Test:** `photon exports > re-exports hono router helpers`
**Error:**
```
Expected: 0
Received: 1
```
**Root cause:** `trie-router.ts` exports `* from 'hono/router/trie-router'` which has 1 runtime export. The test expects 0 exports (because reg-exp-router was converted to a type-only stub in Phase 4B-1). The trie-router has NOT yet been converted to a type-only stub — this is a Phase 4B-1 regression that appeared after that commit but was not caught.

**Fix options:**
1. Convert `trie-router.ts` to a type-only stub (same pattern as `reg-exp-router.ts`) — preferred, consistent with Phase 4B-1 strategy
2. Update the test to expect 1 export — NOT preferred (loses intent)

### Issue 3: verifyWithJwks — Decision Needed

**Current state:** Function exists, exported, throws `Error('verifyWithJwks is not yet implemented in native JWT...')` at runtime.

**Usage audit:** Zero production usage in codebase (grep confirmed no imports of `verifyWithJwks` outside of jwt.ts and tests).

**Decision options:**
1. **Mark as deprecated stub** (recommended): Keep current throw behavior, update JSDoc to say `@deprecated`, add `@throws always` note. This maintains API surface without requiring JWKS implementation.
2. **Implement with `jose.createRemoteJWKSet`**: Medium complexity, requires HTTP fetch, caching strategy. Adds value for OIDC providers but zero current users.
3. **Remove**: Breaking change — not acceptable for backwards compat.

---

## Standard Stack

### Core
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `jose` | `^6.2.2` | JWT sign, verify, decode operations | Already in package.json |

### jose API Used

```typescript
// Source: packages/photon/src/jwt.ts (verified in codebase)
import { jwtVerify, SignJWT } from 'jose'

// Sign
const jwt = await new SignJWT(payload)
  .setProtectedHeader({ alg })
  .setIssuedAt()
  .sign(secretBytes)

// Verify
const verified = await jwtVerify(token, secretBytes)
return verified.payload
```

**Secret encoding pattern:**
```typescript
function getSecretBytes(secret: string | Buffer | Uint8Array): Uint8Array {
  if (typeof secret === 'string') return new TextEncoder().encode(secret)
  if (secret instanceof Buffer) return new Uint8Array(secret)
  return secret
}
```

---

## Architecture Patterns

### Type Compatibility

All exported types are already correctly defined for API compatibility:

```typescript
export type JwtPayload = Record<string, unknown>
export type JwtHeader = Record<string, unknown>
export interface JwtOptions {
  secret: string | Buffer | Uint8Array
  cookie?: string
  alg?: string
  [key: string]: unknown
}
export type JwtFunction = (options: JwtOptions) => GravitoMiddleware
```

### trie-router Type-Only Stub Pattern (from Phase 4B-1)

`reg-exp-router.ts` was already converted to this pattern in Phase 4B-1:

```typescript
// Type-only stub — runtime exports nothing, types still available
export type { RegExpRouter } from 'hono/router/reg-exp-router'
```

`trie-router.ts` must follow the same pattern to fix the test failure.

### JWT Middleware Context Key

The middleware stores payload as `'jwtPayload'` in context:
```typescript
ctx.set('jwtPayload', payload)
// Consumer: const payload = ctx.get('jwtPayload')
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signature | Custom HMAC | `jose.SignJWT` | Constant-time comparison, algorithm agility |
| JWT verification | Manual base64 + decode | `jose.jwtVerify` | Handles exp/nbf/iss claims automatically |
| JWKS fetching | Manual HTTP + cache | `jose.createRemoteJWKSet` | Key rotation, caching, retries built-in |
| Secret encoding | Custom converter | `new TextEncoder().encode()` | Standard Web API, Bun-native |

---

## Common Pitfalls

### Pitfall 1: `noUnusedLocals` TypeScript Error on Imports
**What goes wrong:** Importing `Hono` from `'hono'` but not using it triggers TS6133.
**Why it happens:** Leftover import after refactoring test file.
**How to avoid:** Remove unused imports immediately. TypeScript strict mode (`noUnusedLocals: true`) is enforced in this project.

### Pitfall 2: Implicit `any` Parameter in Middleware Callbacks
**What goes wrong:** `(c) => ...` without type annotation fails with TS7006 under `strict: true`.
**How to avoid:** Always annotate Photon handler parameters: `(c: GravitoContext) => ...`

### Pitfall 3: Bearer Token Whitespace Handling
**What goes wrong:** `authHeader.slice(7)` without `.trim()` fails for `Bearer  token` (double space).
**How to avoid:** Always `.trim()` after slicing the Bearer prefix. Current implementation does this correctly.

### Pitfall 4: trie-router Still Has Runtime Export
**What goes wrong:** Exporting `* from 'hono/router/trie-router'` includes runtime code, breaking the "type-only" promise.
**Why it matters:** Phase 4B-1 already converted reg-exp-router; trie-router must match.
**How to avoid:** Use `export type { TrieRouter } from 'hono/router/trie-router'` pattern.

### Pitfall 5: verifyWithJwks Stub Silently Fails
**What goes wrong:** Calling `verifyWithJwks()` throws at runtime — could confuse users expecting it works.
**How to avoid:** Ensure JSDoc clearly states deprecated/not-implemented status. Add `@deprecated` annotation.

---

## Code Examples

### Fixing exports.test.ts TypeScript Errors

```typescript
// Remove: import { Hono } from 'hono'  ← delete this line

// Before (error TS7006):
app.get('/protected/data', (c) => c.json({ secret: 'data' }))

// After (fixed):
app.get('/protected/data', (c: GravitoContext) => c.json({ secret: 'data' }))
```

### Converting trie-router to Type-Only Stub

```typescript
// packages/photon/src/router/trie-router.ts
// Before:
export * from 'hono/router/trie-router'

// After (type-only stub, matches Phase 4B-1 reg-exp-router pattern):
/**
 * @deprecated v2.0 - Type-only stub for backwards compatibility.
 * Trie Router functionality is available natively in Photon.
 * This export will be removed in v3.0.
 */
export type { TrieRouter } from 'hono/router/trie-router'
```

### Marking verifyWithJwks as Deprecated Stub

```typescript
/**
 * @deprecated Not implemented in native JWT. Use verify() with explicit secret.
 * Will be implemented in a future version for OIDC providers.
 * @throws {Error} Always throws - not yet implemented
 */
export async function verifyWithJwks(
  _token: string,
  _options: { jwksUri: string; [key: string]: unknown }
): Promise<JwtPayload> {
  throw new Error(
    'verifyWithJwks is not yet implemented. Use verify() with explicit secret instead.'
  )
}
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond `jose` which is already installed in package.json)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (Bun v1.3.10) |
| Config file | packages/photon/package.json scripts.test |
| Quick run command | `bun test packages/photon/tests/native/native-jwt.test.ts --timeout=10000` |
| Full photon suite | `bun test packages/photon --timeout=10000` |
| Full suite | `bun test --timeout=10000` |

### Phase Requirements — Test Map

| Behavior | Test Type | File | Status |
|----------|-----------|------|--------|
| sign() round-trip | unit | native-jwt.test.ts | ✅ 42 tests pass |
| verify() expiration | unit | native-jwt.test.ts | ✅ covered |
| jwt() Bearer middleware | integration | native-jwt.test.ts | ✅ covered |
| jwt() cookie middleware | integration | native-jwt.test.ts | ✅ covered |
| exports.test.ts TypeScript clean | typecheck | exports.test.ts | ❌ 2 TS errors |
| trie-router type-only | unit | exports.test.ts | ❌ 1 test fail |
| verifyWithJwks stub | unit | exports.test.ts | ✅ exists as stub |

### Sampling Rate
- **Per task commit:** `bun test packages/photon --timeout=10000`
- **Phase gate:** `bun run typecheck && bun test --timeout=10000`

### Wave 0 Gaps
None — test infrastructure exists. Only code fixes needed.

---

## Open Questions

1. **trie-router type export name**
   - What we know: `hono/router/trie-router` exports a `TrieRouter` class
   - What's unclear: Whether downstream code imports the type by name `TrieRouter`
   - Recommendation: Run `grep -rn "TrieRouter" packages/` before converting to confirm no type-import regressions

2. **verifyWithJwks implementation scope**
   - What we know: Zero production usage in codebase, stub already exists
   - What's unclear: Whether Phase 4B-3+ will need JWKS for OIDC integrations
   - Recommendation: Keep as documented stub for now; implement in a dedicated OIDC phase if needed

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `packages/photon/src/jwt.ts` — verified current implementation
- `packages/photon/tests/native/native-jwt.test.ts` — verified 42 tests, all passing
- `packages/photon/tests/exports.test.ts` — verified 2 TS errors, 1 test fail
- `packages/photon/package.json` — verified `jose@^6.2.2` installed
- `git log --oneline` — verified commit `6c2c99ae` completed core implementation
- `bun tsc --noEmit` output — verified exact TS errors
- `bun test packages/photon` — verified 283/284 pass

### Secondary (MEDIUM confidence)
- `npm view jose version` → `6.2.2` — current published version confirmed

---

## Metadata

**Confidence breakdown:**
- Implementation status: HIGH — verified by direct code inspection and test execution
- Remaining issues: HIGH — verified by running typecheck and tests
- Fix approach: HIGH — patterns established in Phase 4B-1 (reg-exp-router conversion)
- verifyWithJwks strategy: MEDIUM — zero usage confirmed, but future needs unclear

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable domain; jose API changes rarely)

---

## Key Finding Summary

Phase 4B-2 is **95% complete**. The hard work (jwt.ts rewrite, 42 comprehensive tests) is done. What remains is cleanup:

1. Fix 2 TypeScript errors in `tests/exports.test.ts` (remove unused import, add type annotations) — ~5 min
2. Fix 1 test failure by converting `trie-router.ts` to type-only stub — ~10 min
3. Decide on `verifyWithJwks` strategy (recommend: update JSDoc to `@deprecated`) — ~5 min
4. Run all verification gates to confirm 93/100 health score maintained
