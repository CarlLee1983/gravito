# @gravito/atlas

## 2.1.0

### Minor Changes

- **perf: Bun 1.3.9 Native Optimization**: Leveraged native `Bun.sql` features for extreme performance.
  - **Native `values()`**: Implemented `values()` method to fetch raw arrays, eliminating object mapping overhead for aggregates and `pluck()`.
  - **Native Streaming**: Refactored `stream()` to use true `AsyncIterable` from the Bun kernel.
  - **Native Transactions**: Added support for native transaction closures via `runTransaction()`, improving connection safety and performance.
- **test: Enhanced Coverage**: Added comprehensive unit tests for native transactions and streaming.

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
