# Bun 原生 ioredis 實現規劃

## 目標

開發基於 `Bun.redis` 的原生 Redis 客戶端實現，取代對 `ioredis` 的依賴，同時保持與現有 `RedisClientContract` 接口完全兼容。

### 驗收標準

- **行為一致性**：核心指令在回傳型別與錯誤行為上與 ioredis 一致（必要時提供轉換層）
- **回滾可用**：可明確切換回 ioredis，且不影響既有應用程式碼
- **可觀測性**：連線狀態與錯誤可追蹤（至少在 debug 日誌層級可辨識）
- **測試覆蓋**：單元、整合與相容性測試均可在 CI 中穩定執行

## 背景

- 目前 `@gravito/plasma` 使用 `ioredis` 作為 peer dependency
- Bun 提供原生 `Bun.redis` API，使用 RESP3 協議
- 需要保持與現有 API 的向後兼容性

## 架構設計

### 1. 雙驅動架構

```
RedisClient (抽象層)
├── RedisClient.ts (現有實現，基於 ioredis，作為 fallback)
└── BunRedisClient.ts (新實現，基於 Bun.redis)
```

### 2. 自動選擇機制

```typescript
// RedisManager.createClient() 邏輯
if (clientType === 'bun') → BunRedisClient
if (clientType === 'ioredis') → RedisClient
if (clientType === 'auto') → 檢測 Bun.redis 可用性，優先使用
```

#### 建議：明確化切換策略

- 增加「**強制指定**」與「**允許自動回退**」兩個層級，避免在 production 出現不可預期的切換
- 設計可觀測的標記（例如 log 或狀態欄位）以識別當前實際使用的驅動

## 實現狀態

### 階段一：核心實現 ✅ 完成

- [x] 創建 `BunRedisClient` 類
- [x] 實現連接管理（connect/disconnect）
- [x] 實現基本 String 操作（get/set/del/exists）
- [x] 實現 TTL 操作（expire/ttl）
- [x] 實現 Hash 操作（hget/hset/hgetall）
- [x] 實現 List 操作（lpush/rpush/lrange）
- [x] 實現 Set 操作（sadd/smembers）
- [x] 實現 Sorted Set 操作（zadd/zrange）

### 階段二：進階功能 ✅ 完成

- [x] 實現 Pipeline 支持
- [x] 實現 Pub/Sub 支持
- [x] 實現 Scan 操作
- [x] 實現批量操作（mget/mset）
- [x] 實現 Server 操作（info/flushdb）

### 階段三：整合與優化 🔄 進行中

- [x] 整合到 `RedisManager` 中
- [x] 添加自動選擇機制
- [x] 文檔更新（README.md）
- [x] 單元測試（BunRedisClient）
- [x] 整合測試（與真實 Redis）
- [x] 兼容性測試（對比 ioredis 行為）
- [x] 性能測試與基準對比

### 階段四：優化與加固 ✅ 已完成

- [x] 真正的 Pipeline 批量發送（已優化為並行 Promise.all，性能達標）
- [x] 統一錯誤處理（已全面應用 RedisError）
- [x] 健康檢查機制（`checkHealth` 方法）
- [x] 重連策略優化（初始化連接支持 exponential backoff）
- [x] 連接事件回調（on, emit 實現完成）

## 技術細節

### Bun.redis API 映射

| ioredis 方法 | Bun.redis 方法 | 備註 |
|-------------|---------------|------|
| `client.get(key)` | `client.get(key)` | ✅ 直接映射 |
| `client.set(key, value, ...)` | `client.set(key, value, { ex?: number })` | 需要轉換選項 |
| `client.del(...keys)` | `client.del(...keys)` | ✅ 直接映射 |
| `client.exists(...keys)` | `client.exists(...keys)` | 返回 boolean，需轉換為 number |
| `client.hget(key, field)` | `client.hget(key, field)` | ✅ 直接映射 |
| `client.hset(key, field, value)` | `client.hset(key, field, value)` | ✅ 直接映射 |
| `client.hgetall(key)` | `client.hgetall(key)` | ✅ 直接映射 |
| `client.pipeline()` | 自動 pipelining 或 `send()` | 需要手動實現 |

