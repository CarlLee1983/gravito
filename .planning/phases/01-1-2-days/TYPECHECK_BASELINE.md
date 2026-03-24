# TypeScript Type Check Baseline

**Generated:** 2026-03-24
**TypeScript Version:** 5.9.3
**Turbo Tasks:** 83 successful, 83 total (1 fresh, 82 cached)
**Result:** ALL PASS — 0 type errors

## Summary

| Metric | Value |
|--------|-------|
| TypeScript version | 5.9.3 |
| Packages checked | 83 |
| Errors | 0 |
| @ts-ignore + @ts-expect-error | 141 |
| Production code suppressions | 22 |
| Test code suppressions | 119 |

## Type Suppression Distribution

### Production Code (22 suppressions — requires attention)

| File | Count | Notes |
|------|-------|-------|
| `packages/atlas/src/drivers/BunSQLDriver.ts` | 10 | Bun SQL API type gaps |
| `packages/signal/src/OrbitSignal.ts` | 1 | OrbitSignal type issues |
| `packages/signal/src/Mailable.ts` | 1 | Mailable type issues |
| `packages/ripple/src/engines/UWebSocketsEngine.ts` | 1 | WebSocket engine type |
| `packages/launchpad/src/Infrastructure/Router/BunProxyAdapter.ts` | 1 | Proxy adapter type |
| `packages/fortify/src/services/TwoFactorService.ts` | 1 | 2FA service API type gap |
| `packages/core/src/engine/FastContext.ts` | 1 | Bun/Fetch specific properties |
| `packages/cli/stubs/tinker-bootstrap.ts` | 1 | CLI stub type |
| `packages/quasar/src/__tests__/mock-redis.ts` | 1 | Mock type (test helper) |

**Note:** Node modules file excluded (official-landing/node_modules/.vue-global-types/)

### Test Code (119 suppressions — acceptable)

Top files by count:
| File | Count |
|------|-------|
| `packages/freeze-react/tests/index.test.ts` | 12 |
| `packages/stream/tests/BunBufferedPersistence.test.ts` | 11 |
| `packages/monolith/tests/content-cache.test.ts` | 7 |
| `packages/atlas/tests/AttributeCasting.test.ts` | 7 |
| `packages/core/tests/body-cache.test.ts` | 6 |
| `packages/atlas/tests/unit/Connection.transaction.test.ts` | 6 |
| `packages/atlas/tests/SoftDeletes.test.ts` | 6 |
| `packages/atlas/tests/QueryScopes.test.ts` | 6 |
| `packages/ripple/tests/rate-limit.test.ts` | 5 |
| `packages/flare/tests/hooks-typing.test.ts` | 5 |

## Type Check Configuration

- Strict mode: enabled
- `noUnusedLocals`: true
- `noUnusedParameters`: true
- `skipLibCheck`: true (used in typecheck command)

## Key Finding

All 83 packages pass type checking. The 22 production suppressions are concentrated in:
1. **BunSQLDriver** (10) — Bun-specific SQL API without full TypeScript types
2. **Signal/Mailable** (2) — Email rendering type gaps
3. **Scattered single instances** (10) — Miscellaneous Bun API type gaps

Most critical is `@gravito/atlas/BunSQLDriver.ts` with 10 suppressions related to Bun's SQL driver API.

*Baseline recorded: 2026-03-24*
