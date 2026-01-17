# Bun Native Redis Implementation Changelog

## [Unreleased]

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

### Changed
- `RedisManager` now attempts to use `Bun.redis` by default if available and `clientType` is `'auto'`.