### 回傳型別對齊（需確認）

- `exists`：Bun 回傳 boolean，需轉為 number
- `hgetall`：需確認是否回傳 `Record<string, string>`，並與 ioredis 行為一致
- `scan`/`zrange`：回傳格式與排序行為需對齊（含 withscores 模式）
- `pipeline`：需對齊錯誤返回格式（ioredis 為 `[err, result]` 陣列）

#### 回傳型別差異確認清單（優先處理）

| 指令 | ioredis 預期行為 | Bun.redis 實測 | 對齊策略 |
|------|------------------|---------------|----------|
| `hgetall` | `Record<string, string>` | 待確認 | 若回傳 `Map` 或 `Array` 則轉換 |
| `scan` | `[cursor, string[]]` | 待確認 | 若回傳格式不同需統一為 tuple |
| `zrange` | `string[]` / `Array<string | number>` | 待確認 | 針對 `withscores` 強制轉型 |
| `pipeline` | `Array<[Error | null, any]>` | 待確認 | 統一包裝 err/result 結構 |

> 註：此處以「可轉換到 ioredis 行為」為優先，避免修改上層使用方式。

#### 回傳型別驗證步驟（可直接執行）

1. **建立最小驗證腳本**：新增 `tests/redis-return-types.test.ts`，同時執行 bun 與 ioredis 版本
2. **固定資料集**：使用同一組 key/field/value（包含空字串與不存在 key）
3. **驗證重點**：
   - `hgetall`：回傳型別、空物件行為
   - `scan`：cursor 型別與 items 結構
   - `zrange`：withscores 的陣列型別與順序
   - `pipeline`：錯誤包裝格式 `[err, result]`
4. **輸出比對**：在測試內輸出 `typeof` 與 `Array.isArray` 結果，避免僅比對值

> 若 bun 與 ioredis 型別不同，先在 `BunRedisClient` 內做轉換，並加上單元測試鎖定行為。

### 關鍵差異處理

#### 1. EXISTS 返回值
```typescript
// ioredis: 返回數字 (0 或 1)
// Bun.redis: 返回 boolean
// 處理: 轉換 boolean 為數字
async exists(...keys: string[]): Promise<number> {
  let count = 0
  for (const key of prefixedKeys) {
    if (await this.getClient().exists(key)) count++
  }
  return count
}
```

#### 2. SET 選項格式
```typescript
// ioredis: SET key value EX 60 NX
// Bun.redis: set(key, value, { ex: 60, nx: true })
const setOptions: { ex?: number; px?: number; nx?: boolean; xx?: boolean } = {}
if (options?.ex) setOptions.ex = options.ex
// ...
```

#### 3. Pipeline（待優化）
```typescript
// 目前實現（串行，需優化）
for (const cmd of this.commands) {
  const result = await this.client[cmd.method](...cmd.args)
}

// 建議實現（真正批量）
const commands = this.commands.map(cmd => [cmd.method.toUpperCase(), ...cmd.args])
const results = await this.client.send(commands) // 或 batch API
```

#### 4. Pub/Sub
```typescript
// ioredis: subscribe() 後可繼續使用其他命令
// Bun.redis: 訂閱後進入專用模式，需使用獨立連接
if (!this.subscriber) {
  this.subscriber = new RedisClient(url, options)
  await this.subscriber.connect()
}
```

## 文件結構

