# 分散式鎖原子性修復

> 優先級：高
> 影響範圍：RedisStore、FileStore
> 預估工作量：2-3 天

---

## 問題描述

### RedisStore 鎖釋放競態條件

現況的鎖釋放邏輯存在 GET/DEL 競態條件，可能導致錯誤釋放其他程序的鎖。

**現況程式碼** (`src/stores/RedisStore.ts:222-227`)：

```typescript
async release(): Promise<boolean> {
  const client = await this.plasma.connect(this.connection)
  const current = await client.get(lockKey)  // 第一次請求
  if (current === owner) {
    await client.del(lockKey)  // 第二次請求 - 不是原子的！
    return true
  }
  return false
}
```

**競態情境**：

```
時間    程序 A                程序 B
────────────────────────────────────────
T1      GET lock → "ownerA"
T2                            鎖過期，B 取得鎖
T3                            SET lock "ownerB"
T4      DEL lock              ← 刪除了 B 的鎖！
```

---

## 優化方案

### Redis Lua 腳本（推薦）

```lua
-- 原子檢查並釋放鎖
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
```

#### 修改 RedisStore

```typescript
class RedisLock implements CacheLock {
  async release(): Promise<boolean> {
    const client = await this.plasma.connect(this.connection)
    const result = await client.eval(
      `
      local current = redis.call('GET', KEYS[1])
      if current == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
      `,
      { keys: [this.lockKey], arguments: [this.owner] }
    )
    return result > 0
  }
}
```

---

## 鎖擴展功能

### 鎖續期

```typescript
interface CacheLock {
  acquire(): Promise<boolean>
  release(): Promise<boolean>
  extend(seconds: number): Promise<boolean>  // 新增
  getRemainingTime(): Promise<number>        // 新增
}
```

```typescript
async extend(seconds: number): Promise<boolean> {
  const client = await this.plasma.connect(this.connection)
  const result = await client.eval(
    `
    local current = redis.call('GET', KEYS[1])
    if current == ARGV[1] then
      return redis.call('EXPIRE', KEYS[1], ARGV[2])
    else
      return 0
    end
    `,
    { keys: [this.lockKey], arguments: [this.owner, seconds.toString()] }
  )
  return result === 1
}
```

### block() 方法改進

```typescript
interface BlockOptions {
  retryInterval?: number     // 重試間隔（毫秒）
  maxRetries?: number
  signal?: AbortSignal       // 取消信號
}

async block(seconds: number, options: BlockOptions = {}): Promise<boolean> {
  const { retryInterval = 100, maxRetries = Infinity, signal } = options
  const deadline = Date.now() + seconds * 1000
  let attempt = 0

  while (Date.now() < deadline && attempt < maxRetries) {
    if (signal?.aborted) throw new Error('Lock acquisition aborted')
    if (await this.acquire()) return true

    attempt++
    const delay = Math.min(retryInterval * Math.pow(1.5, Math.min(attempt, 10)), 1000)
    await sleep(delay)
  }

  return false
}
```

---

## 測試計劃

```typescript
describe('Distributed Lock Race Conditions', () => {
  it('should not release another owners lock', async () => {
    const store = new RedisStore({ connection: 'test' })
    const lockA = store.lock('resource', 5)
    const lockB = store.lock('resource', 5)

    await lockA.acquire()
    await sleep(5500) // 等待過期
    await lockB.acquire()

    // A 嘗試釋放應該失敗
    expect(await lockA.release()).toBe(false)
    // B 的鎖仍然有效
    expect(await store.get('lock:resource')).toBe(lockB.owner)
  })
})
```

---

## 實作步驟

1. [ ] 修改 `RedisLock.release()` 使用 Lua 腳本
2. [ ] 修改 `RedisLock.acquire()` 使用 SET NX EX
3. [ ] 實作 `extend()` 方法
4. [ ] 改進 `block()` 方法
5. [ ] 更新 FileLock 使用原子操作
6. [ ] 新增競態條件測試

---

## 相關文件

- [01-redis-store.md](./01-redis-store.md) - RedisStore 其他改進
