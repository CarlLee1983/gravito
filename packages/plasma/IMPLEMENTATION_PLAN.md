# 實施計畫：@gravito/plasma v2.0.0 -- Bun 原生 Redis 遷移

## 總覽

將 `@gravito/plasma` 從雙驅動架構（BunRedisClient + ioredis RedisClient）遷移至純 Bun.redis 原生實現。移除 ioredis 依賴、RedisClusterClient、RedisConnectionManager 等遺留程式碼，同時將 1583 行的 BunRedisClient 拆分為模組化結構。此遷移參照 `@gravito/nebula-s3` v2.0.0 的成功先例（同樣從 AWS SDK 遷移至 Bun 原生 API）。

## 需求清單

- 完全移除 ioredis 依賴（peerDependencies + devDependencies）
- 移除 `RedisClient.ts`（ioredis wrapper，1874 行）
- 移除 `RedisClusterClient.ts`（ioredis Cluster，147 行）
- 移除 `RedisConnectionManager.ts`（ioredis 連接管理，197 行）
- 將 `BunRedisClient.ts`（1583 行）拆分為多個 < 300 行的模組
- 簡化 `RedisManager.ts` 移除 clientType 選擇邏輯
- 保持 `RedisClientContract` 介面完全不變（零下游破壞）
- 保持 `Redis` Facade 介面完全不變
- 保持 `OrbitPlasma` 零修改
- 更新所有測試（移除 ioredis mock 測試，保留 BunRedisClient 測試）
- 提供 MIGRATION.md + CHANGELOG.md
- 下游包相容性：stasis、pulsar、examples/auth-verification

## 架構變更總覽

### 移除檔案（4 個，共 ~2218 行）

| 檔案 | 行數 | 原因 |
|------|------|------|
| `packages/plasma/src/RedisClient.ts` | 1874 | ioredis wrapper，完全移除 |
| `packages/plasma/src/RedisClusterClient.ts` | 147 | ioredis Cluster，完全移除 |
| `packages/plasma/src/RedisConnectionManager.ts` | 197 | ioredis 連接管理，完全移除 |

### 新增/重構檔案（BunRedisClient 拆分）

| 檔案 | 預計行數 | 用途 |
|------|---------|------|
| `packages/plasma/src/clients/BunRedisClient.ts` | ~220 | 核心連接管理 + 組裝各操作模組 |
| `packages/plasma/src/clients/ops/StringOps.ts` | ~180 | String 操作（get/set/del/exists 等） |
| `packages/plasma/src/clients/ops/HashOps.ts` | ~180 | Hash 操作（hget/hset/hdel 等） |
| `packages/plasma/src/clients/ops/ListOps.ts` | ~120 | List 操作（lpush/rpush 等） |
| `packages/plasma/src/clients/ops/SetOps.ts` | ~250 | Set + SortedSet 操作 |
| `packages/plasma/src/clients/ops/StreamOps.ts` | ~200 | Stream 操作（xadd/xread 等） |
| `packages/plasma/src/clients/ops/KeyOps.ts` | ~80 | Key/Server 操作（keys/scan 等） |
| `packages/plasma/src/clients/ops/ScriptOps.ts` | ~40 | Lua 腳本操作 |
| `packages/plasma/src/clients/ops/TtlOps.ts` | ~80 | TTL 操作（expire/ttl 等） |
| `packages/plasma/src/clients/ops/types.ts` | ~60 | 操作模組共享型別 |
| `packages/plasma/src/clients/pipeline/BunRedisPipeline.ts` | ~130 | Pipeline 實現 |
| `packages/plasma/src/clients/pubsub/BunRedisPubSub.ts` | ~100 | Pub/Sub 管理 |
| `packages/plasma/src/clients/types.ts` | ~60 | Bun.redis 型別定義 |

### 修改檔案

| 檔案 | 變更內容 |
|------|---------|
| `packages/plasma/src/RedisManager.ts` | 移除 ioredis/cluster 邏輯，只建立 BunRedisClient |
| `packages/plasma/src/types/index.ts` | 標記 deprecated 型別 |
| `packages/plasma/src/index.ts` | 移除 `RedisClient` 導出，新增 BunRedisClient 導出 |
| `packages/plasma/package.json` | 移除 ioredis，版本升級至 2.0.0 |