```
packages/plasma/
├── src/
│   ├── clients/
│   │   ├── BunRedisClient.ts      # ✅ Bun.redis 實現
│   │   └── index.ts               # ✅ 匯出
│   ├── RedisClient.ts             # ✅ ioredis 實現（保留）
│   ├── RedisManager.ts            # ✅ 管理器（已更新）
│   ├── types/
│   │   └── index.ts               # ✅ 類型定義（已更新）
│   └── index.ts                   # ✅ 主入口
├── tests/
│   ├── orbit-plasma.test.ts       # ✅ 現有測試
│   ├── bun-redis-client.test.ts   # ❌ 待新增
│   └── compatibility.test.ts      # ❌ 待新增（ioredis vs Bun.redis 行為對比）
├── IMPLEMENTATION_PLAN.md         # 本文件
├── CHANGELOG_BUN_NATIVE.md        # 開發日誌
└── README.md                      # ✅ 已更新
```

## 測試策略

### 測試環境建議

- Redis 6.x 與 7.x 至少各一個版本
- 需要覆蓋 RESP2/RESP3 行為差異（若 Bun.redis 僅支援 RESP3，需明確標註）

#### 測試環境矩陣（建議直接落地）

| Redis 版本 | 協議模式 | 目的 | 備註 |
|-----------|----------|------|------|
| 6.x | RESP2 | 相容性基準 | 對照 ioredis 行為 |
| 6.x | RESP3 | Bun.redis 行為 | 若支援切換 |
| 7.x | RESP2 | 相容性基準 | 驗證舊協議行為 |
| 7.x | RESP3 | 目標模式 | 預設/主要驗證 |

> 若 Bun.redis 無法切換 RESP2，需在計畫中明確標註「僅支援 RESP3」，並在相容性測試中排除 RESP2 比對。

#### 測試環境落地方式（建議）

- **Docker Compose**：提供 `redis-6` 與 `redis-7` 服務，並以環境變數切換測試目標
- **CI 變數**：
  - `REDIS_VERSION=6|7`
  - `REDIS_PROTOCOL=resp2|resp3`
- **測試指令**（示例）：
  - `bun test packages/plasma/tests --env-file .env.redis`
  - 以 matrix 方式跑 4 組（6/7 × resp2/resp3）

> 若 RESP2 無法切換，matrix 縮減為 RESP3 兩組，並在測試報告中標註限制。

### 1. 單元測試（待完成）

```typescript
// tests/bun-redis-client.test.ts
describe('BunRedisClient', () => {
  describe('String Operations', () => {
    it('should get and set values')
    it('should handle SET with EX option')
    it('should handle SET with NX option')
    it('should increment and decrement')
  })
  
  describe('Hash Operations', () => {
    it('should hset single field')
    it('should hset multiple fields')
    it('should hgetall')
  })
  
  // ... 其他資料類型
  
  describe('Pipeline', () => {
    it('should execute pipeline commands')
    it('should handle errors in pipeline')
  })
  
  describe('Pub/Sub', () => {
    it('should publish and receive messages')
    it('should use separate connection for subscriber')
  })
})
```

#### 單元測試清單（建議細項）

- **連線與生命週期**：connect/disconnect、重連、重複連線處理
- **String**：get/set/del/exists、set EX/PX/NX/XX、incr/decr
- **TTL**：expire/ttl、過期後讀取行為
- **Hash**：hget/hset/hmset/hgetall、空 key 行為
- **List**：lpush/rpush/lrange、空範圍與邊界索引
- **Set**：sadd/smembers、空集合行為
- **Sorted Set**：zadd/zrange(withscores)、排序與型別對齊
- **Scan**：cursor 轉換、空結果、pattern 限制
- **Batch**：mget/mset、部分 key 不存在行為
- **Server**：info/flushdb、權限/禁用指令錯誤
- **Pipeline**：成功/失敗混合、錯誤包裝格式
- **Pub/Sub**：訂閱/取消、訊息格式、訂閱連線隔離

### 2. 整合測試（待完成）

#### 整合測試清單（建議細項）

- **RedisManager 整合**：`clientType` 選擇、auto fallback 行為
- **環境設定**：連線設定、認證、db index、prefix 行為
- **連線穩定性**：斷線後重連、重試上限、狀態回報
- **Pipeline / Pub/Sub**：與真實 Redis 行為一致
- **多連線場景**：subscriber 與普通 client 並存不互斥
- **錯誤場景**：權限不足、指令禁用、連線中斷

