---
phase: 04B-2
title: Phase 4B-2 - JWT Native Implementation
status: planning
created: 2026-03-26
baseline: Phase 4B-1 complete (93/100 health, 99.6% pass rate)
---

# Phase 4B-2: JWT Native Implementation

**Timeline:** ~1 week (medium complexity, parallel executable if needed)
**Scope:** Replace `hono/jwt` with native JWT implementation using `jose` library
**Complexity:** MEDIUM (cryptographic operations, API compatibility critical)
**Risk Level:** MEDIUM (JWT is security-critical)

---

## Objective

Replace the Hono JWT middleware with a native implementation using the `jose` library, maintaining 100% API compatibility with the current Hono version.

### Current State

- **File:** packages/photon/src/jwt.ts
- **Current Implementation:** Re-exports via require() from `hono/jwt`
- **Exported Functions:** jwt(), sign(), verify(), decode(), verifyWithJwks()
- **Exported Types:** JwtPayload, JwtHeader, JwtOptions, JwtFunction
- **Dependencies:** hono/jwt (to be replaced with jose)
- **Test Coverage:** Existing tests in packages/photon/tests/exports.test.ts + jwt-related tests

### Success Criteria

- ✅ All 5 JWT functions implemented natively
- ✅ 100% API compatibility with Hono JWT
- ✅ `jose@^5.0.0` integrated
- ✅ Existing JWT tests still pass
- ✅ New native JWT tests added (sign/verify round trip, expiration, algorithms)
- ✅ TypeCheck: 0 errors (83/83 packages)
- ✅ Test pass rate: ≥99.6% (no regressions)
- ✅ Health score: ≥93/100 maintained
- ✅ Backwards compatibility: 100%

---

## Implementation Plan

### Task 1: Analyze Current JWT Usage

**Subtasks:**
1. Review existing JWT tests in photon test suite
2. Check if `verifyWithJwks` is actually used (may skip if unused)
3. Identify all JWT function signatures and behavior expectations
4. Check package.json for jose dependency (install if needed)

**Expected Output:**
- Documented JWT API surface
- Test coverage baseline
- Decision on verifyWithJwks (implement vs deprecate)

---

### Task 2: Implement Native JWT Functions

**File:** packages/photon/src/jwt.ts

**Functions to Implement:**

#### 1. **sign(payload, secret, alg)**
- Uses `jose.SignJWT` for signing
- Default algorithm: HS256
- Input: payload object, secret string/Buffer, optional algorithm
- Output: JWT string
- Error handling: Convert jose errors to consistent error messages

#### 2. **verify(token, secret, alg)**
- Uses `jose.jwtVerify` for verification
- Validates signature and expiration
- Input: JWT string, secret string/Buffer, optional algorithm
- Output: Verified payload object
- Error handling: Clear error messages for invalid/expired tokens

#### 3. **decode(token)**
- Uses `jose.decodeProtectedHeader` + custom payload parsing
- No verification, just decoding
- Input: JWT string
- Output: { header, payload } object
- Error handling: Handle malformed tokens gracefully

#### 4. **jwt(options)**
- Middleware factory function
- Extracts token from Authorization header or cookie
- Verifies token and stores payload in context
- Input: JwtOptions (secret, cookie?, alg?)
- Output: GravitoMiddleware
- Error handling: Return 401 Unauthorized on invalid token

#### 5. **verifyWithJwks(token, options)** (Optional)
- Decision: Implement if heavily used, otherwise deprecate
- Uses `jose.importJWKS` + `jose.jwtVerify`
- Input: JWT string, { jwksUri: string }
- Output: Verified payload
- Complexity: Medium (JWKS fetching + caching)

---

### Task 3: Create Comprehensive Tests

**File:** packages/photon/tests/native/native-jwt.test.ts

**Test Coverage:**

1. **sign() function**
   - Sign with HS256 (default)
   - Sign with HS512
   - Sign with custom payload
   - Verify signed token is valid JWT format

2. **verify() function**
   - Verify valid token returns payload
   - Verify invalid token throws error
   - Verify expired token throws error
   - Verify wrong secret throws error
   - Verify algorithm mismatch throws error

