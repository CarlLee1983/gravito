# 測試策略與覆蓋率提升

> 優先級：中
> 目標覆蓋率：85%+
> 預估工作量：3-4 天

---

## 現況分析

| 測試類型 | 現況 | 目標 |
|----------|------|------|
| 單元測試 | 50+ 個 | 50+ 個 |
| 整合測試 | 15+ 個 | 15+ 個 |
| 效能測試 | 0 個 | 5+ 個 |
| 覆蓋率 | ~80% | 85%+ |

### 現有測試覆蓋

- ✓ 基本 CRUD 操作
- ✓ 過期處理和 TTL
- ✓ 事件系統
- ✓ 標籤支持
- ✓ FileStore - 穩定性與原子寫入測試
- ✓ RedisStore - 標籤系統與分散式鎖原子性測試
- ✓ 競態條件測試 (鎖、Flexible 快取)
- ✓ 高並發測試 (Semaphore 限制)

---

## 測試計劃

### 1. 單元測試補充 (已完成)

#### RedisStore 測試 ✅
- `redis-store-tags.test.ts`: 驗證標籤清理與過期處理
- `redis-store-locks.test.ts`: 驗證鎖原子性與自動續期
- `rate-limiter-ttl.test.ts`: 驗證 Redis TTL 精準讀取

#### FileStore 測試 ✅
- `file-store-stability.test.ts`: 驗證原子寫入與背景清理
- `rate-limiter-ttl.test.ts`: 驗證檔案系統 TTL 計算

#### MemoryStore 測試 ✅
- `memory-store-stats.test.ts`: 驗證 LRU 驅逐與統計功能
- `flexible-cache.test.ts`: 驗證 SWR 行為與 Semaphore 限制

---

## 實作步驟

### 第一階段：基礎測試

1. [ ] 設定測試覆蓋率閾值
2. [x] 補充 RedisStore 單元測試
3. [x] 補充 FileStore 單元測試
4. [x] 補充 MemoryStore 單元測試

### 第二階段：整合測試

5. [x] 設定 Redis 測試環境
6. [x] 新增 Redis 整合測試
7. [x] 新增多存儲整合測試

### 第三階段：進階測試

8. [x] 新增競態條件測試
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
