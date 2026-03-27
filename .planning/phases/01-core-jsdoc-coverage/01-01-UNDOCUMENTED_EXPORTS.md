# Undocumented Exports in @gravito/core

**Analysis Date:** 2026-03-27
**Baseline Coverage:** 27%
**Target Coverage:** 90%+ (≥10 of 11 exports)

---

## Summary

Analysis of `packages/core/src/index.ts` identified 11 major export groups lacking comprehensive JSDoc documentation following the Photon quality standard (1-2 sentence descriptions, @param, @returns, @example for non-trivial functions).

---

## Undocumented Export Groups

### 1. HTTP Adapters & Engine Pattern (Lines 25-29)

**Location:** `packages/core/src/index.ts:25-29`
**Exports:**
- `BunNativeAdapter` (class)
- `GravitoEngineAdapter` (class)
- `AdapterConfig`, `AdapterFactory`, `HttpAdapter`, `RouteDefinition` (types)
- `isHttpAdapter()` (function)

**Status:** No JSDoc block before exports
**Complexity:** Medium (adapter pattern explanation needed)
**Priority:** High (core HTTP engine pattern)

**Current Code:**
```typescript
export { BunNativeAdapter } from './adapters/bun/BunNativeAdapter'
export { GravitoEngineAdapter } from './adapters/GravitoEngineAdapter'
// Adapters
export type { AdapterConfig, AdapterFactory, HttpAdapter, RouteDefinition } from './adapters/types'
export { isHttpAdapter } from './adapters/types'
```

---

### 2. HTTP Types Export Group (Lines 31-45)

**Location:** `packages/core/src/index.ts:31-45`
**Exports:** ContentfulStatusCode, GravitoContext, GravitoErrorHandler, GravitoHandler, GravitoMiddleware, GravitoNext, GravitoNotFoundHandler, GravitoRequest, GravitoVariables, HttpMethod, ProxyOptions, StatusCode, ValidationTarget (all type exports)

**Status:** Comment-only, no JSDoc block
**Complexity:** Low (type definitions)
**Priority:** High (frequently imported)

---

### 3. Core Application & DI Container (Lines 52-62)

**Location:** `packages/core/src/index.ts:52-62`
**Exports:**
- `Application` (class)
- `CommandKernel` (class)
- `ConfigManager` (class)
- `Container` (class)
- `RequestScopeManager` (class)
- `RequestScopeMetrics`, `RequestScopeMetricsCollector` (classes)
- `registerQueueCommands()` (function)

**Status:** Comment separators only, no JSDoc
**Complexity:** High (core DI/application lifecycle)
**Priority:** Critical (most-used exports)

---

### 4. EventManager Lifecycle (Line 71)

**Location:** `packages/core/src/index.ts:71`
**Exports:** `EventManager` (class)

**Status:** Comment separator only
**Complexity:** High (event dispatching, listener registration)
**Priority:** Critical (core event system)

---

### 5. Event System Management (Lines 82-127)

**Location:** `packages/core/src/index.ts:82-127`
**Exports:**
- BackpressureManager, CircuitBreaker, DeadLetterQueue, WorkerPool, etc. (classes)
- Various types: BackpressureConfig, EventQueueConfig, RetrySchedulerConfig, etc.

**Status:** Comment separators only
**Complexity:** Very High (45+ types/classes, complex backpressure/circuit-breaker patterns)
**Priority:** High (event reliability infrastructure)

---

### 6. Observability & Queue Dashboard (Lines 147-164)

**Location:** `packages/core/src/index.ts:147-164`
**Exports:**
- Observability types: EventMetricsRecorder, EventTracingProvider, ObservabilityProvider, etc.
- `QueueDashboard` (class)
- EventMetrics, EventTracer, EventTracing, ObservableHookManager, OTelEventMetrics (classes)

**Status:** Inline comments only, no JSDoc
**Complexity:** High (observability contracts and implementations)
**Priority:** Medium (tooling/monitoring)

---

### 7. Global Error Handlers & Server (Lines 173-180)

**Location:** `packages/core/src/index.ts:173-180`
**Exports:**
- `registerGlobalErrorHandlers()` (function)
- `GravitoServer` (class)
- Error handler types

**Status:** Comment-only, no JSDoc
**Complexity:** Medium (global error handling, server initialization)
**Priority:** High (error handling pattern)

---

### 8. Hooks System (Lines 182-183)

**Location:** `packages/core/src/index.ts:182-183`
**Exports:**
- `HookManager` (class)
- Types: ActionCallback, FilterCallback, ListenerInfo, ListenerOptions

**Status:** Comment-only, no JSDoc
**Complexity:** Medium (hook system for extensibility)
**Priority:** Medium (extension points)

---

### 9. Health & Cookie Utilities (Lines 185-217)

**Location:** `packages/core/src/index.ts:185-217`
**Exports:**
- `HealthProvider` (class)
- `CookieJar` (class)
- Cookie helper functions: deleteCookie, getCookie, setCookie

**Status:** Comment-only, no JSDoc
**Complexity:** Low-Medium (utility classes/functions)
**Priority:** Medium (HTTP utilities)

---

### 10. Routing & DLQ (Lines 247-265)

**Location:** `packages/core/src/index.ts:247-265`
**Exports:**
- `Route` (class)
- `Router`, `RouteGroup` (classes)
- `DeadLetterQueueManager`, `RetryEngine` (classes)
- Routing types: ControllerClass, FormRequestClass, FormRequestLike, etc.

**Status:** Comment-only, no JSDoc
**Complexity:** High (routing layer, DLQ management)
**Priority:** Critical (routing is core functionality)

---

### 11. Runtime Adapters & Utilities (Lines 284-352)

**Location:** `packages/core/src/index.ts:284-352`
**Exports:**
- `archiveFromDirectory()` (function)
- Runtime adapter functions: getArchiveAdapter, getCompressionAdapter, getRuntimeAdapter, etc.
- `BinaryUtils` (class)
- `getDeepEquals()` (function)
- Engine module re-export

**Status:** Comment-only, no JSDoc
**Complexity:** High (40+ runtime adapters, multi-platform support)
**Priority:** Medium (runtime abstraction layer)

---

## Categorization by Complexity

### Simple Exports (4-5)
- HTTP Types (2)
- Cookie Utilities (3)
- Health provider (1)

### Medium Complexity (3-4)
- HTTP Adapters (4)
- Global Handlers (2)
- Hooks System (1)

### Complex Exports (2-3)
- Event System Management (45+ items)
- Routing & DLQ (6-8 items)
- Runtime Adapters (40+ items)

---

## Documentation Strategy

**Priority Order for Implementation:**
1. Core DI Container & Application (Critical - most impact)
2. EventManager & Event System (Critical - core functionality)
3. Routing & Router (Critical - routing is fundamental)
4. HTTP Types & Adapters (High - foundational)
5. Global Error Handlers (High - error handling pattern)
6. Runtime Adapters (Medium - less frequently used directly)
7. Observability (Medium - monitoring feature)
8. Hooks System (Low - advanced feature)

---

## Quality Standards Applied

Each JSDoc block follows the Photon standard:

✅ 1-2 sentence description of purpose
✅ @param with type and description (for functions)
✅ @returns with description
✅ @example code block (for non-trivial functions/classes)
✅ @public mark for public API
✅ Related @see links where applicable

---

**Generated:** 2026-03-27
**Next Step:** Execute Task 2-4 to document all 11 groups
