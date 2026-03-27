---
phase_number: 1
phase_name: JWT Native Implementation (v1.5.0)
milestone: v1.5.0
phase_type: implementation
duration: 3-4 days (2026-03-27 to 2026-03-31)
status: ready_for_planning
---

# Phase 1: JWT Native Implementation

**Milestone:** v1.5.0 - Hono Dependency Removal & Type System Enhancement
**Focus:** Replace hono/jwt re-export with native implementation using jose library
**Target:** Eliminate Hono JWT dependency while maintaining 100% API compatibility

## Overview

Replace `packages/photon/src/jwt.ts` implementation from `hono/jwt` to native jose, implementing all 5 exported functions (sign, verify, decode, jwt, verifyWithJwks) with comprehensive test coverage.

## Scope

**Files to Modify:**
- packages/photon/src/jwt.ts (re-export → native implementation)
- packages/photon/tests/native/native-jwt.test.ts (new tests for native functions)

**Functions to Implement:**
1. `sign(payload, secret, alg?)` — Sign JWT with jose.SignJWT
2. `verify(token, secret, alg?)` — Verify JWT with jose.jwtVerify
3. `decode(token)` — Decode JWT without verification
4. `jwt(options)` — Middleware factory for JWT authentication
5. `verifyWithJwks(token, options)` — JWKS verification (if used; else deprecate)

**Exported Types:**
- JwtPayload, JwtHeader, JwtOptions, JwtFunction

## Success Criteria

1. ✅ All 5 JWT functions implemented natively (jose)
2. ✅ 100% API compatibility with current Hono JWT
3. ✅ native-jwt.test.ts with 12–15 comprehensive tests
4. ✅ All existing JWT tests pass (backwards compatibility verified)
5. ✅ TypeCheck: 0 errors (83/83 packages)
6. ✅ Test pass rate: ≥99.6% (no regressions)
7. ✅ Health score: ≥93/100 maintained

## Related Plans

- `07-01-PLAN.md` — Detailed Phase 1 execution plan
- `07-01-RESEARCH.md` — JWT API analysis & implementation strategy
- `07-01-SUMMARY.md` — Completion summary (after execution)

## Next Phase

Phase 2 (2026-04-01): External Package Type Cleanup (mass/beam/zenith)
