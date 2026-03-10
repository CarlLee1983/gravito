# @gravito/atlas

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
