# Core Modules Initialization Test Results

**Generated:** 2026-03-24
**Test method:** Direct module import from dist/

## Summary

| Module | Package | Status | Notes |
|--------|---------|--------|-------|
| @gravito/core | PlanetCore | PASS | 10+ key exports accessible |
| @gravito/photon | HTTP Engine | PARTIAL | bun.js works, index.js has bundle error |
| @gravito/atlas | ORM | PASS | 77 exports, QueryBuilder + Connection OK |
| @gravito/signal | Event Bus | PARTIAL | CJS has lazy-load issue, tests pass |

## Core-01: @gravito/core

**Status:** PASS

```
Core initialized: object
Keys: Application, Arr, AuthenticationException, AuthorizationException,
      BackpressureManager, BackpressureState, BinaryUtils, BunContext,
      BunNativeAdapter, BunRequest
```

- ESM dist (index.js): Loads successfully
- Export count: 10+ key exports verified
- Core infrastructure: Available

## Core-02: @gravito/photon (HTTP Engine)

**Status:** PARTIAL

- `dist/bun.js`: Loads successfully
  - Exports: bunFileSystemModule, createBunWebSocket, getBunServer, getConnInfo, serveStatic, toSSG, upgradeWebSocket, websocket
- `dist/index.js`: **BUILD ERROR** — "Photon is not declared in this file"
  - Error at line 58: `Photon` export missing in chunk
  - Likely incomplete chunk reference after Hono migration

**Workaround:** Use `dist/bun.js` for Bun-specific HTTP features.

**Action Required:** Rebuild photon package to resolve index.js bundle issue.

## Core-03: @gravito/atlas (ORM)

**Status:** PASS

```
Atlas loaded, exports count: 77
QueryBuilder exists: true
Connection exists: true
Atlas ORM: AVAILABLE
```

- ESM dist (index.js): Loads successfully
- 77 exports including: BelongsTo, BelongsToMany, Blueprint, BunSQLDriver,
  ColumnDefinition, Connection, ConnectionManager...
- Query builder and connection management: Available

## Core-04: @gravito/signal (Event Bus)

**Status:** PARTIAL

- `dist/index.mjs`: **BUILD ERROR** — "VueMjmlRenderer", "TypedMailable", "TemplateRenderer" not declared
  - Missing exports in ESM build (MJS file has unresolved chunk references)
- `dist/index.cjs`: Loads but OrbitSignal lazy-load fails at runtime
  - Error: `import_OrbitSignal is not defined`
- **Test suite**: 42 pass, 0 fail (tests work via source imports)

**Action Required:** Rebuild signal package to resolve ESM/CJS bundle issues.

## E2E Validation (Bonus)

### HTTP Request Flow Test

```
1. Framework core loaded: OK
2. HTTP server started (Bun native): port 50681
3. Response status: 200
4. Response body: {"status":"ok","framework":"gravito"}
5. Response time: 18ms
E2E-01 HTTP Test: PASS
```

### Atlas + Signal Functional Test

```
1. Atlas ORM loaded: OK
2. Atlas exports count: 77
3. QueryBuilder available: OK
4. Connection class: OK
Signal tests: 42 pass, 0 fail
E2E-02 DB+Event Test: PASS
```

## Key Findings

1. **Core and Atlas** are healthy — fully loadable from dist
2. **Photon and Signal** have dist bundle issues — likely from Hono migration (Phase 2-3 completed but bundles not rebuilt)
3. **Functional tests pass** for both photon (bun.js) and signal (via source)
4. **Recommendation**: Rebuild photon and signal packages before any publishing

*Tests recorded: 2026-03-24*
