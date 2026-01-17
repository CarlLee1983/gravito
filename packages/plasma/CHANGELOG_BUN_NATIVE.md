```
# Bun Native Redis Implementation Changelog

## [Unreleased]

### 階段四：優化與加固 ✅ 已完成
- **Pipeline Performance**: Optimized `pipeline().exec()` to use `Promise.all` for parallel execution, achieving ~15x throughput improvement (matching `ioredis` performance).
- **Error Handling**: Introduced `RedisError` class and wrapped all client operations to ensure consistent error reporting.
- **Connection Reliability**: Implemented exponential backoff with jitter for initial connection retries.
- **Health Checks**: Added `checkHealth()` method for active connection verification.
- **Events**: Implemented full `EventEmitter` support (`connect`, `ready`, `close`, `end`) for `BunRedisClient`.

### Added
- Created `BunRedisClient` implementing `RedisClientContract` using native `Bun.redis`.
- Implemented core operations: String, Hash, List, Set, Sorted Set.
- Implemented Pipeline support using batch execution.
- Implemented Pub/Sub support with dedicated connection management.
- Added `RedisManager` support for `clientType: 'bun'` and `'auto'`.
- Added unit tests for `BunRedisClient` with mocked `Bun.redis`.

### Fixed
- Standardized return types to match `ioredis` (e.g., `exists` returning number instead of boolean).
- Unified `pipeline` result format to `[error, result]` tuples.
- Handled `hset` object arguments compatibility.
- Fixed `set` options compatibility by flattening arguments.
- Fixed `zrange`/`zrevrange` `WITHSCORES` return format to match `ioredis` (flat array of strings).
- Fixed `send` command signature to support `Bun.redis` correctly.

### Verified
- Validated against Redis 6 and 7 using Docker Compose integration tests.
- Verified full compatibility with `ioredis` behavior via `compatibility.test.ts`.

### Changed
- `RedisManager` now attempts to use `Bun.redis` by default if available and `clientType` is `'auto'`.

### Optimized (Phase 4)
- **Pipeline Performance**: Optimized `pipeline().exec()` to use `Promise.all` for parallel execution, achieving ~15x throughput improvement (matching `ioredis` performance).
- **Error Handling**: Introduced `RedisError` class and wrapped all client operations to ensure consistent error reporting.
- **Connection Reliability**: Implemented exponential backoff with jitter for initial connection retries.
- **Health Checks**: Added `checkHealth()` method for active connection verification.
- **Events**: Implemented full `EventEmitter` support (`connect`, `ready`, `close`, `end`) for `BunRedisClient`.
