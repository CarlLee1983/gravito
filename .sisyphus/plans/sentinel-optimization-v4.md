# @gravito/sentinel v4.0.0 Optimization Implementation

## Context

### Original Request
Implement the complete 4-phase optimization plan documented in `packages/sentinel/docs/OPTIMIZATION_PLAN.md` to upgrade @gravito/sentinel from v3.0.1 to v4.0.0.

### Planning Summary
**Key Decisions**:
- **Major version bump**: v3.0.1 → v4.0.0 (breaking changes acceptable)
- **TDD approach**: Write tests FIRST for all new features, achieve 80%+ coverage
- **Test framework**: bun test (already configured, 109 existing tests)
- **Type safety**: Eliminate all `any` types, use proper @gravito/core types

**Scope Boundaries**:
- **IN SCOPE**:
  - All 4 phases from OPTIMIZATION_PLAN.md
  - Code quality fixes (console.log removal, type safety)
  - Security enhancements (token hashing, blacklist)
  - Performance optimizations (caching mechanisms)
  - New features (Remember Me, JWT Refresh, Rate Limiting)
  - Comprehensive testing (80%+ coverage target)
  - JSDoc documentation enhancements

- **OUT OF SCOPE**:
  - OAuth2/Social login providers (mentioned but not detailed in plan)
  - Multi-factor authentication (MFA) - mentioned as future work
  - Database-backed token blacklist (only in-memory implementation)
  - Breaking changes to public API beyond CallbackUserProvider

**Codebase Patterns**:
- Uses bun test with `describe`/`it`/`expect` syntax
- Mocks context with `as unknown as Context` pattern
- Follows Gravito Orbit pattern (install via PlanetCore)
- Module augmentation for type-safe context access

---

## Work Objectives

### Core Objective
Transform @gravito/sentinel from a functional but loosely-typed authentication library into a production-grade, type-safe, high-performance auth system with comprehensive test coverage and security best practices.

### Concrete Deliverables
1. **Code Quality**:
   - Zero console.log statements in production code
   - Zero `any` types in public APIs
   - Proper TypeScript types throughout

2. **New Features**:
   - `src/providers/CachedUserProvider.ts` - User query caching
   - `src/guards/JwtRefreshGuard.ts` - JWT with refresh tokens
   - `src/TokenBlacklist.ts` - Token revocation support
   - `src/middleware/throttleAuth.ts` - Rate limiting for auth endpoints
   - Remember Me functionality in SessionGuard

3. **Enhanced Security**:
   - Token hashing in TokenGuard (sha256/sha512)
   - Token blacklist mechanism
   - Rate limiting middleware

4. **Test Suite**:
   - Minimum 80% overall coverage
   - Individual modules at 90%+ coverage
   - New test files for all new features

5. **Documentation**:
   - Comprehensive JSDoc for all public APIs
   - Updated README with v4 migration guide

### Definition of Done
- [ ] `bun test --coverage` shows ≥80% overall coverage
- [ ] `bun run typecheck` passes with zero errors
- [ ] All console.log and `any` types removed from src/
- [ ] All new features have passing tests
- [ ] Version bumped to 4.0.0 in package.json
- [ ] CHANGELOG.md updated with breaking changes

### Must Have
- Type safety: All middleware uses `GravitoContext` and `GravitoNext`
- TDD workflow: Tests written BEFORE implementation for all new features
- Backward compatibility: Existing SessionGuard/JwtGuard/TokenGuard behavior preserved (unless explicitly documented as breaking change)

### Must NOT Have (Guardrails)
- **NO external database dependencies** (caching must be in-memory or configurable)
- **NO breaking changes to core Guard interface** (only implementation changes)
- **NO AI-generated boilerplate comments** (JSDoc must be meaningful and specific)
- **NO incomplete test coverage** (do not mark feature complete if tests <80%)
- **NO console.log or debugging statements** in final code
- **NO hardcoded secrets or mock data** in production paths

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (bun test configured)
- **User wants tests**: TDD (write tests first)
- **Framework**: bun test
- **Coverage target**: 80%+ overall, 90%+ for individual modules

### TDD Workflow

Each TODO follows **RED-GREEN-REFACTOR**:

