# @gravito/atlas

## 2.1.1

### Documentation Improvements

- **Comprehensive JSDoc Enhancement**: Added detailed JSDoc documentation across the entire `@packages/atlas` codebase.
  - **Core ORM**: Detailed documentation for `Model` class and all mixins (`HasAttributes`, `HasRelationships`, etc.) with usage examples.
  - **Query Builder**: Improved JSDoc for `QueryBuilder` and all clause implementations, including complex where/join examples.
  - **Type Safety**: Fully documented central types and contracts in `types/index.ts` to provide superior IDE IntelliSense.
  - **Database Layer**: Added documentation for `DB` facade, `Connection` management, database `Drivers`, and SQL `Grammars`.
  - **Schema & Migrations**: Enhanced JSDoc for `Schema`, `Blueprint`, and `Migrator` tools.

## 2.1.0

### Minor Changes

- 修復 TypeScript 類型錯誤、CI 類型檢查問題，並完成性能優化和 DX 改進

## 2.0.0

### Major Changes

This release includes significant performance improvements and developer experience enhancements.

#### 🚀 Performance Optimizations

- **Model Hydration**: ↑300-500% faster with optimized Proxy caching

  - Added accessor/mutator cache to reduce prototype chain traversal
  - Added relationship metadata cache
  - Optimized Proxy handler for better performance

- **DirtyTracker**: ↑50x faster with shallow comparison optimization

  - Default to shallow comparison for better performance
  - Added optional `setDeepComparison(true)` for deep nested object tracking
  - Optimized Date, Array, and Object comparison logic

- **Query Compilation**: ↑50-100% faster with LRU cache

  - Added static LRU cache for compiled SQL queries (80%+ hit rate)
  - Configurable cache size via `Grammar.setCacheSize()`
  - Cache statistics via `Grammar.getCacheStats()`
  - Support for global and instance-level cache scopes

- **QueryBuilder Clone**: Optimized for independent query building

  - Improved clone performance for pagination and query reuse
  - Ensures true independence from original query

- **Eager Loading**: ↓60-80% memory reduction for large datasets

  - Batch eager loading optimization
  - Chunked loading support (enabled by default)

- **Memory Usage**: ↓40-60% reduction for large datasets
  - Optimized batch hydration
  - Improved memory recycling

#### 🎯 Developer Experience Improvements

- **Better Error Messages**: "Did you mean?" suggestions for typos

  - Uses Levenshtein distance algorithm
  - Shows available column/field suggestions

- **Debug Tools**: New debugging utilities

  - `DB.debug()` - Enable/disable debug mode
  - `DB.getQueryLog()` - Get all executed queries
  - `DB.getLastQuery()` - Get the last executed query

- **Type Safety**: Improved TypeScript types

  - Reduced `any` usage significantly
  - Better type inference
  - Improved type coverage

- **Configuration Options**: Enhanced configuration flexibility
  - Environment variable support (`DB.configureFromEnv()`)
  - Configuration file support (`DB.configureFromFile()`)
  - Support for `DATABASE_URL` and individual `DB_*` variables

#### 🔧 Advanced Features

- **Prepared Statements**: Support for PostgreSQL prepared statements

  - `QueryBuilder.getPrepared()` method
  - Automatic prepared statement caching

- **Attribute Casting Pre-compilation**: Faster attribute type conversion

  - Pre-compiled caster functions
  - Reduced switch statement overhead

- **Batch Hydration**: Optimized for large datasets

  - `Model.hydrateMany()` static method
  - Reduced metadata lookup overhead

- **Connection Management**: Improved resource cleanup
  - Enhanced `Connection.disconnect()` with transaction handling
  - Better error handling for resource cleanup

#### ⚠️ Breaking Changes

- **DirtyTracker**: Now uses shallow comparison by default

  - Deep nested object mutations require `setDeepComparison(true)`
  - Use object spread for nested updates: `user.settings = { ...user.settings, theme: 'dark' }`

- **Grammar Cache**: Now uses global cache by default

  - Multi-tenant applications should set `Grammar.cacheScope = 'instance'`
  - Prevents SQL cache pollution across tenants

- **Eager Loading**: Chunking enabled by default
  - Loading order may change
  - Use `setEagerLoadChunking(false)` to disable if needed

#### 📚 Documentation

- Added comprehensive upgrade guide
- Added performance optimization documentation
- Added debugging and monitoring examples
- Enhanced README with new features

#### 🧪 Testing

- All 322 tests passing
- Comprehensive regression test suite
- Performance benchmarks included

---

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
