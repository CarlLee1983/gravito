# Gravito HTTP Abstraction Layer - Implementation Plan

> **Status**: Phase 1 Complete ✅ | Phase 2 Complete ✅ | Phase 3 Pending ⏳

## Overview

This document outlines the plan to decouple Gravito from Hono, enabling future replacement with a custom Bun-native HTTP engine for maximum performance.

## Goals

1. **Minimal Breaking Changes** - Existing API remains functional
2. **Progressive Migration** - Users can adopt gradually
3. **Zero Runtime Overhead** - Abstractions resolve at compile time
4. **Type Safety** - Full TypeScript support throughout
5. **Bun-Native Optimization** - Prepared for custom high-performance core

---

## Phase 1: Create Abstraction Layer ✅

**Status**: Complete (2025-12-21)

### Files Created

| File | Purpose |
|------|---------|
| `src/http/types.ts` | Core HTTP types: `GravitoContext`, `GravitoRequest`, `GravitoHandler`, `GravitoMiddleware` |
| `src/http/index.ts` | HTTP module exports |
| `src/adapters/types.ts` | `HttpAdapter` interface that all engines must implement |
| `src/adapters/HonoAdapter.ts` | Default adapter wrapping Hono |
| `src/adapters/index.ts` | Adapter module exports |
| `src/compat.ts` | Backward-compatible type aliases |

### Type Mapping

| Hono Type | Gravito Type | Notes |
|-----------|--------------|-------|
| `Context` | `GravitoContext` | Full feature parity |
| `Handler` | `GravitoHandler` | Simplified (no `next`) |
| `MiddlewareHandler` | `GravitoMiddleware` | With `GravitoNext` |
| `Next` | `GravitoNext` | Async function |

### Exported from `gravito-core`

- `GravitoContext`, `GravitoRequest`, `GravitoHandler`, `GravitoMiddleware`
- `GravitoVariables`, `GravitoNext`, `GravitoErrorHandler`, `GravitoNotFoundHandler`
- `HttpAdapter`, `HonoAdapter`, `HonoContextWrapper`, `HonoRequestWrapper`
- `HttpMethod`, `StatusCode`, `ContentfulStatusCode`, `ValidationTarget`

---

## Phase 2: Internal Migration ✅

**Status**: Complete (2025-12-21)

### Completed Tasks ✅

- [x] **2.1** Update `PlanetCore.ts` to use `HttpAdapter` interface
  - Added `_adapter` private property with public getter
  - `app` property now returns `adapter.native` for backward compat
  - Added `adapter` option to `GravitoConfig`
- [x] **2.4** Update Orbit modules with `GravitoVariables` augmentation:
  - [x] `orbit-inertia` - Full migration to `GravitoContext`
  - [x] `orbit-session` - Added `session`, `csrf` to GravitoVariables
  - [x] `orbit-auth` - Added `auth`, `gate`, `hash`, etc. to GravitoVariables
  - [x] `orbit-request` - Added `validated` to GravitoVariables
  - [x] `orbit-cache` - Added `cache` to GravitoVariables
  - [x] `orbit-mail` - Added `mail` to GravitoVariables
  - [x] `orbit-queue` - Added `queue`, `db` to GravitoVariables
- [x] **2.6** Add adapter injection to `PlanetCore.boot()`

### Deferred Tasks (Low Priority)

- [ ] **2.2** Update `Router.ts` to use `GravitoHandler` types (optional, works as-is)
- [ ] **2.3** Update `CookieJar.ts` to work with `GravitoContext` (optional, Hono-coupled for now)
- [ ] **2.5** Update helper functions in `helpers/response.ts` (optional)

---

## Phase 3: Documentation & User Migration

**Status**: Pending

### Tasks

- [ ] **3.1** Update official documentation
- [ ] **3.2** Create migration guide
- [ ] **3.3** Add deprecation warnings for direct Hono imports
- [ ] **3.4** Create codemod tool for automatic migration
- [ ] **3.5** Update all example projects
- [ ] **3.6** Update templates (`basic`, `inertia-react`)

### Documentation Updates

1. **Getting Started** - Show `GravitoContext` usage
2. **Controllers** - Replace `Context` with `GravitoContext`
3. **Middleware** - Use `GravitoMiddleware` type
4. **API Reference** - Document all new types

---

## Phase 4: Custom Bun-Native Adapter (Future)

**Status**: Planned

### Goals

- Eliminate Hono overhead completely
- Leverage Bun's native `Bun.serve()` directly
- Implement trie-based router optimized for Bun
- Maximum performance with minimal abstraction

### Proposed Architecture

```
BunNativeAdapter
├── BunRouter (custom trie router)
├── BunContext (direct Request/Response)
└── BunMiddlewarePipeline
```

---

## Usage Examples

### Current (Hono-coupled)

```typescript
// Controller
import type { Context } from 'hono'

export class UserController {
  async show(c: Context) {
    const id = c.req.param('id')
    return c.json({ user: await User.find(id) })
  }
}
```

### New (Gravito Abstraction)

```typescript
// Controller
import type { GravitoContext } from 'gravito-core'

export class UserController {
  async show(ctx: GravitoContext) {
    const id = ctx.req.param('id')
    return ctx.json({ user: await User.find(id) })
  }
}
```

### Compatibility Mode

```typescript
// During migration, both work:
import type { Context } from 'gravito-core/compat'
// or
import type { GravitoContext } from 'gravito-core'
```

---

## Testing Strategy

1. **Unit Tests** - Test each wrapper class independently
2. **Integration Tests** - Verify adapter works with PlanetCore
3. **E2E Tests** - Run existing test suite with HonoAdapter
4. **Benchmark Tests** - Compare performance before/after

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes | Maintain backward compat aliases |
| Performance regression | Benchmark before/after |
| Missing Hono features | Document escape hatches via `ctx.native` |
| Orbit module compatibility | Update each orbit incrementally |

---

## Timeline

| Phase | Estimated Duration | Dependencies |
|-------|-------------------|--------------|
| Phase 1 | ✅ Complete | None |
| Phase 2 | 2-3 days | Phase 1 |
| Phase 3 | 1-2 days | Phase 2 |
| Phase 4 | TBD | Phases 1-3, Bun research |

---

## Changelog

- **2025-12-21**: Phase 2 complete - PlanetCore adapter integration
  - Added `_adapter` property to PlanetCore
  - `app` is now a getter returning `adapter.native`
  - All orbit modules have GravitoVariables augmentation
  - Migration guide created at `docs/en/guide/migration-http-abstraction.md`
- **2025-12-21**: Phase 1 complete - Created abstraction layer