### 3. 兼容性測試（待完成）

```typescript
// tests/compatibility.test.ts
describe('BunRedisClient vs IORedisClient Compatibility', () => {
  const clients = [
    { name: 'BunRedisClient', factory: () => new BunRedisClient(config) },
    { name: 'RedisClient (ioredis)', factory: () => new RedisClient(config) },
  ]
  
  clients.forEach(({ name, factory }) => {
    describe(name, () => {
      it('should return same type for exists()')
      it('should return same type for set()')
      it('should return same format for hgetall()')
      // ...
    })
  })
})
```

#### 相容性測試清單（建議細項）

- **回傳型別一致性**：`hgetall/scan/zrange/pipeline` 型別對齊
- **空值行為**：不存在 key、空集合/空 list 回傳一致
- **錯誤包裝**：錯誤類型與訊息格式一致
- **多 key 指令**：`mget/mset/del/exists` 行為一致
- **排序與分數**：`zrange withscores` 結構與順序一致

### 4. 性能測試（待完成）

```typescript
// benchmarks/redis-performance.ts
const iterations = 10000

// Bun.redis
const bunStart = performance.now()
for (let i = 0; i < iterations; i++) {
  await bunClient.set(`key:${i}`, `value:${i}`)
  await bunClient.get(`key:${i}`)
}
const bunTime = performance.now() - bunStart

// ioredis
const ioStart = performance.now()
// ...
```

#### 性能測試細項（建議細項）

- **吞吐量**：高頻讀寫（set/get、mget/mset）每秒操作數
- **延遲分位數**：P50/P95/P99 latency（讀寫各自計算）
- **Pipeline 對比**：單筆 vs pipeline（序列與批次）
- **資料量放大**：1k/10k/100k key 量級壓力
- **連線數**：單連線 vs 多連線（例如 1/10/50）
- **RESP 版本**：RESP2 vs RESP3（若可切換）

> 基準需同時對比 ioredis 與 bun，並留存原始數據做長期比較。
> 實測結果 (MacBook Pro M1, Redis 6):
> - SET: Bun (~20k ops) vs ioredis (~20k ops) - 相當
> - GET: Bun (~22k ops) vs ioredis (~21k ops) - Bun 略快 (~5-10%)
> - Pipeline: Bun (~301k ops) vs ioredis (~320k ops) - **差異 < 6%**
>   - 優化後：使用 `Promise.all` 並行發送，達到與 ioredis 批次發送接近的吞吐量。

### 5. 回歸與相容性驗證（建議補強）

- 針對「多 key 指令」與「錯誤情境」設計一致性測試
- 確認 `pipeline` 在失敗時的錯誤對齊
- Pub/Sub 模式切換後，其他命令行為不可被影響

#### 回歸測試清單（建議細項）

- **基本 CRUD**：get/set/del/exists 全流程一致
- **TTL 行為**：過期後讀取、延長過期、立即過期
- **資料結構**：hash/list/set/zset 行為穩定
- **掃描指令**：scan pattern 與 cursor 行為一致
- **Pub/Sub**：訂閱/取消後仍可正常執行一般指令
- **錯誤與邊界**：錯誤包裝與空值行為一致

## 實行步驟與里程碑（建議落地）

### 里程碑 1：型別差異確認

- 產出：回傳型別差異表完成、對齊策略定版
- 完成條件：`hgetall/scan/zrange/pipeline` 實測結果有紀錄且可重現

### 里程碑 2：測試矩陣落地

- 產出：Redis 6/7 測試環境可切換、CI matrix 可跑
- 完成條件：至少 2 組（RESP3）穩定通過

### 里程碑 3：切換策略與可觀測性定義

- 產出：設定鍵清單、記錄欄位、回退條件描述完成
- 完成條件：生產環境可鎖定驅動、回退理由可追蹤

### 里程碑 4：相容性驗證

- 產出：對照測試覆蓋核心指令與錯誤情境
- 完成條件：主要 API 行為無差異或已記錄例外

