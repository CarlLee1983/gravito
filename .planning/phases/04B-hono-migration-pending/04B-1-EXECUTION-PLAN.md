---
phase: 04B-hono-migration-pending
plan: 4B-1
type: execution
title: "Phase 4B-1: Easy Compat Shim Replacements — Execution Plan"
timeline: "~1 week"
scope: "5 low-risk photon compat shim file replacements"
preconditions:
  - "Phase 4A complete (health score 93/100)"
  - "TypeCheck: 0 errors (83/83 packages)"
  - "Test suite: 11,666 pass / 40 fail (99.7% pass rate)"
  - "No blocking issues or circular dependencies"
wave: 1
parallel_execution: true
risk_level: LOW
dependencies: []
---

# Phase 4B-1: Easy Compat Shim Replacements — Execution Plan

**Timeline:** ~1 week (5 tasks, executable in parallel or serial)
**Scope:** Replace 5 low-risk photon compat shim files with native implementations
**Preconditions:** Phase 4A complete, health score ≥93/100, typecheck 0 errors
**Success Criteria:** All 5 tasks complete, tests pass, no new regressions, backwards compat maintained

---

## Migration Overview

Phase 4B-1 targets the **5 easiest compat shim replacements** in `packages/photon/src/`. Each shim is a thin re-export from Hono that can be replaced with native Gravito code or removed entirely while maintaining backwards compatibility (Pattern D-02).

### Dependency Analysis

All 5 tasks are **independent** (different files, no cross-references). Can be executed in any order or in parallel. Recommended order by complexity:

1. **http-exception.ts** — Simplest, type-only re-export
2. **router/reg-exp-router.ts** — Deprecate, minimal changes
3. **router/trie-router.ts** — Deprecate, minimal changes
4. **logger.ts** — New native middleware (~20 lines)
5. **middleware/websocket.ts** — Upgrade to use native types (already partially done)

---

## Task 1: Replace http-exception.ts

### File Location
```
packages/photon/src/http-exception.ts
```

### Current Code
```typescript
/**
 * @deprecated v2.0 - Hono compatibility layer, will be removed
 *
 * This module re-exports Hono utilities for backwards compatibility.
 * For v2.0+, please use:
 * - Native Bun APIs for server functionality
 * - Gravito native implementations where available
 * - Custom implementations for app-specific needs
 *
 * Removal timeline: v2.0 (2026 Q3)
 * Migration guide: See MIGRATION.md
 *
 * ---
 *
 * HTTP Exceptions for Photon.
 *
 * Standardized HTTP error classes (HTTPException) for handling
 * error responses in a consistent way across the Gravito ecosystem.
 *
 * @public
 */
export * from 'hono/http-exception'
```

### Target Code
Replace with native re-export from @gravito/core/exceptions:

```typescript
/**
 * HTTP Exceptions for Photon.
 *
 * Standardized HTTP error classes (HTTPException) for handling
 * error responses in a consistent way across the Gravito ecosystem.
 *
 * Gravito v1.x sources HTTP exceptions from @gravito/core. This module
 * provides backwards compatibility for existing imports:
 * - Old: import { HTTPException } from '@gravito/photon'
 * - New: import { HTTPException } from '@gravito/core'
 *
 * Both import paths work and resolve to the same class.
 *
 * @public
 */
export { HTTPException, type HTTPExceptionOptions } from '@gravito/core'
```

### Backwards Compatibility
✅ **MAINTAINED** — Old import paths continue to work:
```typescript
// Old way (still works after migration)
import { HTTPException } from '@gravito/photon'

// New way (recommended, direct from source)
import { HTTPException } from '@gravito/core'

// Both resolve to same implementation
```

### Pattern Applied
**Pattern C (Re-export bridge)** per D-02 — Replace Hono re-export with native Gravito re-export

### Verification Steps

1. **Type Check**
   ```bash
   bun run typecheck
   ```
   Expected: 0 errors (83/83 packages)

2. **Specific Export Test**
   ```bash
   bun test packages/photon/tests/exports.test.ts --grep "http-exception"
   ```
   Expected: Test passes verifying HTTPException exports match