1. **RED**: Write failing test first
   - Test file: `tests/{feature}.test.ts`
   - Command: `bun test tests/{feature}.test.ts`
   - Expected: FAIL (test exists, implementation doesn't)

2. **GREEN**: Implement minimum code to pass
   - Command: `bun test tests/{feature}.test.ts`
   - Expected: PASS

3. **REFACTOR**: Clean up while keeping green
   - Command: `bun test` (all tests)
   - Expected: PASS (all tests still green)

### Coverage Verification

After each phase:
```bash
bun test --coverage
# Expected: Coverage increases toward 80% target
```

Final verification:
```bash
bun test --coverage --coverage-threshold=80
# Expected: Exit code 0 (coverage meets threshold)
```

---

## Task Flow

```
Phase 1 (Quality & Security)
├─ 1. Remove console.log (quick fix)
├─ 2. Fix TypeScript types (quick fix)  
├─ 3. Implement token hashing (TDD: tests → impl)
└─ 4. Fix SessionGuard type casts (quick fix)

Phase 2 (Performance)
├─ 5. AuthManager Guard caching (TDD: tests → impl)
└─ 6. CachedUserProvider (TDD: tests → impl)

Phase 3 (Features) - All TDD
├─ 7. SessionGuard Remember Me (TDD: tests → impl)
├─ 8. JwtRefreshGuard (TDD: tests → impl)
├─ 9. TokenBlacklist (TDD: tests → impl)
└─ 10. throttleAuth middleware (TDD: tests → impl)

Phase 4 (Tests & Docs)
├─ 11. Increase SessionGuard test coverage (84% → 95%)
├─ 12. Increase TokenGuard test coverage (86% → 95%)
├─ 13. Add AuthManager tests (0% → 90%)
├─ 14. Add Gate tests (0% → 90%)
├─ 15. Enhance JSDoc (all public APIs)
└─ 16. Update package.json, CHANGELOG, README
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 2, 4 | Independent quick fixes, no dependencies |
| B | 7, 8, 9, 10 | All new features, can be developed independently after Phase 1-2 complete |
| C | 11, 12, 13, 14 | Test coverage tasks, can run in parallel |

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 2 | Needs proper types before implementing token hashing |
| 5, 6 | 1, 2, 4 | Need clean codebase before optimization |
| 7-10 | 5, 6 | Features depend on stable base |
| 11-14 | 7-10 | Coverage tests need features implemented |
| 15, 16 | 11-14 | Documentation needs all code finalized |

---

## TODOs

### Phase 1: Code Quality & Security

- [ ] **1. Remove console.log from CallbackUserProvider**

  **What to do**:
  - Remove `console.log` statements from lines 68 and 83
  - Remove fallback to `global.MOCK_USERS` (lines 70-75)
  - If `retrieveByCredentialsCallback` is not provided, return `null` immediately
  - Remove console.log from `validateCredentials` (line 83), keep early return pattern

  **Must NOT do**:
  - Do not change the callback signatures or constructor parameters
  - Do not add alternative logging mechanisms (this is production code)
  - Do not keep any reference to `global.MOCK_USERS`

  **Parallelizable**: YES (with 2, 4)

  **References**:
  - `packages/sentinel/src/providers/CallbackUserProvider.ts:63-77` - Current implementation with console.log
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:135-153` - Specification for removal

  **Acceptance Criteria**:
  - [ ] Manual code verification:
    ```bash
    grep -n "console.log" packages/sentinel/src/providers/CallbackUserProvider.ts
    # Expected output: (empty - no matches)
    ```
  - [ ] Manual code verification:
    ```bash
    grep -n "MOCK_USERS" packages/sentinel/src/providers/CallbackUserProvider.ts
    # Expected output: (empty - no matches)
    ```
  - [ ] Existing tests still pass:
    ```bash
    bun test tests/provider.test.ts
    # Expected: All tests PASS
    ```

  **Commit**: YES
  - Message: `refactor(sentinel): remove console.log and global mock from CallbackUserProvider`
  - Files: `packages/sentinel/src/providers/CallbackUserProvider.ts`
  - Pre-commit: `bun test tests/provider.test.ts`

---

- [ ] **2. Fix TypeScript types in middleware**

  **What to do**:
  - Add proper imports to `src/middleware/auth.ts`:
    ```typescript
    import type { GravitoContext, GravitoNext } from '@gravito/core'
    ```
  - Replace `(c: any, next: any)` with `(c: GravitoContext, next: GravitoNext)` on line 10
  - Repeat for `src/middleware/can.ts`:
    - Add same imports
    - Replace `(c: any, next: any)` with proper types
  - Add same imports and fix types in `src/middleware/guest.ts` if it exists

  **Must NOT do**:
  - Do not change the middleware logic or behavior
  - Do not add new features or validation
  - Do not modify the function signatures beyond type annotations

  **Parallelizable**: YES (with 1, 4)

  **References**:
  - `packages/sentinel/src/middleware/auth.ts:10` - Current `any` types
  - `packages/sentinel/src/middleware/can.ts` - Similar pattern
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:158-183` - Type fix specification
  - `packages/core/src/http/types.ts` - Source of GravitoContext and GravitoNext types

  **Acceptance Criteria**:
  - [ ] TypeScript verification:
    ```bash
    cd packages/sentinel && bun run typecheck
    # Expected: Zero errors related to middleware types
    ```
  - [ ] No `any` types in middleware:
    ```bash
    grep -n ": any" packages/sentinel/src/middleware/*.ts
    # Expected: (empty - no matches)
    ```
  - [ ] Existing tests still pass:
    ```bash
    bun test tests/
    # Expected: All tests PASS
    ```

  **Commit**: YES
  - Message: `refactor(sentinel): replace any types with GravitoContext/GravitoNext in middleware`
  - Files: `packages/sentinel/src/middleware/auth.ts`, `packages/sentinel/src/middleware/can.ts`, `packages/sentinel/src/middleware/guest.ts`
  - Pre-commit: `bun run typecheck && bun test`

---

- [ ] **3. Implement token hashing in TokenGuard (TDD)**

  **What to do**:
  - **RED**: Write test first in `tests/token-guard-hashing.test.ts`:
    - Test 1: Token hashing disabled (default) - plain token comparison
    - Test 2: Token hashing enabled with sha256 - hashed token comparison
    - Test 3: Token hashing enabled with sha512 - hashed token comparison
    - Test 4: Invalid hashed token should fail authentication
  - **GREEN**: Implement in `src/guards/TokenGuard.ts`:
    - Add `hashAlgorithm: 'sha256' | 'sha512' = 'sha256'` to constructor
    - Implement `private async hashToken(token: string): Promise<string>` method using Web Crypto API
    - Modify `user()` method to hash incoming token if `this.hash === true`
  - **REFACTOR**: Clean up implementation, ensure no code duplication

  **Must NOT do**:
  - Do not use Node.js crypto (use Web Crypto API for Bun compatibility)
  - Do not change existing TokenGuard behavior when `hash = false`
  - Do not add bcrypt/argon2 (those are for passwords, not tokens)

  **Parallelizable**: NO (depends on 2 - needs proper types)

  **References**:
  - `packages/sentinel/src/guards/TokenGuard.ts` - Current implementation
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:185-219` - Token hashing specification
  - `packages/sentinel/tests/guards.test.ts:17-83` - Existing TokenGuard test patterns
  - Web Crypto API docs: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest

  **Acceptance Criteria**:
  
  **RED Phase**:
  - [ ] Test file created: `tests/token-guard-hashing.test.ts`
  - [ ] Tests cover: sha256 hashing, sha512 hashing, disabled hashing, invalid token rejection
  - [ ] `bun test tests/token-guard-hashing.test.ts` → FAIL (4 tests, all failing - implementation doesn't exist)

  **GREEN Phase**:
  - [ ] `hashToken` private method implemented using `crypto.subtle.digest`
  - [ ] `user()` method calls `hashToken` when `this.hash === true`
  - [ ] `bun test tests/token-guard-hashing.test.ts` → PASS (4 tests, all passing)

  **REFACTOR Phase**:
  - [ ] Code reviewed for duplication
  - [ ] `bun test tests/guards.test.ts` → PASS (existing tests still pass)
  - [ ] `bun test` → ALL PASS

  **Commit**: YES
  - Message: `feat(sentinel): implement token hashing in TokenGuard with sha256/sha512 support`
  - Files: `packages/sentinel/src/guards/TokenGuard.ts`, `packages/sentinel/tests/token-guard-hashing.test.ts`
  - Pre-commit: `bun test tests/guards.test.ts tests/token-guard-hashing.test.ts`

---

- [ ] **4. Fix SessionGuard type casts**

  **What to do**:
  - Review `src/guards/SessionGuard.ts` for unsafe type casts
  - Remove `as any` casts in `login()` method (lines around context setting)
  - Ensure `this.userInstance = user` is used instead of `this.ctx.set('auth', user)`
  - Remove any `as any` forcing on session or context objects
  - Use proper SessionContract interface type instead of `any`

  **Must NOT do**:
  - Do not change the SessionGuard behavior or logic
  - Do not modify the session storage mechanism
  - Do not break existing session-based authentication

  **Parallelizable**: YES (with 1, 2)

  **References**:
  - `packages/sentinel/src/guards/SessionGuard.ts` - Current implementation
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:221-238` - Type safety specification
  - `packages/sentinel/src/guards/SessionGuard.ts` (internal SessionContract interface) - Type definition to use

  **Acceptance Criteria**:
  - [ ] Manual code verification:
    ```bash
    grep -n " as any" packages/sentinel/src/guards/SessionGuard.ts
    # Expected: (empty - no unsafe casts)
    ```
  - [ ] TypeScript verification:
    ```bash
    cd packages/sentinel && bun run typecheck
    # Expected: Zero errors in SessionGuard.ts
    ```
  - [ ] Existing tests still pass:
    ```bash
    bun test tests/guards.test.ts
    # Expected: All session guard tests PASS
    ```

  **Commit**: YES
  - Message: `refactor(sentinel): remove unsafe type casts from SessionGuard`
  - Files: `packages/sentinel/src/guards/SessionGuard.ts`
  - Pre-commit: `bun test tests/guards.test.ts`

---

### Phase 2: Performance Optimization

- [ ] **5. Improve AuthManager guard caching (TDD)**

  **What to do**:
  - **RED**: Write test first in `tests/auth-manager-caching.test.ts`:
    - Test 1: Default guard is resolved and cached on first access
    - Test 2: Multiple calls to `guard()` with same name return cached instance
    - Test 3: Different guard names create separate instances
    - Test 4: Guard cache is request-scoped (not shared across requests)
  - **GREEN**: Implement in `src/AuthManager.ts`:
    - Add `private defaultGuardResolved = false` flag
    - Modify `guard()` method to track default guard resolution
    - Ensure guard caching works correctly per request
  - **REFACTOR**: Optimize cache lookup, add comments

  **Must NOT do**:
  - Do not create global/shared caches across requests (security risk)
  - Do not break existing guard resolution behavior
  - Do not cache guards indefinitely (memory leak)

  **Parallelizable**: NO (depends on 1, 2, 4 - needs clean codebase)

  **References**:
  - `packages/sentinel/src/AuthManager.ts` - Current implementation
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:245-267` - Guard caching specification

  **Acceptance Criteria**:
  
  **RED Phase**:
  - [ ] Test file created: `tests/auth-manager-caching.test.ts`
  - [ ] Tests cover: default guard caching, multi-call caching, separate instances, request-scoped
  - [ ] `bun test tests/auth-manager-caching.test.ts` → FAIL (4 tests failing)

  **GREEN Phase**:
  - [ ] `defaultGuardResolved` flag added to AuthManager
  - [ ] `guard()` method updated to set flag on first default guard access
  - [ ] `bun test tests/auth-manager-caching.test.ts` → PASS (4 tests passing)

  **REFACTOR Phase**:
  - [ ] Code optimized and commented
  - [ ] `bun test` → ALL PASS

  **Commit**: YES
  - Message: `perf(sentinel): optimize default guard resolution and caching in AuthManager`
  - Files: `packages/sentinel/src/AuthManager.ts`, `packages/sentinel/tests/auth-manager-caching.test.ts`
  - Pre-commit: `bun test`

---

- [ ] **6. Create CachedUserProvider wrapper (TDD)**

  **What to do**:
  - **RED**: Write test first in `tests/cached-user-provider.test.ts`:
    - Test 1: First `retrieveById` call hits underlying provider
    - Test 2: Second `retrieveById` call returns cached result (no provider call)
    - Test 3: Cache expires after TTL, provider is called again
    - Test 4: `invalidate()` clears specific user from cache
    - Test 5: LRU eviction when cache reaches maxSize
  - **GREEN**: Create `src/providers/CachedUserProvider.ts`:
    - Implement in-memory cache with Map
    - Add TTL support (default 60 seconds)
    - Add max size support (default 100 entries)
    - Implement LRU eviction
    - Wrap all UserProvider methods
    - Add `invalidate(identifier?)` method
  - **REFACTOR**: Optimize cache logic, add JSDoc

  **Must NOT do**:
  - Do not use external caching libraries
  - Do not persist cache to disk/database
  - Do not cache passwords or sensitive credentials

  **Parallelizable**: NO (depends on 1, 2, 4)

  **References**:
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:269-336` - CachedUserProvider specification
  - `packages/sentinel/src/contracts/UserProvider.ts` - Interface to implement
  - `packages/sentinel/src/providers/CallbackUserProvider.ts` - Example provider implementation

  **Acceptance Criteria**:
  
  **RED Phase**:
  - [ ] Test file created: `tests/cached-user-provider.test.ts`
  - [ ] Tests cover: cache hit/miss, TTL expiry, invalidation, LRU eviction
  - [ ] `bun test tests/cached-user-provider.test.ts` → FAIL (5 tests failing)

  **GREEN Phase**:
  - [ ] File created: `src/providers/CachedUserProvider.ts`
  - [ ] Implements `UserProvider<T>` interface
  - [ ] Cache with TTL and LRU eviction working
  - [ ] `bun test tests/cached-user-provider.test.ts` → PASS (5 tests passing)

  **REFACTOR Phase**:
  - [ ] JSDoc added to all public methods
  - [ ] Edge cases handled (empty cache, concurrent access)
  - [ ] `bun test` → ALL PASS

  **Commit**: YES
  - Message: `feat(sentinel): add CachedUserProvider with TTL and LRU eviction`
  - Files: `packages/sentinel/src/providers/CachedUserProvider.ts`, `packages/sentinel/tests/cached-user-provider.test.ts`
  - Pre-commit: `bun test`

---

### Phase 3: Feature Enhancements

- [ ] **7. Implement Remember Me in SessionGuard (TDD)**

  **What to do**:
  - **RED**: Write test first in `tests/session-guard-remember.test.ts`:
    - Test 1: `login(user, true)` sets remember cookie
    - Test 2: `user()` retrieves user from remember cookie when session empty
    - Test 3: `logout()` invalidates remember token
    - Test 4: Remember token regenerated on each login
    - Test 5: Invalid/expired remember token fails gracefully
  - **GREEN**: Modify `src/guards/SessionGuard.ts`:
    - Add `rememberCookieName` and `rememberDuration` properties
    - Implement `generateRememberToken()` method
    - Modify `login()` to handle `remember` parameter
    - Modify `user()` to check remember cookie as fallback
    - Implement `setRememberCookie()` and `retrieveFromRememberCookie()` methods
  - **REFACTOR**: Clean up cookie handling logic

  **Must NOT do**:
  - Do not store passwords in remember cookies
  - Do not make remember token predictable (use crypto.randomUUID())
  - Do not skip token regeneration on login (security)

  **Parallelizable**: YES (with 8, 9, 10 - all independent features)

  **References**:
  - `packages/sentinel/src/guards/SessionGuard.ts` - Current implementation
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:344-403` - Remember Me specification
  - `packages/sentinel/src/contracts/Authenticatable.ts` - Check for `setRememberToken` method
  - Cookie parsing: Check @gravito/photon for cookie utilities

  **Acceptance Criteria**:
  
  **RED Phase**:
  - [ ] Test file created: `tests/session-guard-remember.test.ts`
  - [ ] Tests cover: cookie setting, cookie retrieval, logout invalidation, regeneration, expiry
  - [ ] `bun test tests/session-guard-remember.test.ts` → FAIL (5 tests failing)

  **GREEN Phase**:
  - [ ] `login()` method handles `remember` parameter
  - [ ] `user()` method checks remember cookie as fallback
  - [ ] Remember token generation and cookie handling implemented
  - [ ] `bun test tests/session-guard-remember.test.ts` → PASS (5 tests passing)

  **REFACTOR Phase**:
  - [ ] Cookie handling logic cleaned up
  - [ ] `bun test tests/guards.test.ts` → PASS (existing tests still pass)
  - [ ] `bun test` → ALL PASS

  **Commit**: YES
  - Message: `feat(sentinel): implement Remember Me functionality in SessionGuard`
  - Files: `packages/sentinel/src/guards/SessionGuard.ts`, `packages/sentinel/tests/session-guard-remember.test.ts`
  - Pre-commit: `bun test tests/guards.test.ts tests/session-guard-remember.test.ts`

---

- [ ] **8. Create JwtRefreshGuard (TDD)**

  **What to do**:
  - **RED**: Write test first in `tests/jwt-refresh-guard.test.ts`:
    - Test 1: `createTokenPair()` returns access and refresh tokens
    - Test 2: Access token has short TTL (15 min), refresh token long TTL (7 days)
    - Test 3: `refreshTokens()` accepts valid refresh token and returns new pair
    - Test 4: `refreshTokens()` rejects expired refresh token
    - Test 5: `refreshTokens()` rejects access token (type mismatch)
    - Test 6: Refresh token has different secret (if configured)
  - **GREEN**: Create `src/guards/JwtRefreshGuard.ts`:
    - Define `JwtTokenPair` and `JwtRefreshConfig` interfaces
    - Implement `createTokenPair(user)` method
    - Implement `refreshTokens(refreshToken)` method
    - Add `type: 'access' | 'refresh'` to JWT payloads
    - Support separate refresh secret
  - **REFACTOR**: Extract common JWT logic, add JSDoc

  **Must NOT do**:
  - Do not store refresh tokens in JWT (they should be returned to client)
  - Do not use same expiry for access and refresh tokens
  - Do not skip type validation (prevent using access token as refresh token)

  **Parallelizable**: YES (with 7, 9, 10)

  **References**:
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:408-502` - JwtRefreshGuard specification
  - `packages/sentinel/src/guards/JwtGuard.ts` - Existing JWT implementation pattern
  - `packages/photon/src/jwt` - JWT sign/verify functions (import from @gravito/photon/jwt)
  - JWT Best Practices: https://datatracker.ietf.org/doc/html/rfc8725

  **Acceptance Criteria**:
  
  **RED Phase**:
  - [ ] Test file created: `tests/jwt-refresh-guard.test.ts`
  - [ ] Tests cover: token pair creation, TTL validation, refresh flow, rejection cases
  - [ ] `bun test tests/jwt-refresh-guard.test.ts` → FAIL (6 tests failing)

  **GREEN Phase**:
  - [ ] File created: `src/guards/JwtRefreshGuard.ts`
  - [ ] `createTokenPair()` and `refreshTokens()` implemented
  - [ ] Type validation prevents token type confusion
  - [ ] `bun test tests/jwt-refresh-guard.test.ts` → PASS (6 tests passing)

  **REFACTOR Phase**:
  - [ ] JSDoc added with usage examples
  - [ ] Common JWT logic extracted
  - [ ] `bun test` → ALL PASS

  **Commit**: YES
  - Message: `feat(sentinel): add JwtRefreshGuard with access/refresh token pair support`
  - Files: `packages/sentinel/src/guards/JwtRefreshGuard.ts`, `packages/sentinel/tests/jwt-refresh-guard.test.ts`
  - Pre-commit: `bun test`

---

- [ ] **9. Create TokenBlacklist system (TDD)**

  **What to do**:
  - **RED**: Write test first in `tests/token-blacklist.test.ts`:
    - Test 1: `add(jti, expiresAt)` adds token to blacklist
    - Test 2: `has(jti)` detects blacklisted token
    - Test 3: `has(jti)` returns false for expired blacklist entry
    - Test 4: `prune()` removes expired entries
    - Test 5: InMemoryTokenBlacklist handles concurrent operations
  - **GREEN**: Create `src/TokenBlacklist.ts`:
    - Define `TokenBlacklist` interface
    - Implement `InMemoryTokenBlacklist` class with Map storage
    - Implement `add()`, `has()`, `prune()` methods
    - Auto-cleanup expired entries in `has()` checks
  - **REFACTOR**: Optimize prune logic, add JSDoc

  **Must NOT do**:
  - Do not implement database-backed blacklist (out of scope)
  - Do not blacklist forever (respect expiry times)
  - Do not add complex distributed locking (in-memory only)

  **Parallelizable**: YES (with 7, 8, 10)

  **References**:
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:507-559` - TokenBlacklist specification
  - JWT best practices: jti (JWT ID) for revocation

  **Acceptance Criteria**:
  
  **RED Phase**:
  - [ ] Test file created: `tests/token-blacklist.test.ts`
  - [ ] Tests cover: add, has, expiry, prune, concurrent access
  - [ ] `bun test tests/token-blacklist.test.ts` → FAIL (5 tests failing)

  **GREEN Phase**:
  - [ ] File created: `src/TokenBlacklist.ts`
  - [ ] `TokenBlacklist` interface defined
  - [ ] `InMemoryTokenBlacklist` implemented
  - [ ] `bun test tests/token-blacklist.test.ts` → PASS (5 tests passing)

  **REFACTOR Phase**:
  - [ ] JSDoc added with usage examples
  - [ ] Prune logic optimized
  - [ ] `bun test` → ALL PASS

  **Commit**: YES
  - Message: `feat(sentinel): add TokenBlacklist interface and InMemoryTokenBlacklist implementation`
  - Files: `packages/sentinel/src/TokenBlacklist.ts`, `packages/sentinel/tests/token-blacklist.test.ts`
  - Pre-commit: `bun test`

---

- [ ] **10. Create throttleAuth middleware (TDD)**

  **What to do**:
  - **RED**: Write test first in `tests/throttle-auth.test.ts`:
    - Test 1: Allows requests under maxAttempts limit
    - Test 2: Blocks requests after maxAttempts failures
    - Test 3: Returns 429 status with Retry-After header
    - Test 4: Resets counter after decayMinutes
    - Test 5: Custom keyGenerator works correctly
    - Test 6: Only counts failed auth attempts (401 responses)
  - **GREEN**: Create `src/middleware/throttleAuth.ts`:
    - Define `AuthThrottleOptions` interface
    - Implement rate limiting with in-memory Map
    - Track attempts by key (default: IP address from x-forwarded-for)
    - Only increment on 401 responses
    - Return 429 with Retry-After header when throttled
  - **REFACTOR**: Clean up throttle logic, add JSDoc

  **Must NOT do**:
  - Do not use external rate limiting libraries
  - Do not throttle successful requests (only failed auth)
  - Do not store throttle data permanently

  **Parallelizable**: YES (with 7, 8, 9)

  **References**:
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:564-621` - throttleAuth specification
  - `packages/sentinel/src/middleware/auth.ts` - Middleware pattern to follow
  - OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-and-error-messages

  **Acceptance Criteria**:
  
  **RED Phase**:
  - [ ] Test file created: `tests/throttle-auth.test.ts`
  - [ ] Tests cover: under limit, over limit, 429 response, reset, custom key, 401 counting
  - [ ] `bun test tests/throttle-auth.test.ts` → FAIL (6 tests failing)

  **GREEN Phase**:
  - [ ] File created: `src/middleware/throttleAuth.ts`
  - [ ] Rate limiting logic implemented
  - [ ] 429 status with Retry-After header working
  - [ ] `bun test tests/throttle-auth.test.ts` → PASS (6 tests passing)

  **REFACTOR Phase**:
  - [ ] JSDoc added with usage examples
  - [ ] Throttle logic optimized
  - [ ] `bun test` → ALL PASS

  **Commit**: YES
  - Message: `feat(sentinel): add throttleAuth middleware for brute-force protection`
  - Files: `packages/sentinel/src/middleware/throttleAuth.ts`, `packages/sentinel/tests/throttle-auth.test.ts`
  - Pre-commit: `bun test`

---

### Phase 4: Tests & Documentation

- [ ] **11. Increase SessionGuard test coverage to 95%+**

  **What to do**:
  - Run coverage report: `bun test --coverage tests/guards.test.ts`
  - Identify untested code paths in SessionGuard
  - Write additional tests in `tests/session-guard-additional.test.ts`:
    - Session regeneration on login
    - Logout behavior (clearing session and userInstance)
    - Edge cases: missing session, invalid session data
    - Multiple guard instances don't share state
  - Aim for 95%+ line coverage for SessionGuard.ts

  **Must NOT do**:
  - Do not write tests just to hit coverage numbers (test meaningful scenarios)
  - Do not skip edge cases (null sessions, regenerate errors)
  - Do not modify SessionGuard code to make tests pass (tests should verify existing behavior)

  **Parallelizable**: YES (with 12, 13, 14)

  **References**:
  - `packages/sentinel/src/guards/SessionGuard.ts` - Code to test
  - `packages/sentinel/tests/guards.test.ts` - Existing test patterns
  - Current coverage: 84.27% (from OPTIMIZATION_PLAN.md)

  **Acceptance Criteria**:
  - [ ] Coverage check before:
    ```bash
    bun test --coverage tests/guards.test.ts 2>&1 | grep SessionGuard
    # Expected: ~84% coverage baseline
    ```
  - [ ] New test file created: `tests/session-guard-additional.test.ts`
  - [ ] Tests cover: regeneration, logout, edge cases, isolation
  - [ ] `bun test tests/session-guard-additional.test.ts` → PASS
  - [ ] Coverage check after:
    ```bash
    bun test --coverage 2>&1 | grep SessionGuard
    # Expected: ≥95% line coverage
    ```

  **Commit**: YES
  - Message: `test(sentinel): increase SessionGuard coverage to 95%+`
  - Files: `packages/sentinel/tests/session-guard-additional.test.ts`
  - Pre-commit: `bun test`

---

- [ ] **12. Increase TokenGuard test coverage to 95%+**

  **What to do**:
  - Run coverage report: `bun test --coverage tests/guards.test.ts`
  - Identify untested code paths in TokenGuard
  - Write additional tests in `tests/token-guard-additional.test.ts`:
    - Query token with `allowQueryToken=false` (should be rejected)
    - Missing Authorization header and missing query param
    - Malformed Bearer token (no space, wrong prefix)
    - Edge cases: empty token, whitespace-only token
    - Provider throws error during retrieveByCredentials
  - Aim for 95%+ line coverage for TokenGuard.ts

  **Must NOT do**:
  - Do not duplicate existing tests
  - Do not test third-party libraries (focus on TokenGuard logic)
  - Do not skip error paths

  **Parallelizable**: YES (with 11, 13, 14)

  **References**:
  - `packages/sentinel/src/guards/TokenGuard.ts` - Code to test
  - `packages/sentinel/tests/guards.test.ts:17-83` - Existing TokenGuard tests
  - Current coverage: 85.96% (from OPTIMIZATION_PLAN.md)

  **Acceptance Criteria**:
  - [ ] Coverage check before:
    ```bash
    bun test --coverage tests/guards.test.ts 2>&1 | grep TokenGuard
    # Expected: ~86% coverage baseline
    ```
  - [ ] New test file created: `tests/token-guard-additional.test.ts`
  - [ ] Tests cover: disabled query token, missing tokens, malformed tokens, errors
  - [ ] `bun test tests/token-guard-additional.test.ts` → PASS
  - [ ] Coverage check after:
    ```bash
    bun test --coverage 2>&1 | grep TokenGuard
    # Expected: ≥95% line coverage
    ```

  **Commit**: YES
  - Message: `test(sentinel): increase TokenGuard coverage to 95%+`
  - Files: `packages/sentinel/tests/token-guard-additional.test.ts`
  - Pre-commit: `bun test`

---

- [ ] **13. Add AuthManager tests (0% → 90%+)**

  **What to do**:
  - Create `tests/auth-manager.test.ts`:
    - Test 1: `guard()` with no name returns default guard
    - Test 2: `guard('jwt')` returns JWT guard
    - Test 3: Multiple calls to same guard return cached instance
    - Test 4: `shouldUse()` changes default guard temporarily
    - Test 5: `attempt()` with valid credentials logs in user
    - Test 6: `attempt()` with invalid credentials returns false
    - Test 7: `check()` returns true when authenticated
    - Test 8: `check()` returns false when not authenticated
    - Test 9: `user()` returns current user when authenticated
    - Test 10: `logout()` clears authentication
    - Test 11: Invalid guard name throws error
  - Aim for 90%+ line coverage for AuthManager.ts

  **Must NOT do**:
  - Do not test guard implementations (those have their own tests)
  - Do not mock the entire AuthManager (test the real class)
  - Do not skip configuration validation tests

  **Parallelizable**: YES (with 11, 12, 14)

  **References**:
  - `packages/sentinel/src/AuthManager.ts` - Code to test
  - `packages/sentinel/tests/guards.test.ts` - Mock patterns to reuse
  - No existing coverage (file not tested yet)

  **Acceptance Criteria**:
  - [ ] Test file created: `tests/auth-manager.test.ts`
  - [ ] Tests cover: guard resolution, caching, shouldUse, attempt, check, user, logout, errors
  - [ ] `bun test tests/auth-manager.test.ts` → PASS (11 tests passing)
  - [ ] Coverage check:
    ```bash
    bun test --coverage 2>&1 | grep AuthManager
    # Expected: ≥90% line coverage
    ```

  **Commit**: YES
  - Message: `test(sentinel): add comprehensive AuthManager test suite with 90%+ coverage`
  - Files: `packages/sentinel/tests/auth-manager.test.ts`
  - Pre-commit: `bun test`

---

- [ ] **14. Add Gate tests (0% → 90%+)**

  **What to do**:
  - Create `tests/gate.test.ts`:
    - Test 1: `define()` registers ability
    - Test 2: `allows()` returns true when ability passes
    - Test 3: `denies()` returns true when ability fails
    - Test 4: `forUser()` creates isolated gate for user
    - Test 5: `check()` throws AuthorizationException when denied
    - Test 6: Undefined ability defaults to deny
    - Test 7: Ability receives correct arguments
    - Test 8: Multiple abilities don't interfere
  - Aim for 90%+ line coverage for Gate.ts

  **Must NOT do**:
  - Do not test authorization logic (test the Gate mechanism)
  - Do not create real user/resource objects (use simple mocks)
  - Do not skip error cases

  **Parallelizable**: YES (with 11, 12, 13)

  **References**:
  - `packages/sentinel/src/Gate.ts` - Code to test
  - `packages/sentinel/src/middleware/can.ts` - Integration example
  - No existing coverage (file not tested yet)

  **Acceptance Criteria**:
  - [ ] Test file created: `tests/gate.test.ts`
  - [ ] Tests cover: define, allows, denies, forUser, check, undefined abilities, arguments, isolation
  - [ ] `bun test tests/gate.test.ts` → PASS (8 tests passing)
  - [ ] Coverage check:
    ```bash
    bun test --coverage 2>&1 | grep Gate.ts
    # Expected: ≥90% line coverage
    ```

  **Commit**: YES
  - Message: `test(sentinel): add comprehensive Gate test suite with 90%+ coverage`
  - Files: `packages/sentinel/tests/gate.test.ts`
  - Pre-commit: `bun test`

---

- [ ] **15. Enhance JSDoc for all public APIs**

  **What to do**:
  - Add comprehensive JSDoc to ALL exported classes and functions:
    - `src/AuthManager.ts` - Main class and all public methods
    - `src/Gate.ts` - All public methods
    - `src/guards/*.ts` - All guard classes
    - `src/middleware/*.ts` - All middleware functions
    - `src/providers/*.ts` - All provider classes
    - `src/HashManager.ts`, `src/PasswordBroker.ts`, `src/EmailVerification.ts`
  - Each JSDoc should include:
    - `@description` - Detailed explanation
    - `@param` - All parameters with types and purpose
    - `@returns` - Return value description
    - `@throws` - Exceptions that may be thrown
    - `@example` - At least one usage example
    - `@since` - Version when added (4.0.0 for new features)
    - `@public` - Visibility marker
  - Follow pattern from OPTIMIZATION_PLAN.md lines 686-717

  **Must NOT do**:
  - Do not add boilerplate JSDoc that just repeats the function name
  - Do not add JSDoc to internal/private methods (only public API)
  - Do not copy-paste examples without verifying they work

  **Parallelizable**: NO (depends on 11-14 - wait for all code to be finalized)

  **References**:
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:674-717` - JSDoc specification and example
  - `packages/sentinel/src/index.ts` - Public exports to document
  - TSDoc standard: https://tsdoc.org/

  **Acceptance Criteria**:
  - [ ] Manual verification - all exported classes have JSDoc:
    ```bash
    # Check that all exports have JSDoc (/** */)
    grep -B5 "^export class\|^export function\|^export interface" packages/sentinel/src/**/*.ts | grep -c "/\*\*"
    # Expected: Count matches number of exports
    ```
  - [ ] TypeScript check passes:
    ```bash
    cd packages/sentinel && bun run typecheck
    # Expected: Zero errors (JSDoc doesn't break types)
    ```
  - [ ] Example code in JSDoc is valid:
    ```bash
    # Extract examples and validate syntax
    # (manual review of examples)
    ```

  **Commit**: YES
  - Message: `docs(sentinel): add comprehensive JSDoc to all public APIs`
  - Files: `packages/sentinel/src/**/*.ts`
  - Pre-commit: `bun run typecheck`

---

- [ ] **16. Update package.json, CHANGELOG, README**

  **What to do**:
  - **package.json**:
    - Bump version: `3.0.1` → `4.0.0`
    - Update coverage threshold: `--coverage-threshold=15` → `--coverage-threshold=80`
  - **Create CHANGELOG.md** (new file):
    - Add section for v4.0.0 with release date
    - List all breaking changes
    - List all new features
    - List all bug fixes
    - List all performance improvements
  - **Update README.md**:
    - Add v4.0.0 migration guide section
    - Document new features (CachedUserProvider, JwtRefreshGuard, TokenBlacklist, throttleAuth)
    - Update examples to show proper TypeScript types
    - Add section on Remember Me usage
    - Add section on JWT refresh token flow

  **Must NOT do**:
  - Do not forget to document breaking changes (CallbackUserProvider behavior)
  - Do not skip migration examples (users need to know how to upgrade)
  - Do not make README too long (link to docs for details)

  **Parallelizable**: NO (depends on 15 - needs finalized API documentation)

  **References**:
  - `packages/sentinel/package.json` - Current version and scripts
  - `packages/sentinel/docs/OPTIMIZATION_PLAN.md:722-752` - Migration guide content
  - Semantic Versioning: https://semver.org/
  - Keep a Changelog: https://keepachangelog.com/

  **Acceptance Criteria**:
  - [ ] `package.json` version updated:
    ```bash
    grep '"version"' packages/sentinel/package.json
    # Expected: "version": "4.0.0"
    ```
  - [ ] `package.json` coverage threshold updated:
    ```bash
    grep 'coverage-threshold' packages/sentinel/package.json
    # Expected: --coverage-threshold=80
    ```
  - [ ] `CHANGELOG.md` created with v4.0.0 section
  - [ ] `README.md` includes:
    - Migration guide from v3 to v4
    - New features documentation
    - Updated examples
  - [ ] Final coverage check passes:
    ```bash
    cd packages/sentinel && bun test --coverage --coverage-threshold=80
    # Expected: Exit code 0 (coverage meets 80% threshold)
    ```

  **Commit**: YES
  - Message: `chore(sentinel): release v4.0.0 with breaking changes and new features`
  - Files: `packages/sentinel/package.json`, `packages/sentinel/CHANGELOG.md`, `packages/sentinel/README.md`
  - Pre-commit: `bun test --coverage --coverage-threshold=80`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(sentinel): remove console.log and global mock from CallbackUserProvider` | CallbackUserProvider.ts | `bun test tests/provider.test.ts` |
