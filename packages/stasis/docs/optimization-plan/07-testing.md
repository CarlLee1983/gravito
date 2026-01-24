# 測試策略與覆蓋率提升

> 優先級：中
> 目標覆蓋率：85%+
> 預估工作量：3-4 天

---

## 現況分析

| 測試類型 | 現況 | 目標 |
|----------|------|------|
| 單元測試 | 22 個 | 50+ 個 |
| 整合測試 | 0 個 | 15+ 個 |
| 效能測試 | 0 個 | 5+ 個 |
| 覆蓋率 | ~60% | 85%+ |

### 現有測試覆蓋

- ✓ 基本 CRUD 操作
- ✓ 過期處理和 TTL
- ✓ 事件系統
- ✓ 標籤支持
- △ FileStore - 有限覆蓋
- △ RedisStore - 僅工廠測試
- ✗ 競態條件測試
- ✗ 高並發測試

---

## 測試計劃

### 1. 單元測試補充

#### RedisStore 測試

```typescript
describe('RedisStore', () => {
  describe('Tag Operations', () => {
    it('should add keys to tag index')
    it('should remove keys from tag index on forget')
    it('should flush all keys for a tag')
    it('should handle tag cleanup for expired keys')
  })

  describe('Lock Operations', () => {
    it('should acquire lock atomically')
    it('should release only own lock')
    it('should extend lock TTL')
    it('should timeout on block')
  })

  describe('TTL Operations', () => {
    it('should return remaining TTL')
    it('should return null for non-existent key')
    it('should return null for expired key')
  })
})
```

#### FileStore 測試

```typescript
describe('FileStore', () => {
  describe('Cleanup', () => {
    it('should clean expired files')
    it('should respect maxFiles limit')
    it('should not clean unexpired files')
  })

  describe('Atomic Write', () => {
    it('should not leave partial files on error')
    it('should handle concurrent writes')
  })

  describe('Lock Zombie Detection', () => {
    it('should acquire stale lock from dead process')
    it('should not acquire valid lock from live process')
  })
})
```

#### MemoryStore 測試

```typescript
describe('MemoryStore', () => {
  describe('LRU Eviction', () => {
    it('should evict least recently used item')
    it('should update access order on get')
    it('should not exceed maxItems')
  })

  describe('Stats', () => {
    it('should track hit rate accurately')
    it('should track eviction count')
    it('should estimate memory usage')
  })
})
```

### 2. 整合測試

```typescript
describe('Integration Tests', () => {
  describe('Redis Integration', () => {
    beforeAll(async () => {
      // 連接真實 Redis
      await redis.connect()
    })

    it('should handle high concurrency tag operations')
    it('should handle distributed lock across processes')
    it('should handle connection failures gracefully')
  })

  describe('Multi-Store', () => {
    it('should switch between stores correctly')
    it('should handle store-specific features')
  })
})
```

### 3. 競態條件測試

```typescript
describe('Race Conditions', () => {
  it('should handle concurrent put operations', async () => {
    const store = new MemoryStore({ maxItems: 100 })
    const promises = Array.from({ length: 100 }, (_, i) =>
      store.put(`key-${i % 10}`, i, 3600)
    )
    await Promise.all(promises)
    // 驗證資料一致性
  })

  it('should handle concurrent lock acquisitions', async () => {
    const store = new RedisStore({ connection: 'test' })
    const results: boolean[] = []
    const promises = Array.from({ length: 10 }, async () => {
      const lock = store.lock('resource', 10)
      results.push(await lock.acquire())
    })
    await Promise.all(promises)
    expect(results.filter(Boolean).length).toBe(1)
  })
})
```

### 4. 效能測試

```typescript
describe('Performance Benchmarks', () => {
  bench('MemoryStore get (hit)', async () => {
    await store.get('key-5000')
  })

  bench('MemoryStore put with eviction', async () => {
    await store.put(`new-${Date.now()}`, { data: 'new' }, 3600)
  })

  bench('RedisStore get', async () => {
    await redisStore.get('key')
  })

  bench('FileStore get', async () => {
    await fileStore.get('key')
  })
})
```

---

## 測試工具設定

### Vitest 配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
```

### Mock 策略

```typescript
// mocks/redis.ts
export const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  eval: vi.fn(),
  pipeline: vi.fn(() => ({
    exec: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
  })),
}
```

---

## 實作步驟

### 第一階段：基礎測試

1. [ ] 設定測試覆蓋率閾值
2. [ ] 補充 RedisStore 單元測試
3. [ ] 補充 FileStore 單元測試
4. [ ] 補充 MemoryStore 單元測試

### 第二階段：整合測試

5. [ ] 設定 Redis 測試環境
6. [ ] 新增 Redis 整合測試
7. [ ] 新增多存儲整合測試

### 第三階段：進階測試

8. [ ] 新增競態條件測試
9. [ ] 新增效能基準測試
10. [ ] 新增記憶體洩漏測試

---

## CI/CD 整合

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  services:
    redis:
      image: redis:7
      ports:
        - 6379:6379
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v1
    - run: bun install
    - run: bun test --coverage
    - uses: codecov/codecov-action@v4
```