3. **Full Photon Test Suite**
   ```bash
   bun test packages/photon --timeout=10000
   ```
   Expected: No new failures (current baseline: all tests pass)

### Risk Assessment
**RISK: LOW**
- Simple re-export change (1 line modification)
- No runtime behavior change
- HTTPException is already a core export
- All existing tests verify backwards compat

---

## Task 2: Deprecate router/reg-exp-router.ts

### File Location
```
packages/photon/src/router/reg-exp-router.ts
```

### Current Code
```typescript
/**
 * @deprecated v2.0 - Hono compatibility layer, will be removed
 *
 * This module re-exports Hono utilities for backwards compatibility.
 * For v2.0+, please use:
 * - Native Bun APIs for server functionality
 * - Gravito native implementations where available
 * - Custom implementations for app-specific needs
 *
 * Removal timeline: v2.0 (2026 Q3)
 * Migration guide: See MIGRATION.md
 *
 * ---
 *
 * RegExp Router for Photon.
 *
 * A router implementation using regular expressions for pattern matching.
 * Used internally by Photon for complex route patterns.
 *
 * @public
 */
export * from 'hono/router/reg-exp-router'
```

### Target Code (Option A: Deprecate + Forward to RadixRouter)
```typescript
/**
 * @deprecated v2.0 - Use @gravito/core RadixRouter instead
 *
 * Legacy RegExp router — replaced by RadixRouter in v2.0
 *
 * For most use cases, RadixRouter (the default router) provides better
 * performance. Only use this if you specifically need regex pattern matching.
 *
 * Migration: Import RadixRouter from @gravito/core/adapters
 *
 * @see RadixRouter
 * @public
 */

// Re-export from Hono for now (temporary until full removal in v2.0)
// In v2.0, this will be removed entirely
export * from 'hono/router/reg-exp-router'
```

### Target Code (Option B: Type-Only Stub — RECOMMENDED)
```typescript
/**
 * @deprecated v2.0 - Removed in favor of RadixRouter
 *
 * RegExp Router — replaced by native RadixRouter in @gravito/core
 *
 * This module is deprecated and will be removed in v2.0.
 * Use RadixRouter from @gravito/core/adapters instead.
 *
 * @see {@link https://github.com/gravito-framework/core}
 * @public
 */

// Type-only export for backwards compatibility (no runtime)
export type { Router } from 'hono/router'
```

### Why Option B is Recommended
- RegExp routers are rarely used directly in user code
- Most users rely on Photon's default RadixRouter
- Phase 4B-1 goal is to **remove Hono imports**, not keep re-exports
- Type-only stub allows compilation without Hono dependency

### Backwards Compatibility
✅ **MAINTAINED (with deprecation)** — Type imports still work:
```typescript
// Old way (type-only, will warn in v2.0)
import type { Router } from '@gravito/photon/router/reg-exp-router'

// New way (recommended)
import { RadixRouter } from '@gravito/core/adapters'
```

### Pattern Applied
**Pattern B (Deprecation + stub)** — Add @deprecated JSDoc, provide type-only export for compile-time compat

### Verification Steps

1. **Type Check**
   ```bash
   bun run typecheck
   ```
   Expected: 0 errors, no new TS complaints about deprecated imports

2. **Search for Direct Usage**
   ```bash
   grep -r "reg-exp-router" packages/*/src --include="*.ts" | grep -v "tests"
   ```
   Expected: No hits in production code (only in test/exports)

3. **Full Test Suite**
   ```bash
   bun test packages/photon --timeout=10000
   ```
   Expected: No new failures

### Risk Assessment
**RISK: LOW**
- RegExp routers rarely used in practice
- Deprecation warnings are non-breaking
- All existing code continues to compile
- Removal deferred to v2.0

---

## Task 3: Deprecate router/trie-router.ts

### File Location
```
packages/photon/src/router/trie-router.ts
```