| 2 | `refactor(sentinel): replace any types with GravitoContext/GravitoNext in middleware` | middleware/*.ts | `bun run typecheck && bun test` |
| 3 | `feat(sentinel): implement token hashing in TokenGuard with sha256/sha512 support` | TokenGuard.ts, token-guard-hashing.test.ts | `bun test tests/guards.test.ts tests/token-guard-hashing.test.ts` |
| 4 | `refactor(sentinel): remove unsafe type casts from SessionGuard` | SessionGuard.ts | `bun test tests/guards.test.ts` |
| 5 | `perf(sentinel): optimize default guard resolution and caching in AuthManager` | AuthManager.ts, auth-manager-caching.test.ts | `bun test` |
| 6 | `feat(sentinel): add CachedUserProvider with TTL and LRU eviction` | CachedUserProvider.ts, cached-user-provider.test.ts | `bun test` |
| 7 | `feat(sentinel): implement Remember Me functionality in SessionGuard` | SessionGuard.ts, session-guard-remember.test.ts | `bun test tests/guards.test.ts tests/session-guard-remember.test.ts` |
| 8 | `feat(sentinel): add JwtRefreshGuard with access/refresh token pair support` | JwtRefreshGuard.ts, jwt-refresh-guard.test.ts | `bun test` |
| 9 | `feat(sentinel): add TokenBlacklist interface and InMemoryTokenBlacklist implementation` | TokenBlacklist.ts, token-blacklist.test.ts | `bun test` |
| 10 | `feat(sentinel): add throttleAuth middleware for brute-force protection` | throttleAuth.ts, throttle-auth.test.ts | `bun test` |
| 11 | `test(sentinel): increase SessionGuard coverage to 95%+` | session-guard-additional.test.ts | `bun test` |
| 12 | `test(sentinel): increase TokenGuard coverage to 95%+` | token-guard-additional.test.ts | `bun test` |
| 13 | `test(sentinel): add comprehensive AuthManager test suite with 90%+ coverage` | auth-manager.test.ts | `bun test` |
| 14 | `test(sentinel): add comprehensive Gate test suite with 90%+ coverage` | gate.test.ts | `bun test` |
| 15 | `docs(sentinel): add comprehensive JSDoc to all public APIs` | src/**/*.ts | `bun run typecheck` |
| 16 | `chore(sentinel): release v4.0.0 with breaking changes and new features` | package.json, CHANGELOG.md, README.md | `bun test --coverage --coverage-threshold=80` |

