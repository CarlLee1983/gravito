# Phase 1: 類型安全優化

> **狀態**: 待執行  
> **預估時間**: 4-5 天  
> **依賴**: 無（可與 Phase 0 平行執行）  
> **優先級**: 🔴 高（核心優化）

## 📋 目標

消除代碼中的 `any` 類型使用，建立完整的類型定義體系，提升開發體驗和運行時安全性。

> **時間調整說明**: 原估計 3-4 天，調整為 4-5 天。
> 原因：需要仔細設計類型定義以確保向後相容性，且涉及多個驅動的類型協調。

## 🔍 當前問題

根據代碼分析，發現 **98 個 `any` 類型使用**，主要分佈在：

| 檔案 | any 數量 | 主要原因 |
|-----|---------|---------|
| `QueueManager.ts` | 21 個 | 驅動動態加載、配置類型、`biome-ignore` 註解 |
| `RedisDriver.ts` | 34 個 | Redis 客戶端類型（ioredis vs node-redis）|
| `SQLitePersistence.ts` | 7 個 | 數據庫查詢結果類型 |
| `MySQLPersistence.ts` | 6 個 | 數據庫查詢結果類型 |
| `Scheduler.ts` | 5 個 | 定時任務配置 |
| `Consumer.ts` | 3 個 | 監控選項、heartbeat timer |
| 其他驅動和序列化器 | 22 個 | 各種動態類型 |

## 🎯 優化策略

### 1. 驅動類型定義

**問題**: 驅動動態加載時使用 `any` 類型斷言

**解決方案**:
- 建立統一的 `DriverConfig` 類型體系
- 為每個驅動建立專用的配置類型
- 使用泛型和聯合類型替代 `any`

```typescript
// 優化前
registerConnection(name: string, config: unknown): void {
  const driverType = (config as { driver: string }).driver
  // ...
}

// 優化後
type DriverConfigMap = {
  memory: MemoryDriverConfig
  database: DatabaseDriverConfig
  redis: RedisDriverConfig
  // ...
}

registerConnection<T extends keyof DriverConfigMap>(
  name: string,
  config: DriverConfigMap[T]
): void
```

### 2. Redis 客戶端類型

**問題**: Redis 客戶端類型不統一（ioredis vs node-redis）

**解決方案**:
- 建立統一的 Redis 客戶端接口
- 使用類型守衛區分不同客戶端
- 為 Lua 腳本定義返回類型

```typescript
interface RedisClient {
  lpush: (key: string, ...values: string[]) => Promise<number>
  rpop: (key: string) => Promise<string | null>
  // ... 其他方法
}

interface IORedisClient extends RedisClient {
  defineCommand: (name: string, options: any) => void
  // ... ioredis 特有方法
}
```

### 3. 數據庫查詢結果類型

**問題**: 數據庫查詢結果使用 `any` 類型

**解決方案**:
- 為查詢結果定義明確的類型
- 使用泛型約束查詢返回類型
- 建立數據庫行類型定義

```typescript
interface JobRow {
  id: string
  payload: string
  attempts: number
  created_at: Date
  available_at: Date
  reserved_at?: Date
}

async pop(queue: string): Promise<SerializedJob | null> {
  const result = await this.dbService.execute<JobRow>(/* ... */)
  // ...
}
```

### 4. 配置類型定義

**問題**: 配置對象使用 `any` 或 `unknown`

**解決方案**:
- 為所有配置建立明確的類型定義
- 使用 `zod` 或類似庫進行運行時驗證
- 建立配置類型文檔

## 📝 實施步驟

### Step 1: 建立類型定義文件

1. 建立 `src/types/driver-configs.ts` - 驅動配置類型
2. 建立 `src/types/redis-client.ts` - Redis 客戶端類型
3. 建立 `src/types/database.ts` - 數據庫類型
4. 建立 `src/types/config.ts` - 配置類型

### Step 2: 逐步遷移

1. **QueueManager**: 遷移驅動註冊邏輯
2. **RedisDriver**: 遷移 Redis 客戶端類型
3. **DatabaseDriver**: 遷移數據庫查詢類型
4. **Persistence**: 遷移持久化層類型
5. **其他驅動**: 逐一遷移剩餘驅動

### Step 3: 類型驗證

1. 啟用 TypeScript strict mode
2. 修復所有類型錯誤
3. 確保向後相容性

## ⚠️ 注意事項

1. **向後相容性**: 保持公共 API 不變，僅改善內部類型
2. **漸進式遷移**: 分階段遷移，確保每個階段都可以編譯通過
3. **測試覆蓋**: 確保類型變更不影響運行時行為

## 📊 預期改善

- **類型安全**: 從 98 個 `any` 降至 0 個
- **開發體驗**: IDE 自動完成和類型檢查更準確
- **運行時安全**: 減少類型相關的運行時錯誤

## 📈 量測指標與門檻

- **any 數量**: 98 → 0（或保留少量有明確理由的 `unknown`）
- **型別錯誤**: TypeScript strict mode 需 0 error
- **API 相容性**: 公開 API 介面不可變更（含參數/回傳型別）

## 🧪 測試矩陣

- **型別檢查**: `tsc --noEmit`（strict 開啟）
- **單元測試**: 既有測試全數通過
- **回歸測試**: Driver 註冊、配置載入、序列化/反序列化

## 🔁 回滾與切換策略

- 以「逐檔案遷移」方式實作，避免一次性變更
- 若產生破壞性影響，回退最後修改的型別檔與相關調用即可恢復

## 🧩 模板使用

- 指標報告模板：`appendices/metrics-report-template.md`
- 測試矩陣模板：`appendices/test-matrix-template.md`
- 回滾檢核表：`appendices/rollback-playbook.md`

## ✅ 完成標準

- [ ] 所有 `any` 類型已消除或正當化
- [ ] TypeScript strict mode 通過
- [ ] 所有測試通過
- [ ] 類型定義文檔完成
- [ ] 向後相容性驗證通過
