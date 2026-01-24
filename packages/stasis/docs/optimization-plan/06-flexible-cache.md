# Flexible 快取邏輯優化

> 優先級：低
> 影響範圍：CacheRepository
> 預估工作量：1-2 天

---

## 問題描述

### 背景刷新競爭

Flexible 快取（Stale-While-Revalidate）的刷新在背景使用鎖，但可能產生多次競爭。

```typescript
async flexible<T>(
  key: string,
  ttl: CacheTtl,
  stale: CacheTtl,
  callback: () => Promise<T>
): Promise<T> {
  const cached = await this.get<{ value: T; refreshAt: number }>(key)

  if (cached) {
    if (Date.now() < cached.refreshAt) {
      return cached.value
    }
    // 背景刷新 - 可能有多個程序同時執行
    this.refreshInBackground(key, ttl, stale, callback)
    return cached.value
  }

  return this.fetchAndCache(key, ttl, stale, callback)
}
```

**問題**：
- 刷新無超時控制
- 多程序可能同時刷新
- 無法配置重試策略

---

## 優化方案

### 信號量限制並發刷新

```typescript
class CacheRepository {
  private refreshSemaphore: Map<string, Promise<void>> = new Map()

  private async refreshInBackground<T>(
    key: string,
    ttl: CacheTtl,
    stale: CacheTtl,
    callback: () => Promise<T>
  ): Promise<void> {
    // 如果已經在刷新，不重複執行
    if (this.refreshSemaphore.has(key)) return

    const refreshPromise = this.doRefresh(key, ttl, stale, callback)
    this.refreshSemaphore.set(key, refreshPromise)

    try {
      await refreshPromise
    } finally {
      this.refreshSemaphore.delete(key)
    }
  }

  private async doRefresh<T>(
    key: string,
    ttl: CacheTtl,
    stale: CacheTtl,
    callback: () => Promise<T>
  ): Promise<void> {
    const lock = this.lock(`refresh:${key}`, 30)

    if (!(await lock.acquire())) return

    try {
      const value = await Promise.race([
        callback(),
        sleep(this.options.refreshTimeout ?? 30000).then(() => {
          throw new Error('Refresh timeout')
        }),
      ])
      await this.putFlexible(key, value, ttl, stale)
    } finally {
      await lock.release()
    }
  }
}
```

### 配置選項

```typescript
interface FlexibleOptions {
  refreshTimeout?: number    // 刷新超時（毫秒），預設: 30000
  maxRetries?: number        // 最大重試次數，預設: 0
  retryDelay?: number        // 重試延遲（毫秒），預設: 1000
}
```

### 刷新統計

```typescript
interface FlexibleStats {
  refreshCount: number
  refreshFailures: number
  avgRefreshTime: number
}

class CacheRepository {
  private flexibleStats = { refreshCount: 0, refreshFailures: 0, totalTime: 0 }

  getFlexibleStats(): FlexibleStats {
    return {
      refreshCount: this.flexibleStats.refreshCount,
      refreshFailures: this.flexibleStats.refreshFailures,
      avgRefreshTime: this.flexibleStats.refreshCount > 0
        ? this.flexibleStats.totalTime / this.flexibleStats.refreshCount
        : 0,
    }
  }
}
```

---

## 實作步驟

1. [ ] 實作信號量限制
2. [ ] 新增刷新超時控制
3. [ ] 新增重試策略
4. [ ] 新增刷新統計
5. [ ] 測試並發刷新行為