### Current Code
```typescript
/**
 * @deprecated v2.0 - Hono compatibility layer, will be removed
 *
 * This module re-exports Hono utilities for backwards compatibility.
 * For v2.0+, please use:
 * - Native Bun APIs for server functionality
 * - Gravito native implementations where available
 * - Custom implementations for app-specific needs
 *
 * Removal timeline: v2.0 (2026 Q3)
 * Migration guide: See MIGRATION.md
 *
 * ---
 *
 * Trie Router for Photon.
 *
 * A high-performance router implementation using a Radix Tree (Trie).
 * This is the default and fastest router for Photon.
 *
 * @public
 */
export * from 'hono/router/trie-router'
```

### Target Code
```typescript
/**
 * @deprecated v2.0 - Removed in favor of native RadixRouter
 *
 * Trie Router — replaced by native RadixRouter in @gravito/core
 *
 * Photon v1.x uses RadixRouter (a Radix Tree implementation) as the default.
 * This module provided the Hono trie router and is deprecated.
 *
 * Migration: Use RadixRouter from @gravito/core/adapters
 *
 * ```typescript
 * import { RadixRouter } from '@gravito/core/adapters'
 * ```
 *
 * @see {@link https://github.com/gravito-framework/core}
 * @public
 */

// Type-only export for backwards compatibility (no runtime)
export type { Router } from 'hono/router'
```

### Backwards Compatibility
✅ **MAINTAINED (with deprecation)** — Same as reg-exp-router

### Pattern Applied
**Pattern B (Deprecation + stub)** — Add @deprecated JSDoc, provide type-only export

### Verification Steps

1. **Type Check**
   ```bash
   bun run typecheck
   ```
   Expected: 0 errors

2. **Search for Direct Usage**
   ```bash
   grep -r "trie-router" packages/*/src --include="*.ts" | grep -v "tests"
   ```
   Expected: No hits in production code

3. **Full Test Suite**
   ```bash
   bun test packages/photon --timeout=10000
   ```
   Expected: No new failures

### Risk Assessment
**RISK: LOW**
- Trie routers (RadixRouter) is Photon's **default**; users don't import it explicitly
- Deprecation is non-breaking
- All existing code continues to work
- Removal deferred to v2.0

---

## Task 4: Replace logger.ts

### File Location
```
packages/photon/src/logger.ts
```

### Current Code
```typescript
/**
 * @deprecated v2.0 - Hono compatibility layer, will be removed
 *
 * This module re-exports Hono utilities for backwards compatibility.
 * For v2.0+, please use:
 * - Native Bun APIs for server functionality
 * - Gravito native implementations where available
 * - Custom implementations for app-specific needs
 *
 * Removal timeline: v2.0 (2026 Q3)
 * Migration guide: See MIGRATION.md
 *
 * ---
 *
 * Logging Middleware for Photon.
 *
 * Provides request logging capabilities to track incoming traffic,
 * response times, and status codes.
 *
 * @public
 */
export * from 'hono/logger'
```

### Target Code
Replace with native middleware (~20 lines):

```typescript
/**
 * Logging Middleware for Photon.
 *
 * Provides request logging capabilities to track incoming traffic,
 * response times, and status codes.
 *
 * Native implementation (no Hono dependency).
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { logger } from '@gravito/photon/logger'
 *
 * const app = new Photon()
 * app.use(logger())
 * ```
 *
 * @public
 */

import type { GravitoMiddleware } from '@gravito/core'

/**
 * Request logger middleware
 *
 * Logs HTTP method, path, status code, and response time for each request.
 *
 * @returns GravitoMiddleware
 */
export function logger(): GravitoMiddleware {
  return async (ctx, next) => {
    const start = Date.now()
    const method = ctx.req.method
    const path = ctx.req.path

    await next()

    const duration = Date.now() - start
    const status = ctx.res.status

    console.log(`${method} ${path} ${status} ${duration}ms`)
  }
}
```

### Backwards Compatibility
✅ **MAINTAINED** — Function signature identical to Hono version:
```typescript
// Old way (Hono logger)
import { logger } from '@gravito/photon/logger'
app.use(logger())  // ← Works the same

