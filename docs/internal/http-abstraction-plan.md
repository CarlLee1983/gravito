# Gravito HTTP Abstraction Layer - Implementation Plan

> **Status**: Phase 1 Complete [Complete] | Phase 2 Complete [Complete] | Phase 3 Complete [Complete]
> **Legacy Note**: This plan predates Photon becoming the default engine and is kept for historical context.

## Overview

This document outlines the plan to decouple Gravito from any concrete HTTP engine (now Photon), enabling future replacement with a custom Bun-native HTTP engine for maximum performance.

## Goals

1. **Minimal Breaking Changes** - Existing API remains functional
2. **Progressive Migration** - Users can adopt gradually
3. **Zero Runtime Overhead** - Abstractions resolve at compile time
4. **Type Safety** - Full TypeScript support throughout
5. **Bun-Native Optimization** - Prepared for custom high-performance core

---

## Phase 1: Create Abstraction Layer [Complete]

**Status**: Complete (2025-12-21)

### Files Created

| File | Purpose |
|------|---------|
| `src/http/types.ts` | Core HTTP types: `GravitoContext`, `GravitoRequest`, `GravitoHandler`, `GravitoMiddleware` |
| `src/http/index.ts` | HTTP module exports |
| `src/adapters/types.ts` | `HttpAdapter` interface that all engines must implement |
| `src/adapters/PhotonAdapter.ts` | Default adapter wrapping Photon |
| `src/adapters/index.ts` | Adapter module exports |
| `src/compat.ts` | Backward-compatible type aliases |

### Type Mapping

| Photon Type | Gravito Type | Notes |
|-----------|--------------|-------|
| `Context` | `GravitoContext` | Full feature parity |
| `Handler` | `GravitoHandler` | Simplified (no `next`) |
| `MiddlewareHandler` | `GravitoMiddleware` | With `GravitoNext` |
| `Next` | `GravitoNext` | Async function |

### Exported from `gravito-core`

- `GravitoContext`, `GravitoRequest`, `GravitoHandler`, `GravitoMiddleware`
- `GravitoVariables`, `GravitoNext`, `GravitoErrorHandler`, `GravitoNotFoundHandler`
- `HttpAdapter`, `PhotonAdapter`, `PhotonContextWrapper`, `PhotonRequestWrapper`
- `HttpMethod`, `StatusCode`, `ContentfulStatusCode`, `ValidationTarget`

---

## Phase 2: Internal Migration [Complete]

**Status**: Complete (2025-12-21)

### Completed Tasks [Complete]

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

- [ ] **2.2** Update `GravitoRouter.ts` to use `GravitoHandler` types (optional, works as-is)
- [ ] **2.3** Update `CookieJar.ts` to work with `GravitoContext` (optional, Photon-coupled for now)
- [ ] **2.5** Update helper functions in `helpers/response.ts` (optional)

---

## Phase 3: Documentation & User Migration [Complete]

**Status**: Complete (2025-12-21)

### Completed Tasks [Complete]

- [x] **3.1** Update official documentation
  - `core-concepts.md` - Added HTTP abstraction pillar, updated examples
  - `routing.md` - Migrated all examples to GravitoContext
- [x] **3.2** Create migration guide
  - English: `docs/en/guide/migration-http-abstraction.md`
  - Chinese: `docs/zh/guide/migration-http-abstraction.md`
- [x] **3.6** Update templates (`basic`, `inertia-react`)
  - HomeController, ApiController migrated to GravitoContext
  - routes/index.ts uses GravitoContext and GravitoNext

### Deferred Tasks

- [ ] **3.3** Add deprecation warnings for direct Photon imports (optional)
- [ ] **3.4** Create codemod tool for automatic migration (future)
- [ ] **3.5** Update all example projects (1.5-example needs review)

---

## Phase 4: Custom Bun-Native Adapter (Future)

**Status**: Planned

### Goals

- Eliminate Photon adapter overhead completely
- Leverage Bun's native `Bun.serve()` directly
- Implement trie-based router optimized for Bun
- Maximum performance with minimal abstraction

### Proposed Architecture

```
PhotonAdapter
├── PhotonRouter (custom trie router)
├── PhotonContext (direct Request/Response)
└── PhotonMiddlewarePipeline
```

---

## Usage Examples

### Current (Photon-coupled)

```typescript
// Controller
import type { PhotonContext } from '@gravito/photon'

export class UserController {
  async show(ctx: PhotonContext) {
    const id = ctx.req.param('id')
    return ctx.json({ user: await User.find(id) })
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
3. **E2E Tests** - Run existing test suite with PhotonAdapter
4. **Benchmark Tests** - Compare performance before/after

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes | Maintain backward compat aliases |
| Performance regression | Benchmark before/after |
| Missing Photon features | Document escape hatches via `ctx.native` |
| Orbit module compatibility | Update each orbit incrementally |

---

## Timeline

| Phase | Estimated Duration | Dependencies |
|-------|-------------------|--------------|
| Phase 1 | [Complete] Complete | None |
| Phase 2 | 2-3 days | Phase 1 |
| Phase 3 | 1-2 days | Phase 2 |
| Phase 4 | TBD | Phases 1-3, Bun research |

---

## Changelog

- **2025-12-21**: Phase 3 complete - Documentation & templates
  - Updated `core-concepts.md` and `routing.md` with GravitoContext
  - Created Chinese migration guide
  - Updated `basic` and `inertia-react` templates
- **2025-12-21**: Phase 2 complete - PlanetCore adapter integration
  - Added `_adapter` property to PlanetCore
  - `app` is now a getter returning `adapter.native`
  - All Kinetic modules have GravitoVariables augmentation
  - Migration guide created at `docs/en/guide/migration-http-abstraction.md`
- **2025-12-21**: Phase 1 complete - Created abstraction layer
