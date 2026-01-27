# RedisStore 標籤系統改進

> 優先級：高
> 影響範圍：RedisStore、TaggedStore
> 預估工作量：3-5 天

---

## 問題描述

### 1. 標籤僵屍條目

當快取鍵過期或被直接刪除時，該鍵仍會留在標籤集合中，形成「僵屍條目」。

**現況程式碼** (`src/stores/RedisStore.ts:107-113`)：

```typescript
async forget(key: string): Promise<boolean> {
  const normalizedKey = normalizeCacheKey(key)
  const client = await this.plasma.connect(this.connection)
  const result = await client.del(this.prefixedKey(normalizedKey))
  return result > 0
  // 警告：刪除鍵時未移除標籤索引中的條目
}
```

**問題影響**：

- Redis 記憶體持續增長
- 標籤清除操作效能下降
- `flushTag()` 可能嘗試刪除不存在的鍵

### 2. 標籤 API 簽名不一致

`tagIndexAdd` 和 `tagIndexRemove` 在 RedisStore 中是異步的，但 MemoryStore 中是同步的。

---

## 優化方案

### 方案 A：Lua 腳本原子操作（推薦）

使用 Redis Lua 腳本實現原子化的標籤管理。

#### Lua 腳本

```lua
-- scripts/tag_aware_delete.lua
local key = KEYS[1]
local tag_prefix = ARGV[1]

-- 取得鍵的所有標籤
local tags = redis.call('SMEMBERS', key .. ':tags')

-- 刪除主鍵
local result = redis.call('DEL', key)

-- 從每個標籤集合中移除此鍵
for _, tag in ipairs(tags) do
  redis.call('SREM', tag_prefix .. tag, key)
end

-- 刪除標籤元資料
redis.call('DEL', key .. ':tags')

return result
```

#### 修改 RedisStore

```typescript
class RedisStore implements CacheStore, TaggableStore {
  async forget(key: string): Promise<boolean> {
    const client = await this.plasma.connect(this.connection)
    const prefixedKey = this.prefixedKey(normalizeCacheKey(key))

    // 使用 Lua 腳本原子刪除
    const result = await client.eval(
      `
      local tags = redis.call('SMEMBERS', KEYS[1] .. ':tags')
      local result = redis.call('DEL', KEYS[1])
      for _, tag in ipairs(tags) do
        redis.call('SREM', ARGV[1] .. tag, KEYS[1])
      end
      redis.call('DEL', KEYS[1] .. ':tags')
      return result
      `,
      { keys: [prefixedKey], arguments: [this.tagPrefix] }
    )
    return result > 0
  }

  async tagIndexAdd(tags: string[], taggedKey: string): Promise<void> {
    const client = await this.plasma.connect(this.connection)
    const pipeline = client.pipeline()

    // 記錄鍵的標籤（用於刪除時清理）
    pipeline.sadd(`${taggedKey}:tags`, ...tags)

    // 將鍵加入各標籤集合
    for (const tag of tags) {
      pipeline.sadd(this.tagPrefix + tag, taggedKey)
    }

    await pipeline.exec()
  }
}
```

### 方案 B：惰性清理機制

在讀取標籤成員時，過濾並清理無效條目。

```typescript
async getTagMembers(tag: string): Promise<string[]> {
  const client = await this.plasma.connect(this.connection)
  const members = await client.smembers(this.tagPrefix + tag)

  const pipeline = client.pipeline()
  for (const member of members) {
    pipeline.exists(member)
  }
  const results = await pipeline.exec()

  const validMembers: string[] = []
  const invalidMembers: string[] = []

  for (let i = 0; i < members.length; i++) {
    if (results[i][1] === 1) {
      validMembers.push(members[i])
    } else {
      invalidMembers.push(members[i])
    }
  }

  // 異步清理無效成員
  if (invalidMembers.length > 0) {
    client.srem(this.tagPrefix + tag, ...invalidMembers).catch(() => {})
  }

  return validMembers
}
```

**建議**：採用方案 A 作為主要實作，方案 B 作為降級選項。

---

## 統一標籤介面

```typescript
export interface TaggableStore {
  tags(tags: string[]): TaggedCache
  flushTag(tag: string): Promise<number>
  tagIndexAdd(tags: string[], taggedKey: string): void | Promise<void>
  tagIndexRemove(taggedKey: string): void | Promise<void>
}
```

---

## 測試計劃

```typescript
describe('RedisStore Tag System', () => {
  it('should remove key from tag index on forget', async () => {
    const store = new RedisStore({ connection: 'test' })
    await store.tags(['users']).put('user:1', { name: 'Alice' }, 3600)
    await store.forget('user:1')
    expect(await store.getTagMembers('users')).not.toContain('user:1')
  })

  it('should atomically delete key and clean tags', async () => {
    const store = new RedisStore({ connection: 'test' })
    await store.tags(['a', 'b', 'c']).put('key', 'value', 3600)
    await store.forget('key')

    expect(await store.getTagMembers('a')).not.toContain('key')
    expect(await store.getTagMembers('b')).not.toContain('key')
    expect(await store.getTagMembers('c')).not.toContain('key')
  })
})
```

---

## 實作步驟

1. [x] 新增 Lua 腳本支援 (直接嵌入 RedisStore)
2. [x] 實作原子清理機制
3. [x] 修改 `forget()` 使用 Lua 腳本
4. [x] 修改 `tagIndexAdd()` 記錄標籤元資料
5. [x] 統一 TaggableStore 介面
6. [x] 新增單元測試和整合測試 (`redis-store-tags.test.ts`)

---

## 實作總結 (已完成)

已於 `packages/stasis/src/stores/RedisStore.ts` 中實作方案 A：
- **原子性**：透過 Lua 腳本確保刪除快取鍵時，同步清理標籤集合中的索引。
- **元資料**：新增 `key:tags` 集合記錄快取鍵所擁有的標籤，提升清理效率。
- **一致性**：統一了異步標籤操作 API。
- **安全性**：分散式鎖亦改用 Lua 腳本實現原子釋放與續期。

---

## 相關文件

- [02-distributed-lock.md](./02-distributed-lock.md) - 鎖機制也需要原子化改進
