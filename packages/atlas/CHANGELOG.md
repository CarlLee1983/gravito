# @gravito/atlas

## 2.6.0

### Minor Changes

- **BREAKING: Redis/MongoDB transaction methods now throw** instead of being silent no-ops. Use `getRawClient()` for native transaction support.

### Bug Fixes (29 fixes across 3 severity levels)

#### CRITICAL (10)
- **fix: QueryBuilder `first()`/`value()`/`pluck()` no longer mutate builder state** — use internal `clone()` to prevent side effects on reuse
- **fix: `runWithAutoProvisioning` recursion depth limit** — prevents stack overflow with max 3 retries
- **fix: `MutationBuilder.update` no longer mutates `CompiledQuery.bindings`** — uses spread to create new object
- **fix: ORM `_attributes` immutability** — replaced all `Object.assign` with spread in `HasPersistence`
- **fix: `MAX(pk)` race condition removed** — replaced with `LAST_INSERT_ID()` / `currval()` per driver
- **fix: Unified 3 diverging cast implementations** into single `TypeCaster` source of truth; fixed `setAttribute` cast-before-mark order
- **fix: BunSQL PreparedStatement hash collision** — replaced djb2 hash with monotonic counter
- **fix: MongoDB `mapDocument` immutability** — returns new object via spread
- **fix: `disconnect()` now cleans up replica pool connections** — prevents TCP connection leaks
- **fix: `DB._reset()` now clears all static state** — prevents test pollution

#### HIGH (10)
- **fix: `PaginationBuilder.paginate()` no longer mutates builder** — uses `clone()`
- **fix: `WhereClause.clone()` recursive deep copy** for nested conditions
- **chore: Deleted unused `SubqueryBuilder` dead code** (125 lines removed)
- **fix: `NPlusOneDetector` bounded memory** — MAX_ENTRIES=500 with stale eviction
- **fix: `Repository.update()` uses `fill()`** instead of `Object.assign` to ensure Proxy/casting
- **fix: `_studlyCache` gradual eviction** — evicts oldest 25% instead of full clear
- **fix: Redis/MongoDB transaction methods throw** descriptive errors instead of silent no-ops
- **fix: SQLite drivers only call `last_insert_rowid()` after INSERT** — eliminates redundant query on SELECT
- **fix: `PostgresGrammar` uses `compileBaseInsert()`** instead of fragile `.replace()` for RETURNING
- **fix: Removed redundant Proxy from `Connection` constructor** — single Proxy in `ConnectionManager`

#### MEDIUM (9)
- **fix: `orderByRaw` no longer forces `ASC` direction** — raw expressions output as-is
- **fix: `SelectClause.addRaw()` clears default `*`** — prevents `SELECT *, expr`
- **fix: `crossJoin` omits ON clause** — produces valid `CROSS JOIN "table"`
- **fix: `DirtyTracker` always uses deep comparison for arrays** — prevents false dirty on JSON/JSONB columns
- **fix: Grammar cache key includes `unions`** — prevents cache collision for UNION queries
- **fix: `SchemaSniffer` validates table names** — prevents PRAGMA SQL injection
- **fix: `chunk()` uses `limit/offset` directly** — eliminates redundant `COUNT(*)` per page
- **fix: `transactionWithRetry` preserves error cause** — original error available via `error.cause`
- **fix: `PoolHealthChecker` guards against `stats.max=0`** — prevents NaN from division by zero

## 2.5.3

### Patch Changes

- Stability and performance improvements.

## 2.4.0

### Minor Changes

- **feat: PostgreSQL & Bun Native Driver Refactoring**: Major stability and performance overhaul for PostgreSQL connections and Bun native SQL integration.
  - **PostgreSQL Stability**: Implemented instant connection verification during boot, improved SSL handling for cloud databases (Supabase, RDS), and migrated to native prepared statement pooling.
  - **Bun.sql 1.1+ Alignment**: Completely refactored `BunSQLDriver` to use native object-based configuration and high-performance `client.unsafe()` query path.
  - **Dialect Compatibility**: Fixed boolean binding issues in PostgreSQL and date formatting requirements for MySQL/MariaDB when using native drivers.
  - **Performance**: Native PostgreSQL throughput increased by ~2.4x via optimized driver internals.

## 2.3.0

### Minor Changes

- **chore: Core Cleanup & Zero-Dependency Optimization**: Finalized the transition to a native-first architecture.
  - **Redundant Code Removal**: Deleted legacy utility files (`SQLCache.ts`, `applyMixins.ts`) to reduce internal footprint.
  - **Zero-Dep Documentation**: Updated guides to highlight that `pg`, `mysql2`, and `better-sqlite3` are now 100% optional in Bun 1.3.9+ environments.
  - **Full Native Integration**: Completed validation of `values()`, `stream()`, and `transaction()` across all supported SQL dialects in Bun.

## 2.2.0

### Minor Changes

- **perf: Bun 1.3.9 Native Optimization**: (Previous release) Leveraged native `Bun.sql` features for extreme performance.

## 2.1.0

### Minor Changes

- **feat: Bun Native SQL enhancements**: (Previous 2.1.0 release)

## 2.0.0

### Major Changes

- **Breaking: Modular Type System**: Refactored monolithic type definitions into composable modules.
- **Breaking: specialized Query Builders**: Split QueryBuilder into concern-based sub-builders (Aggregate, Mutation, Pagination).
- **feat: Tree-shaking**: Enabled `sideEffects: false` for significantly smaller production bundles.

## 1.3.0

### Minor Changes

- **feat: Native Bun.sql support**: Added `BunSQLDriver` to leverage Bun 1.3's unified SQL API for PostgreSQL, MySQL, and SQLite.
- **fix: Grammar cache bug**: Fixed a critical issue where `LIMIT` and `OFFSET` values were not included in the SQL compilation cache key, causing pagination to return incorrect results.
- **perf: Stability improvements**: Added safety locks to `Model.cursor()` to prevent infinite loops and improved memory recycling during streaming.

## 1.2.0

### Minor Changes

- Implement several more examples and fix module issues, including:
  - Support middleware in core route definitions.
  - Improve Atlas driver loading and dependency injection.
  - Add PostgreSQL support to Ecommerce MVC example.
  - Fix internal type resolution issues across packages.

## 1.0.1

### Patch Changes

- Improve database grammar, core runtime types, and scaffolding generators.

## 1.0.0

### Patch Changes

- bc76ff3: feat: introduce Spectrum debug dashboard
  feat: add global query listeners to Atlas connection