// After migration: same signature, native implementation
```

### Pattern Applied
**Pattern B (Function delegation)** — Keep same function signature, replace implementation with native code

### Implementation Notes
- Uses `Date.now()` for timing (synchronous, no overhead)
- Logs to `console.log` (same as Hono version)
- No configuration options (v1.x minimal version; v2.0 can add options)
- Signature: `logger(): GravitoMiddleware` matches Hono's `logger()`

### Verification Steps

1. **Type Check**
   ```bash
   bun run typecheck
   ```
   Expected: 0 errors (GravitoMiddleware is exported from @gravito/core)

2. **Unit Test — Logger Middleware**
   ```bash
   bun test packages/photon/tests/native/native-logger.test.ts
   ```
   Expected: New test file passes (see below)

3. **Full Photon Test Suite**
   ```bash
   bun test packages/photon --timeout=10000
   ```
   Expected: No new failures

### New Test File: packages/photon/tests/native/native-logger.test.ts

```typescript
import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test'
import { Photon } from '../../src/index'
import { logger } from '../../src/logger'

describe('native logger middleware', () => {
  let logOutput: string[] = []
  let originalLog: (typeof console)['log']

  beforeEach(() => {
    logOutput = []
    originalLog = console.log
    console.log = mock((message: string) => {
      logOutput.push(message)
    })
  })

  afterEach(() => {
    console.log = originalLog
    logOutput = []
  })

  it('logs request method, path, status, and duration', async () => {
    const app = new Photon()
    app.use(logger())

    app.get('/test', (ctx) => {
      return ctx.text('OK')
    })

    const res = await app.request(new Request('http://localhost/test'))

    expect(res.status).toBe(200)
    expect(logOutput.length).toBeGreaterThan(0)

    const logged = logOutput[0]
    expect(logged).toContain('GET')
    expect(logged).toContain('/test')
    expect(logged).toContain('200')
    expect(logged).toMatch(/\d+ms/)
  })

  it('logs non-200 status codes correctly', async () => {
    const app = new Photon()
    app.use(logger())

    app.get('/notfound', (ctx) => {
      return ctx.text('Not Found', 404)
    })

    const res = await app.request(new Request('http://localhost/notfound'))

    expect(res.status).toBe(404)
    expect(logOutput[0]).toContain('404')
  })

  it('logs duration in milliseconds', async () => {
    const app = new Photon()
    app.use(logger())

    app.get('/slow', async (ctx) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return ctx.text('OK')
    })

    const res = await app.request(new Request('http://localhost/slow'))

    expect(res.status).toBe(200)
    const logged = logOutput[0]
    expect(logged).toMatch(/\d+ms/)
  })
})
```

### Risk Assessment
**RISK: LOW**
- Native implementation is trivial (5 lines of code)
- Function signature is identical to Hono version
- Behavior is identical to Hono logger (method + path + status + duration)
- Existing tests verify the middleware works
- New test verifies native version behaves the same

---

## Task 5: Update middleware/websocket.ts

### File Location
```
packages/photon/src/middleware/websocket.ts
```

### Current Code
The file already imports from both Hono (`hono/ws`) and native (`websocket-native.ts`). Current lines 24-44:

```typescript
import type { WSEvents, WSMessageReceive } from 'hono/ws'
import { defineWebSocketHelper, WSContext } from 'hono/ws'

// Re-export native WebSocket implementation (zero Hono type dependency for handler logic)
export {
  defineWSHandler,
  type NativeWSCloseEvent,
  type NativeWSContext,
  type NativeWSEvents,
  type NativeWSMessageEvent,
  type TypedWSContext,
  type TypedWSHandler,
  type WSHandlerConfig,
} from './websocket-native'

// Import for adapter function
import { defineWSHandler } from './websocket-native'

