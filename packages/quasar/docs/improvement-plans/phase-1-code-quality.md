# Phase 1：程式碼品質與結構優化

> 狀態：📋 規劃中
> 優先級：高
> 預估工作量：中等

## 目標

提升 Quasar 程式碼的可維護性、型別安全性與一致性。

## 1.1 TypeScript 配置強化

### 現況分析

目前 `tsconfig.json` 配置較為寬鬆，未啟用嚴格模式：

```json
{
  "compilerOptions": {
    // 缺少 strict 相關選項
  }
}
```

### 改進項目

- [ ] 啟用 `strict: true`
- [ ] 啟用 `noUncheckedIndexedAccess`
- [ ] 啟用 `noPropertyAccessFromIndexSignature`
- [ ] 修復啟用後產生的型別錯誤

### 預期效益

- 編譯時期捕捉更多潛在錯誤
- 提升程式碼可靠性
- 改善 IDE 自動完成體驗

---

## 1.2 錯誤處理標準化

### 現況分析

目前錯誤處理方式不一致：

```typescript
// QuasarAgent.ts - 使用 console.error
catch (err) {
  console.error('[Quasar] Heartbeat failed:', err)
}

// BaseZenithBridge.ts - 靜默失敗
catch (err) {
  console.error('[BaseZenithBridge] Failed to publish log:', err)
}
```

### 改進項目

- [ ] 建立 `QuasarError` 自訂錯誤類別層級
- [ ] 實作錯誤碼系統（QUASAR_ERR_001 等）
- [ ] 新增可選的錯誤回調機制
- [ ] 統一日誌格式與等級

### 建議架構

```typescript
// errors/QuasarError.ts
export class QuasarError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: Error
  ) {
    super(`[${code}] ${message}`)
    this.name = 'QuasarError'
  }
}

// errors/codes.ts
export const ErrorCodes = {
  REDIS_CONNECTION_FAILED: 'QUASAR_ERR_001',
  PROBE_COLLECTION_FAILED: 'QUASAR_ERR_002',
  BRIDGE_ATTACH_FAILED: 'QUASAR_ERR_003',
  COMMAND_EXECUTION_FAILED: 'QUASAR_ERR_004',
} as const
```

### 預期效益

- 統一錯誤處理流程
- 便於錯誤追蹤與除錯
- 支援錯誤回報機制

---

## 1.3 介面與型別改進

### 現況分析

部分型別定義可以更加明確：

```typescript
// types.ts
interface QuasarCommand {
  payload: {
    queue: string
    jobId?: string
    jobKey?: string
    driver?: 'redis' | 'laravel'  // 可擴展性不足
    action?: string
  }
}
```

### 改進項目

- [ ] 使用 discriminated unions 改進命令型別
- [ ] 為 Probe/Bridge 新增泛型支援
- [ ] 提取共用常數與列舉
- [ ] 改進 JSDoc 註解完整度

### 建議架構

```typescript
// 使用 discriminated unions
type QuasarCommand =
  | RetryJobCommand
  | DeleteJobCommand
  | LaravelActionCommand

interface RetryJobCommand {
  type: 'RETRY_JOB'
  payload: {
    queue: string
    jobId: string
    driver: QueueDriver
  }
}

type QueueDriver = 'bullmq' | 'bull' | 'bee-queue' | 'laravel' | 'redis'
```

### 預期效益

- 更精確的型別推導
- 減少執行時期錯誤
- 改善開發體驗

---

## 1.4 程式碼組織重構

### 現況分析

目前目錄結構：

```
src/
├── bridges/
├── executors/
├── probes/
├── __tests__/
├── CommandListener.ts
├── QuasarAgent.ts
├── types.ts
└── index.ts
```

### 改進項目

- [ ] 建立 `errors/` 目錄統一錯誤定義
- [ ] 建立 `utils/` 目錄提取共用工具
- [ ] 將 `types.ts` 拆分為模組化型別檔案
- [ ] 新增 `constants.ts` 統一常數管理

### 建議結構

```
src/
├── bridges/
│   ├── types.ts
│   └── ...
├── executors/
│   ├── types.ts
│   └── ...
├── probes/
│   ├── types.ts
│   └── ...
├── errors/
│   ├── QuasarError.ts
│   └── codes.ts
├── utils/
│   ├── logger.ts
│   └── redis.ts
├── __tests__/
├── CommandListener.ts
├── QuasarAgent.ts
├── types.ts          # 保留公開 API 型別
├── constants.ts
└── index.ts
```

---

## 1.5 Redis 連線管理優化

### 現況分析

目前 Redis 連線管理較為基礎：

```typescript
// QuasarAgent.ts
if (this.transportRedis.status !== 'ready' && this.transportRedis.status !== 'connecting') {
  await this.transportRedis.connect()
}
```

### 改進項目

- [ ] 實作連線池管理
- [ ] 新增自動重連機制與指數退避
- [ ] 新增連線狀態事件發送
- [ ] 支援連線健康檢查

### 建議架構

```typescript
// utils/redis.ts
export interface RedisConnectionManager {
  getConnection(): Promise<Redis>
  onStateChange(callback: (state: ConnectionState) => void): void
  healthCheck(): Promise<boolean>
  close(): Promise<void>
}

export type ConnectionState = 'connecting' | 'ready' | 'reconnecting' | 'error' | 'closed'
```

### 預期效益

- 提升連線穩定性
- 減少連線中斷造成的資料遺失
- 便於監控連線狀態

---

## 1.6 日誌系統改進

### 現況分析

目前直接使用 `console.log/error`：

```typescript
console.log(`[Quasar] Agent started for service: ${this.service}`)
console.error('[Quasar] Heartbeat failed:', err)
```

### 改進項目

- [ ] 建立統一的 Logger 介面
- [ ] 支援日誌等級配置
- [ ] 支援自訂日誌輸出（可注入）
- [ ] 結構化日誌格式

### 建議架構

```typescript
// utils/logger.ts
export interface Logger {
  debug(message: string, context?: object): void
  info(message: string, context?: object): void
  warn(message: string, context?: object): void
  error(message: string, error?: Error, context?: object): void
}

export interface QuasarOptions {
  // ... 現有選項
  logger?: Logger
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'
}
```

### 預期效益

- 統一日誌輸出格式
- 支援生產環境日誌控制
- 便於整合外部日誌系統

---

## 驗收標準

- [ ] TypeScript 嚴格模式啟用且無編譯錯誤
- [ ] 所有錯誤使用統一的錯誤類別處理
- [ ] 程式碼通過 ESLint 規則檢查
- [ ] 現有測試全數通過
- [ ] 公開 API 無破壞性變更

## 相依性

無前置相依，可獨立進行。

## 風險評估

| 風險項目 | 等級 | 緩解措施 |
|---------|------|---------|
| 啟用嚴格模式可能需要大量修改 | 中 | 分批進行，優先處理高風險區域 |
| 重構可能引入迴歸錯誤 | 低 | 確保測試覆蓋率後再進行重構 |