---

## Success Criteria

### Verification Commands

```bash
# 1. All tests pass
cd packages/sentinel && bun test
# Expected: All tests PASS

# 2. Coverage meets threshold
bun test --coverage --coverage-threshold=80
# Expected: Exit code 0

# 3. Type check passes
bun run typecheck
# Expected: Zero TypeScript errors

# 4. No console.log in production code
grep -r "console.log" src/
# Expected: (empty - no matches)

# 5. No 'any' types in public APIs
grep -r ": any" src/ | grep -v test | grep -v "// @ts-"
# Expected: (empty - no matches)

# 6. Version bumped
grep '"version"' package.json
# Expected: "version": "4.0.0"
```

### Final Checklist
- [ ] All "Must Have" present:
  - Type safety achieved (GravitoContext/GravitoNext)
  - TDD workflow followed (tests before implementation)
  - Backward compatibility maintained (except documented breaking changes)
- [ ] All "Must NOT Have" absent:
  - No external database dependencies
  - No breaking changes to Guard interface
  - No AI-generated boilerplate JSDoc
  - No incomplete test coverage
  - No console.log or debugging statements
  - No hardcoded secrets or mock data
- [ ] All tests pass: `bun test` → 100% PASS
- [ ] Coverage threshold met: `bun test --coverage --coverage-threshold=80` → EXIT 0
- [ ] Types valid: `bun run typecheck` → 0 errors
- [ ] Documentation complete: CHANGELOG.md and README.md updated