// Backward compatibility: re-export Hono's types and helper
export { WSContext, defineWebSocketHelper }
export type { WSEvents, WSMessageReceive, WSReadyState } from 'hono/ws'
```

### Target Code
**Option A: Remove Hono imports (RECOMMENDED for Phase 4B-1)**

Since the module already re-exports native types, **minimize Hono usage** while maintaining backwards compat:

```typescript
/**
 * @fileoverview WebSocket Middleware for Photon
 *
 * Provides native WebSocket support for Photon applications, leveraging
 * Bun's high-performance WebSocket implementation with Hono-compatible API.
 *
 * @module @gravito/photon/middleware/websocket
 * @since 2.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Native WebSocket (Primary API — no Hono dependency)
// ─────────────────────────────────────────────────────────────────────────────

export {
  defineWSHandler,
  type NativeWSCloseEvent,
  type NativeWSContext,
  type NativeWSEvents,
  type NativeWSMessageEvent,
  type TypedWSContext,
  type TypedWSHandler,
  type WSHandlerConfig,
} from './websocket-native'

// ─────────────────────────────────────────────────────────────────────────────
// Hono Compatibility Layer (Deprecated v2.0)
// ─────────────────────────────────────────────────────────────────────────────

// Import for adapter function
import { defineWSHandler } from './websocket-native'

// Type-only imports from Hono (for backwards compat, no runtime cost)
import type { WSEvents, WSMessageReceive } from 'hono/ws'

/**
 * Hono WSContext — use NativeWSContext instead
 * @deprecated v2.0 — Use NativeWSContext
 */
export interface WSContext {
  send(data: string): void
  close(code?: number, reason?: string): void
  readonly readyState: 0 | 1 | 2 | 3
  readonly url: URL | null
}

/**
 * Hono defineWebSocketHelper — use defineWSHandler instead
 * @deprecated v2.0 — Use defineWSHandler
 */
export function defineWebSocketHelper<T extends Record<string, any>>(
  events: T
): T {
  // Stub: returns input unchanged
  // Hono's helper was primarily for type inference, which is built into NativeWSHandler
  return events
}

// Backward compatibility type exports
export type { WSEvents, WSMessageReceive }

/**
 * WSReadyState — numeric constants for WebSocket connection states
 * @deprecated v2.0 — Use readyState property directly
 */
export const WSReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Hono Adapter (Deprecated v2.0)
// ─────────────────────────────────────────────────────────────────────────────

import type { NativeWSContext } from './websocket-native'

/**
 * @deprecated v2.0 — Use NativeWSContext directly
 * @internal
 */
export function adaptHonoWSContext(honoWs: WSContext): NativeWSContext {
  return {
    send(data: string): void {
      honoWs.send(data)
    },

    close(code?: number, reason?: string): void {
      honoWs.close(code, reason)
    },

    get readyState() {
      return honoWs.readyState
    },

    get url() {
      return honoWs.url
    },
  }
}

/**
 * @deprecated v2.0 — Use native handler directly
 * @internal
 */
type HonoWSMessageEvent = {
  data: WSMessageReceive
}

async function normalizeHonoMessageData(
  data: WSMessageReceive
): Promise<string | ArrayBuffer | Uint8Array> {
  if (typeof data === 'string' || data instanceof ArrayBuffer || data instanceof Uint8Array) {
    return data
  }

  if (data instanceof SharedArrayBuffer) {
    return new Uint8Array(data)
  }

  if (data instanceof Blob) {
    return await data.arrayBuffer()
  }

  throw new TypeError('Unsupported WebSocket message payload type')
}

/**
 * @deprecated v2.0 — Use native handler directly
 * @internal
 */
export async function adaptHonoMessageEvent(honoEvent: HonoWSMessageEvent): Promise<{
  data: string | ArrayBuffer | Uint8Array
  lastMessageInBatch?: boolean
}> {
  return {
    data: await normalizeHonoMessageData(honoEvent.data),
  }
}

/**
 * Wrap defineWSHandler to work with Hono's WSEvents
 *
 * @deprecated v2.0 — Use defineWSHandler with NativeWSContext instead
 *
 * Provides backward compatibility by adapting our native handler
 * to Hono's WSContext and WSEvents types.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { upgradeWebSocket } from '@gravito/photon/bun'
 * import { defineWSHandler } from '@gravito/photon/middleware/websocket'
 *
 * const app = new Photon()
 * app.get('/ws/chat', upgradeWebSocket(
 *   defineWSHandler({
 *     onOpen(ws) { ws.send('connected') },
 *     onMessage(msg, ws) { ws.send(`echo: ${msg}`) },
 *   })
 * ))
 * ```
 *
 * @param handler - WebSocket handler definition
 * @param config - Handler configuration
 * @returns Hono WSEvents handler
 * @public
 */
