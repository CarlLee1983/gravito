# Gravito Migration Guide

This guide helps you migrate from deprecated APIs to their modern equivalents.

## Table of Contents

- [Signal: Queueable Type](#signal-queueable-type)
- [Atlas: Grammar compileWhere](#atlas-grammar-compilewhere)
- [Beam: Old API](#beam-old-api)
- [Cosmos: Old Export](#cosmos-old-export)
- [Stasis: CacheStorageProvider](#stasis-cachestorageprovider)
- [Core: ctx.matchedRoute](#core-ctxmatchedroute)
- [Core: PlanetCore Direct Properties](#core-planetcore-direct-properties)
- [Nebula: Old Options](#nebula-old-options)

---

## Signal: Queueable Type

**Deprecated Location**: `@gravito/signal/Queueable.ts:7`

### What Changed

The `Queueable` type has been moved from `@gravito/signal` to `@gravito/stream`.

### Migration

```typescript
// Before
import { Queueable } from '@gravito/signal'

// After
import { Queueable } from '@gravito/stream'
```

**Timeline**: No removal date set

---

## Atlas: Grammar compileWhere

**Deprecated Location**: `packages/atlas/Grammar.ts:205`

### What Changed

The `compileWhere` method has been replaced with `compileWhereWithOffset` for better performance and clarity.

### Migration

```typescript
// Before
const sql = grammar.compileWhere(query)

// After
const sql = grammar.compileWhereWithOffset(query, offset)
```

**Timeline**: No removal date set

---

## Beam: Old API

**Deprecated Location**: `packages/beam/index.ts:81`

### What Changed

The old Beam API has been replaced with a new `createBeam` function.

### Migration

```typescript
// Before (old API)
import Beam from '@gravito/beam'
const beam = new Beam(config)

// After
import { createBeam } from '@gravito/beam'
const beam = createBeam(config)
```

**Timeline**: No removal date set

---

## Cosmos: Old Export

**Deprecated Location**: `packages/cosmos/index.ts:34`

### What Changed

The default export has been replaced with the named export `OrbitCosmos`.

### Migration

```typescript
// Before
import Cosmos from '@gravito/cosmos'

// After
import { OrbitCosmos } from '@gravito/cosmos'
```

**Removal Timeline**: v4.0.0

---

## Stasis: CacheStorageProvider

**Deprecated Locations**:
- `packages/stasis/index.ts:33`
- `packages/stasis/index.ts:274`

### What Changed

`CacheStorageProvider` has been split into two separate concepts:
1. `CacheStorage` - For storage implementations
2. `OrbitStasis` - For the orbit/plugin integration

### Migration

```typescript
// Before
import { CacheStorageProvider } from '@gravito/stasis'
const provider = new CacheStorageProvider(config)

// After
import { CacheStorage, OrbitStasis } from '@gravito/stasis'
const storage = new CacheStorage(config)
const orbit = new OrbitStasis(storage)

// Or use the default storage
import { OrbitStasis } from '@gravito/stasis'
const orbit = new OrbitStasis()
```

**Timeline**: No removal date set

---

## Core: ctx.matchedRoute

**Deprecated Location**: `packages/core/types.ts:82`

### What Changed

The `ctx.matchedRoute` property has been replaced with the `ctx.route()` method for better encapsulation.

### Migration

```typescript
// Before
const route = ctx.matchedRoute

// After
const route = ctx.route()
```

**Timeline**: No removal date set

---

## Core: PlanetCore Direct Properties

**Deprecated Locations**:
- `packages/core/PlanetCore.ts:98`
- `packages/core/PlanetCore.ts:118`

### What Changed

Direct property access on PlanetCore has been replaced with adapter methods and container access for better separation of concerns.

### Migration

```typescript
// Before
const router = core.router
const middleware = core.middleware

// After
const router = core.adapter.router()
const middleware = core.container.make('middleware')
```

**Timeline**: No removal date set

---

## Nebula: Old Options

**Deprecated Locations**:
- `packages/nebula/index.ts:124`
- `packages/nebula/index.ts:245`

### What Changed

The old options format has been replaced with `OrbitNebulaOptions` and the old class name with `OrbitNebula`.

### Migration

```typescript
// Before
import Nebula from '@gravito/nebula'
const nebula = new Nebula({ /* old options */ })

// After
import { OrbitNebula, OrbitNebulaOptions } from '@gravito/nebula'
const config: OrbitNebulaOptions = { /* new options */ }
const nebula = new OrbitNebula(config)
```

**Timeline**: No removal date set

---

## Deprecation Policy

Gravito follows semantic versioning (semver) for deprecations:

1. **Deprecation Announcement**: APIs are marked as `@deprecated` with migration guidance
2. **Deprecation Period**: Deprecated APIs remain functional for at least one major version
3. **Removal**: Deprecated APIs are removed in the next major version (unless specified otherwise)

### Checking for Deprecations

You can check for deprecations in your codebase using your TypeScript IDE or ESLint:

```bash
# Using TypeScript compiler
bun tsc --noEmit --diagnostics

# Using grep to find @deprecated usage
grep -r "@deprecated" node_modules/@gravito
```

---

## Need Help?

- **Documentation**: https://gravito.dev/docs
- **GitHub Issues**: https://github.com/gravito-framework/gravito/issues
- **Discord**: https://discord.gg/gravito

---

**Last Updated**: 2026-01-16
**Version**: 3.0.0