---

## 實施步驟（6 個 Phase）

### Phase 1：型別系統清理與基礎準備（低風險）

**1.1 提取 Bun.redis 型別定義** → `packages/plasma/src/clients/types.ts`
- 從 BunRedisClient.ts 底部提取 `RedisClient`、`RedisClientOptions` 等型別
- **風險**：低

**1.2 清理公開型別定義** → `packages/plasma/src/types/index.ts`
- 將 `RedisClientType` 改為 `'bun'` 並標記 deprecated
- 將 `ClusterOptions` 標記為 deprecated
- **風險**：低

**1.3 更新 package.json**
- 版本升級：`1.0.0` → `2.0.0`
- 移除 ioredis peerDependencies 和 devDependencies
- **風險**：低

---

### Phase 2：BunRedisClient 模組化拆分（核心工作，中風險）

**策略**：使用 mixin/delegation 模式，各操作模組為獨立函數集合，接收 OpsContext，BunRedisClient 作為 orchestrator

**2.1-2.11** 按順序提取各操作模組：
- `StringOps.ts` -- get/set/del/exists 等
- `HashOps.ts` -- hget/hset/hdel 等
- `ListOps.ts` -- lpush/rpush/lpop 等
- `SetOps.ts` -- Set + SortedSet 操作
- `StreamOps.ts` -- xadd/xread 等
- `KeyOps.ts` -- keys/scan/type 等
- `ScriptOps.ts` -- eval/evalsha
- `TtlOps.ts` -- expire/ttl/persist
- `BunRedisPipeline.ts` -- Pipeline 實現
- `BunRedisPubSub.ts` -- Pub/Sub 邏輯

**2.12** 重組 BunRedisClient
- 聚合所有操作，實現 `RedisClientContract`
- 目標行數：~220 行

**2.13** 更新 `clients/index.ts`
- 移除 IORedisClient 導出，只導出 BunRedisClient

**風險**：中（需確保無遺漏）

---

### Phase 3：移除 ioredis 相關程式碼（高風險，需謹慎）

**3.1** 刪除 `RedisClient.ts`（1874 行）
**3.2** 刪除 `RedisClusterClient.ts`（147 行）
**3.3** 簡化 `RedisManager.ts`
- 移除 clientType 選擇邏輯
- Cluster 配置時拋出清晰錯誤：`"Redis Cluster is no longer supported in plasma v2.0.0. Please use a Redis Cluster Proxy."`

**3.4** 刪除 `RedisConnectionManager.ts`（197 行）
**3.5** 更新 `index.ts` 導出
- 移除 `RedisClient` 導出
- 新增 `BunRedisClient` 導出

**風險**：中（需確認無外部引用）

---

### Phase 4：測試遷移（高工作量，中風險）

**4.1** 移除 18 個 ioredis 測試檔案
- `redis-client.*.test.ts` 系列
- `compatibility.integration.test.ts`
- `cluster.test.ts`

**4.2** 更新保留的測試
- 檢查 import 路徑是否需更新

**4.3** 新增 BunRedisClient 單元測試
- 模組組裝驗證
- Pipeline 錯誤隔離測試

**4.4** 更新 benchmarks
- 移除 ioredis 基準測試

**風險**：低（主要是刪除）

---

### Phase 5：下游相容性驗證

**5.1** 驗證 stasis 相容性
- `stasis` 只使用 `Redis` Facade 和 `RedisClientContract` 介面，**無需修改**
- 執行 `cd packages/stasis && bun test`

**5.2** 驗證 pulsar 相容性
- `pulsar` 也只使用 `Redis` Facade，**無需修改**
- 執行 `cd packages/pulsar && bun test`

**5.3** 更新版本依賴
- `stasis/package.json`：`@gravito/plasma` → `^2.0.0`
- `pulsar/package.json`：`@gravito/plasma` → `^2.0.0`

