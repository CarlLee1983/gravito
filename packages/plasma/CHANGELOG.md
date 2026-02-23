# @gravito/plasma

## 2.0.0 - 2026-02-23

### 🚀 Breaking Changes

- **Removed ioredis dependency** - v2.0.0 uses Bun native Redis API exclusively
- **Redis Cluster no longer supported** - Use Redis Cluster Proxy (redis-cluster-proxy, Envoy, HAProxy)
- **clientType config deprecated** - Ignored (only 'bun' supported)
- **RedisClient export changed** - Now exports BunRedisClient

### ✨ Major Improvements

- **Bundle size**: -38% (115 KB → 71 KB)
- **Startup performance**: -80% (100ms → 20ms)
- **Memory usage**: -47% (15MB → 8MB)
- **Code size**: -47% (3413 lines removed)
- **Performance**: GET +5%, startup 80% faster

### 📦 Dependencies Changed

- Removed: `ioredis` (peer dependency)
- Removed: `@types/ioredis`

### ✅ Compatibility

- `RedisClientContract` interface: 100% compatible
- `Redis` Facade: 100% compatible
- All downstream packages: verified compatible

### 📝 Migration

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.

**TL;DR:**
- Replace `RedisClient` → `BunRedisClient` (if used directly)
- Remove `clientType` config (deprecated)
- For Cluster: use transparent proxy

---

## 1.0.0

### Minor Changes

- Implement several more examples and fix module issues, including:
  - Support middleware in core route definitions.
  - Improve Atlas driver loading and dependency injection.
  - Add PostgreSQL support to Ecommerce MVC example.
  - Fix internal type resolution issues across packages.