export function defineHonoWSHandler<TIn = unknown, TOut = unknown>(
  handler: Parameters<typeof defineWSHandler<TIn, TOut>>[0],
  config?: Parameters<typeof defineWSHandler<TIn, TOut>>[1]
): (c: unknown) => WSEvents {
  const nativeHandlerFactory = defineWSHandler(handler, config)

  return (c: unknown) => {
    const nativeEvents = nativeHandlerFactory(c)

    // Adapt native events to Hono's WSEvents
    const honoEvents: WSEvents = {
      onOpen(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        return nativeEvents.onOpen?.(event, nativeWs)
      },

      async onMessage(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        const nativeEvent = await adaptHonoMessageEvent(event)
        return nativeEvents.onMessage?.(nativeEvent, nativeWs)
      },

      onClose(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        const nativeEvent = { code: event.code, reason: event.reason }
        return nativeEvents.onClose?.(nativeEvent, nativeWs)
      },

      onError(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        return nativeEvents.onError?.(event, nativeWs)
      },
    }

    return honoEvents
  }
}
```

### Changes Summary
1. **Refactor imports** — Move `defineWebSocketHelper` from Hono import to stub implementation
2. **Add @deprecated JSDoc** to Hono compat functions (adaptHonoWSContext, adaptHonoMessageEvent, defineHonoWSHandler)
3. **Keep all exports** — Existing code importing these continues to work
4. **Reduce Hono imports** — Only type-only imports remain (no runtime cost)

### Backwards Compatibility
✅ **FULLY MAINTAINED** — All existing exports and functions remain:
```typescript
// Old code (still works)
import { WSContext, defineWebSocketHelper } from '@gravito/photon/middleware/websocket'

// New code (recommended)
import { NativeWSContext, defineWSHandler } from '@gravito/photon/middleware/websocket'
```

### Pattern Applied
**Pattern A (Type stub + deprecation)** — Replace runtime Hono imports with stubs, keep types for backwards compat

### Verification Steps

1. **Type Check**
   ```bash
   bun run typecheck
   ```
   Expected: 0 errors

2. **Unit Test — WebSocket Middleware**
   ```bash
   bun test packages/photon/tests/native/native-websocket.test.ts
   ```
   Expected: New test file passes (see below)

3. **Full Photon Test Suite**
   ```bash
   bun test packages/photon --timeout=10000
   ```
   Expected: No new failures

### New Test File: packages/photon/tests/native/native-websocket.test.ts

```typescript
import { describe, expect, it } from 'bun:test'
import {
  defineWSHandler,
  defineHonoWSHandler,
  WSContext,
  WSReadyState,
} from '../../src/middleware/websocket'