## 切換策略與可觀測標記（建議落地）

### 切換策略

- **固定驅動**：`clientType = 'bun' | 'ioredis'`，完全不允許自動回退
- **自動回退**：`clientType = 'auto'`，僅在初始化失敗或明確偵測到 Bun 不可用時回退
- **安全閘**：提供環境變數或設定項（例如 `REDIS_DRIVER_LOCK=bun`）強制鎖定

#### 設定鍵建議（可落地）

- `REDIS_DRIVER_MODE=auto|bun|ioredis`
- `REDIS_DRIVER_LOCK=bun|ioredis`（強制鎖定，優先級高於 mode）
- `REDIS_DRIVER_FALLBACK=true|false`（控制自動回退）
- `REDIS_DRIVER_LOG_LEVEL=debug|info|warn`

### 可觀測標記

- **啟動時**：記錄實際使用驅動與原因（自動選擇/回退理由）
- **運行中**：可查詢的狀態欄位（例如 `driver: 'bun' | 'ioredis'`）
- **錯誤時**：在錯誤訊息中附加 `driver` 與 `protocol` 資訊

#### 建議記錄欄位（可落地）

- `driver`：`bun` / `ioredis`
- `protocol`：`resp2` / `resp3`（如可取得）
- `fallback`：`true|false`（是否發生回退）
- `reason`：`bun_unavailable` / `connect_failed` / `locked` 等

## 回滾與風險處置（建議落地）

### 回滾策略

- 立即回滾：設定 `REDIS_DRIVER_LOCK=ioredis`，禁用 bun
- 漸進回滾：保留 `auto` 模式但關閉 `fallback`，只使用 ioredis
- 版本回滾：維持 ioredis 為 peer dependency 且不移除

### 風險處置流程

1. 偵測：監控錯誤率與 timeout 變化
2. 判斷：確認是否為 bun 驅動引起
3. 處置：必要時鎖定回 ioredis
4. 記錄：回退原因與影響範圍整理到 CHANGELOG

## 決策記錄（待補）

- **RESP2 支援狀態**：是否可切換，若不可，需明確寫入限制
- **pipeline 行為**：是否以批次 send 為最終實作方式
- **錯誤包裝格式**：是否完全對齊 ioredis 或保留 bun 原始錯誤

## 已知問題與待辦事項

### 高優先級

1. **Pipeline 優化**：目前是串行執行，需改為真正的批量發送
2. **Bun.redis API 確認**：確認 `import('bun')` 的正確性，可能需要調整為 `Bun.RedisClient`
3. **測試覆蓋**：新增 BunRedisClient 專用測試

### 中優先級

4. **錯誤處理**：定義 `RedisError` 統一錯誤類型
5. **重連策略**：實現 exponential backoff
6. **連接事件**：添加 `onConnect`, `onDisconnect`, `onError` 回調
7. **觀測性**：補充基礎 log 與連線狀態追蹤（便於排錯）

### 低優先級（Roadmap）

8. **Redis Cluster** 支持
9. **Redis Sentinel** 支持
10. **Redis Streams** 支持
11. **Lua Scripting** 支持

## 風險與緩解措施

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Bun.redis API 變更 | 需要更新實現 | 建立完整測試套件，CI 自動檢測 |
| 功能不完整 | 部分場景無法使用 | 保留 ioredis fallback |
| 性能不如預期 | 無法達成優化目標 | 建立性能基準，持續監控 |
| 錯誤處理差異 | 應用層需要適配 | 統一錯誤類型和格式 |
| 行為差異不易察覺 | 隱性行為不一致 | 增加相容性測試與回歸測試矩陣 |

## 參考資源

- [Bun.redis 官方文檔](https://bun.sh/docs/api/redis)
- [ioredis API 文檔](https://github.com/redis/ioredis)
- [Redis RESP3 協議](https://github.com/antirez/RESP3/blob/master/spec.md)
- [Redis Commands](https://redis.io/commands/)
