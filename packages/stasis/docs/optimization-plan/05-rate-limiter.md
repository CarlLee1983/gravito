# RateLimiter TTL 精度改進

> 優先級：中
> 影響範圍：RateLimiter、CacheStore 介面
> 預估工作量：1-2 天

---

## 問題描述

RateLimiter 無法讀取實際的 TTL，使用 `decaySeconds` 近似重置時間。

```typescript
async availableIn(key: string): Promise<number> {
  // 無法讀取實際 TTL，總是返回 decaySeconds
  return this.decaySeconds
}
```

**問題**：使用者看到的「重試等待時間」不準確。

---

## 優化方案

### 存儲介面擴展

```typescript
export interface CacheStore {
  // 新增：可選的 TTL 查詢
  ttl?(key: string): Promise<number | null>
}
```

#### RedisStore 實作

```typescript
async ttl(key: string): Promise<number | null> {
  const client = await this.plasma.connect(this.connection)
  const result = await client.ttl(this.prefixedKey(key))
  return result < 0 ? null : result
}
```

#### MemoryStore 實作

```typescript
async ttl(key: string): Promise<number | null> {
  const entry = this.cache.get(key)
  if (!entry || entry.expiresAt === null) return null
  const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000)
  return remaining > 0 ? remaining : null
}
```

### RateLimiter 改進

```typescript
async availableIn(key: string): Promise<number> {
  if (typeof this.store.ttl === 'function') {
    const remaining = await this.store.ttl(this.prefix + key)
    if (remaining !== null) return remaining
  }
  return this.decaySeconds  // 降級
}
```

---

## 進階功能

### 限流回應標頭

```typescript
interface RateLimitInfo {
  limit: number       // X-RateLimit-Limit
  remaining: number   // X-RateLimit-Remaining
  reset: number       // X-RateLimit-Reset
  retryAfter?: number // Retry-After
}

async getInfo(key: string, max: number, decay: number): Promise<RateLimitInfo> {
  const attempts = await this.attempts(key)
  const availableIn = await this.availableIn(key)
  return {
    limit: max,
    remaining: Math.max(0, max - attempts),
    reset: Math.floor(Date.now() / 1000) + availableIn,
    retryAfter: attempts >= max ? availableIn : undefined,
  }
}
```

---

## 實作步驟

1. [ ] 新增 `ttl()` 方法到 CacheStore 介面
2. [ ] 實作各存儲的 `ttl()` 方法
3. [ ] 修改 `RateLimiter.availableIn()`
4. [ ] 新增 `getInfo()` 方法
5. [ ] 測試 TTL 精度