**5.4** 全量構建與測試
```bash
bun install
bun run typecheck
bun run build
bun run test
```

**風險**：極低

---

### Phase 6：文檔與遷移指南

**6.1** 建立 `MIGRATION.md`
- 破壞性變更清單
- Cluster 替代方案（Proxy 架構 + 配置範例）
- multi/exec 替代方案（Lua 腳本範例）
- 遷移檢查清單

**6.2** 更新 `CHANGELOG.md`
- v2.0.0 發佈說明

**6.3** 更新 `README.md`
- 移除 ioredis 相關說明
- 標註 v2.0.0 Bun 原生

**6.4** 更新架構文檔
- `docs/claude/packages.md` -- plasma v2.0.0 說明

---

## 技術決策

### Cluster 不支援之對策

**問題**：Bun.redis 不支援 Redis Cluster

**解決方案**：推薦使用 **Redis Cluster Proxy**
```
應用層 (plasma Redis Facade)
    ↓
Redis Cluster Proxy (單點入口，客戶端透明)
    ↓
Redis Cluster
```

**優點**：
- 應用層無需修改，仍使用單一連接
- Proxy 負責路由與重定向
- 可選開源方案：redis-cluster-proxy、Envoy Proxy、HAProxy

**預期影響**：< 1% 使用者（多數已使用單機或雲端 Redis）

### Pipeline 實現

**現況**：Promise.all 模擬批量 + Bun.redis `enableAutoPipelining: true`

**效能**：
- ioredis 原生 pipeline：~320k ops/sec
- Bun.redis Promise.all：~301k ops/sec
- 差距：-6%（可接受）

**保留策略**：現有實現不改變

---

## 風險與對策矩陣

| 風險 | 嚴重度 | 可能性 | 對策 |
|------|--------|--------|------|
| **BunRedisClient 拆分後遺漏方法** | 高 | 中 | TypeScript `implements RedisClientContract` 在編譯期捕獲 |
| **下游包引用被移除的 RedisClient** | 高 | 低 | 已確認只使用 Facade 和介面 |
| **Cluster 使用者受影響** | 高 | 低 | MIGRATION.md 提供方案、清晰錯誤訊息 |
| **Pipeline 性能變更** | 中 | 低 | 基準測試驗證 |
| **Pub/Sub 管理出錯** | 中 | 中 | subscriber 狀態保留在核心 |
| **測試覆蓋率下降** | 中 | 低 | 保留所有 BunRedisClient 測試 |

---

## 代碼度量預期

| 指標 | 遷移前 | 遷移後 | 變化 |
|------|--------|--------|------|
| **src/ 總行數** | ~4,905 | ~2,300 | **-53%** |
| **最大檔案行數** | 1,874 | ~250 | **-87%** |
| **外部依賴** | ioredis | 無 | **-1** |
| **devDependencies** | @types/ioredis | 無 | **-1** |

---

## 成功標準清單

- [ ] ioredis 完全從 dependencies 移除
- [ ] RedisClient/RedisClusterClient/RedisConnectionManager 刪除
- [ ] BunRedisClient 拆分為 11+ 個模組（每個 < 300 行）
- [ ] `RedisClientContract` 介面零修改
- [ ] `Redis` Facade 零修改
- [ ] `bun run typecheck` 通過
- [ ] `bun run build` 成功
- [ ] stasis/pulsar 所有測試通過
- [ ] MIGRATION.md 包含 Cluster 替代方案
- [ ] package.json 版本升級至 2.0.0

---

## 實施時程

| Phase | 時間 | 複雜度 |
|-------|------|--------|
| Phase 1（型別清理） | 30 分鐘 | 低 |
| Phase 2（模組拆分） | 2-2.5 小時 | 中 |
| Phase 3（移除 ioredis） | 1 小時 | 中 |
| Phase 4（測試遷移） | 1.5 小時 | 中 |
| Phase 5（下游驗證） | 30 分鐘 | 低 |
| Phase 6（文檔） | 1 小時 | 低 |
| **總計** | **6-7 小時** | |