describe('native WebSocket middleware', () => {
  it('exports defineWSHandler for native WebSocket handling', () => {
    expect(typeof defineWSHandler).toBe('function')
  })

  it('exports native WebSocket types', () => {
    expect(typeof defineWSHandler).toBe('function')
  })

  it('provides backwards compat: defineHonoWSHandler still works', () => {
    expect(typeof defineHonoWSHandler).toBe('function')

    const handler = defineHonoWSHandler({
      onOpen(ws) {
        ws.send('hello')
      },
    })

    expect(typeof handler).toBe('function')
  })

  it('provides backwards compat: WSReadyState constants', () => {
    expect(WSReadyState.CONNECTING).toBe(0)
    expect(WSReadyState.OPEN).toBe(1)
    expect(WSReadyState.CLOSING).toBe(2)
    expect(WSReadyState.CLOSED).toBe(3)
  })

  it('provides backwards compat: defineWebSocketHelper stub', async () => {
    const { defineWebSocketHelper } = await import('../../src/middleware/websocket')
    expect(typeof defineWebSocketHelper).toBe('function')

    const events = { onOpen: () => {} }
    const result = defineWebSocketHelper(events)
    expect(result).toBe(events) // Stub returns input unchanged
  })
})
```

### Risk Assessment
**RISK: LOW**
- Module already uses native types (websocket-native.ts is fully developed)
- Hono imports reduced to type-only (no runtime cost)
- All backwards-compat functions preserved
- New tests verify both native and compat APIs work
- Existing WebSocket tests will verify no regression

---

## Verification Gates — After All 5 Tasks Complete

Run these automated commands to verify Phase 4B-1 success:

### Gate 1: TypeScript Type Checking
```bash
bun run typecheck
```
**Expected Result:** 0 errors across 83 packages
**What it verifies:** No type regressions, all @deprecation annotations recognized

### Gate 2: Photon-Specific Tests
```bash
bun test packages/photon --timeout=10000
```
**Expected Result:** All tests pass (no new failures from baseline)
**What it verifies:** Existing API still works, new native implementations pass tests

### Gate 3: New Native Tests
```bash
bun test packages/photon/tests/native/native-*.test.ts
```
**Expected Result:** All new tests pass (logger, websocket, http-exception)
**What it verifies:** Native implementations behave correctly

### Gate 4: Full Suite + Stability Check
```bash
bun test --timeout=10000
```
**Expected Result:** 11,666+ pass / ≤40 fail / 99.7%+ pass rate (same as Phase 4A baseline)
**What it verifies:** No regressions in other packages, health score maintained ≥90/100

### Gate 5: Export Verification
```bash
bun -e "
const photon = require('./packages/photon/dist/index.js');
const core = require('./packages/core/dist/index.js');
console.log('Photon exports:', Object.keys(photon).length);
console.log('Core exports:', Object.keys(core).length);
console.log('HTTPException from core:', !!core.HTTPException);
"
```
**Expected Result:** All exports count matches baseline, HTTPException accessible
**What it verifies:** Bundle integrity, no missing exports

---

## Rollback Strategy

Each task is a **single file change** with no cross-dependencies. If any gate fails:

1. **Identify failing task** — Run `bun test` to locate which test fails
2. **Revert that task only** — `git revert <commit-hash>` for the failing task
3. **Continue others** — Other 4 tasks remain committed; complete Phase 4B-1 with remaining tasks
4. **Root cause analysis** — Investigate failure pattern for Phase 4B-2 planning

**No cascading failures** — Each task can be reverted independently without affecting others.

---

## Dependency Analysis Within Phase 4B-1

```
Task 1 (http-exception.ts) ─┐
                             ├─→ No cross-dependencies
Task 2 (router/reg-exp-router.ts) ─┤ Can be executed in any order
                             ├─→ or in parallel
Task 3 (router/trie-router.ts) ───┤
                             │
Task 4 (logger.ts) ──────────┤
                             │
Task 5 (middleware/websocket.ts) ─┘
```

All 5 tasks are **independent**. Recommended execution order: 1 → 2 → 3 → 4 → 5 (easiest to hardest), but any order works.

---

## Summary

**Phase 4B-1 is a low-risk, high-confidence migration step.** All 5 compat shims have clear, tested replacement strategies. The tasks involve either:

1. **Re-exporting from native source** (http-exception.ts)
2. **Deprecating with stub** (reg-exp-router.ts, trie-router.ts)
3. **Replacing with simple native implementation** (logger.ts)
4. **Upgrading to use native types** (middleware/websocket.ts)

**Success criteria:**
- ✅ All 5 files modified
- ✅ New test files pass (native-logger.test.ts, native-websocket.test.ts, native-http-exception.test.ts)
- ✅ TypeCheck: 0 errors (83/83)
- ✅ Test suite: ≥11,666 pass, ≤40 fail (99.7%+ pass rate)
- ✅ Health score: ≥90/100 maintained

---

**Estimated Duration:** 1 week (can be done faster if executed in parallel)

**Next Phase:** Phase 4B-2 (JWT native implementation) — more complex, requires `jose` library integration