3. **decode() function**
   - Decode valid token returns header + payload
   - Decode without verification (no error on expired)
   - Malformed token throws error
   - Missing parts throws error

4. **jwt() middleware**
   - Middleware extracts token from Authorization header
   - Middleware validates token and stores in context
   - Middleware returns 401 on invalid token
   - Middleware works with cookie option
   - Middleware passes through with valid token

5. **Round-trip tests**
   - sign → verify → payload matches
   - sign with exp → verify checks expiration
   - Different payloads produce different signatures

**Expected:** 12-15 tests, all passing

---

### Task 4: Verify Backwards Compatibility

**Checks:**

1. ✅ All existing imports still work
2. ✅ All existing tests pass without modification
3. ✅ Types still match expectations (JwtPayload, JwtOptions, etc.)
4. ✅ Function signatures identical to current
5. ✅ Error messages compatible (or improved)
6. ✅ No breaking changes in behavior

---

## Implementation Strategy

### Phase: Single-Task Execution

Since JWT implementation is self-contained and independent of other Phase 4B tasks, execute as single comprehensive task:

**Wave 1: Native JWT Implementation**
- Implement all 5 functions in jwt.ts
- Create native-jwt.test.ts with 12-15 tests
- Verify all gates pass
- Create commit(s)

**Estimated Duration:** 4-6 hours (implementation + testing)

---

## Verification Gates

### Gate 1: TypeScript Type Checking
```bash
bun run typecheck
```
**Expected:** 0 errors (83/83 packages)

### Gate 2: JWT-Specific Tests
```bash
bun test packages/photon/tests/native/native-jwt.test.ts
```
**Expected:** 12-15 pass, 0 fail

### Gate 3: All Photon Tests
```bash
bun test packages/photon --timeout=10000
```
**Expected:** ≥240 pass (including new JWT tests), no regressions

### Gate 4: Full Test Suite
```bash
bun test --timeout=10000
```
**Expected:** ≥11,703 pass, ≤44 fail (99.6%+), health ≥93/100

---

## Risk Mitigation

| Risk | Mitigation | Priority |
|------|-----------|----------|
| JWT signature invalid | Comprehensive sign/verify tests | HIGH |
| Token expiration not working | Test exp claim handling | HIGH |
| Secret encoding issues | Test string/Buffer/CryptoKey handling | HIGH |
| Backwards compat broken | Run all existing JWT tests unchanged | HIGH |
| Algorithm mismatch | Test all supported algorithms | MEDIUM |
| JWKS unreliable | Cache strategy + timeout handling | LOW (if implemented) |
| Performance regression | Benchmark sign/verify operations | MEDIUM |

---

## Rollback Strategy

- **Single Commit:** If implementation fails, simple `git revert` restores prior state
- **Zero Dependencies:** Only adds `jose` (standard, well-maintained library)
- **No Circular Deps:** jwt.ts doesn't break any other modules

---

## Next Steps After Phase 4B-2

1. **Phase 4B-3:** External Package Type Cleanup (mass, beam, zenith)
2. **Phase 4B-4:** Platform Adapter Decision (cloudflare, deno, vercel)
3. **Phase 4B-5:** RPC Client Strategy (hono/client as type-only peerDep)
4. **Phase 4B-6:** OpenAPI Scoping (@hono/zod-openapi path-scoped)

---

## Dependencies

### Current
- hono@^4.12.0 (to be removed after phase)

### To Add
- jose@^5.0.0 (if not already present)

**Check:**
```bash
cd packages/photon && jq '.dependencies.jose' package.json
```

If missing, add via:
```bash
cd packages/photon && bun add jose
```

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Functions implemented | 5/5 | TBD |
| Tests passing | 12-15/15 | TBD |
| TypeErrors | 0 | TBD |
| Backwards compat | 100% | TBD |
| Health score | ≥93/100 | TBD |
| Pass rate | ≥99.6% | TBD |

---

**Status:** ⏳ Ready for execution
**Owner:** To be assigned
**Estimated Start:** Immediately after Phase 4B-1 completion gate confirmation
