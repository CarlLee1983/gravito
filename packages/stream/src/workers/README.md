# Sandboxed Worker

在獨立的 Worker Thread 中執行 Job，提供上下文隔離和錯誤防護。

## 功能特性

### SandboxedWorker

- **Worker Thread 隔離**：每個 Job 在獨立的執行環境中運行
- **超時控制**：自動終止執行時間過長的 Job（`maxExecutionTime`）
- **記憶體限制**：防止記憶體洩漏影響主線程（`maxMemory`）
- **上下文隔離**：可選擇每個 Job 使用獨立的 Worker（`isolateContexts`）
- **閒置超時**：Worker 閒置一段時間後自動終止（`idleTimeout`）
- **錯誤隔離**：Worker 崩潰不會影響主線程

### WorkerPool

- **Worker 池管理**：管理多個 Worker，控制並發數量（`poolSize`）
- **預熱機制**：預先創建指定數量的 Worker（`minWorkers`）
- **負載平衡**：自動將 Job 分配到可用的 Worker
- **Job 佇列**：當所有 Worker 都在忙碌時，自動排隊等待
- **健康檢查**：定期清理無效的 Worker（`healthCheckInterval`）
- **統計資訊**：追蹤 Worker 狀態和 Job 執行情況

## 使用方式

### 1. 使用 Worker 的 Sandboxed 模式（推薦）

最簡單的方式是在 `Worker` 中啟用 `sandboxed` 選項：

```typescript
import { Worker, Job } from '@gravito/stream'

// 定義 Job
class SendEmailJob extends Job {
  constructor(private email: string, private subject: string) {
    super()
  }

  async handle(): Promise<void> {
    // 發送郵件邏輯
    await sendEmail(this.email, this.subject)
  }
}

// 建立啟用 sandboxed 模式的 Worker
const worker = new Worker({
  sandboxed: true,
  sandboxConfig: {
    maxExecutionTime: 30000,  // 30 秒超時
    maxMemory: 512,            // 512MB 記憶體限制
    isolateContexts: true,     // 每個 Job 獨立執行環境
  },
})

// 執行 Job
const job = new SendEmailJob('user@example.com', 'Welcome')
await worker.process(job)

// 清理資源
await worker.terminate()
```

### 2. 直接使用 SandboxedWorker

如果需要更細粒度的控制：

```typescript
import { SandboxedWorker } from '@gravito/stream'
import type { SerializedJob } from '@gravito/stream'

// 建立 Sandboxed Worker
const worker = new SandboxedWorker({
  maxExecutionTime: 30000,
  maxMemory: 512,
  isolateContexts: false,  // 複用 Worker
  idleTimeout: 60000,      // 60 秒後自動終止
})

// 序列化的 Job 資料
const serializedJob: SerializedJob = {
  id: 'job-123',
  type: 'json',
  data: JSON.stringify({ /* job data */ }),
  createdAt: Date.now(),
}

// 執行 Job
await worker.execute(serializedJob)

// 檢查狀態
console.log(worker.getState())  // 'ready' | 'busy' | 'terminated'
console.log(worker.isReady())   // true/false

// 終止 Worker
await worker.terminate()
```

### 3. 使用 WorkerPool 管理多個 Worker

適合高並發場景：

```typescript
import { WorkerPool } from '@gravito/stream'
import type { SerializedJob } from '@gravito/stream'

// 建立 Worker Pool
const pool = new WorkerPool({
  poolSize: 8,              // 最多 8 個 Worker
  minWorkers: 2,            // 預熱 2 個 Worker
  maxExecutionTime: 30000,  // 30 秒超時
  maxMemory: 256,           // 256MB 記憶體限制
  healthCheckInterval: 30000, // 30 秒健康檢查
})

// 並發執行多個 Job
const jobs = [job1, job2, job3, job4, job5]
await Promise.all(jobs.map(job => pool.execute(job)))

// 取得統計資訊
const stats = pool.getStats()
console.log(stats)
// {
//   total: 8,       // 總 Worker 數
//   ready: 6,       // 就緒的 Worker
//   busy: 2,        // 忙碌的 Worker
//   terminated: 0,  // 已終止的 Worker
//   pending: 3,     // 等待中的 Job
//   completed: 100, // 已完成的 Job
//   failed: 2       // 失敗的 Job
// }

// 等待所有 Job 完成
await pool.waitForCompletion(60000)  // 最多等待 60 秒

// 關閉 Pool
await pool.shutdown()
```

## 配置選項

### SandboxedWorkerConfig

```typescript
interface SandboxedWorkerConfig {
  /**
   * 最大執行時間（毫秒）
   * 超過此時間的 Job 將被終止
   * @default 30000 (30 秒)
   */
  maxExecutionTime?: number

  /**
   * 最大記憶體限制（MB）
   * 超過此限制的 Worker 將被終止並重啟
   * @default undefined (無限制)
   */
  maxMemory?: number

  /**
   * 是否隔離上下文
   * true: 每個 Job 在獨立的 Worker Thread 中執行
   * false: 複用同一個 Worker Thread
   * @default false
   */
  isolateContexts?: boolean

  /**
   * Worker Thread 閒置超時（毫秒）
   * Worker 閒置超過此時間後將被終止以節省資源
   * @default 60000 (60 秒)
   */
  idleTimeout?: number
}
```

### WorkerPoolConfig

```typescript
interface WorkerPoolConfig extends SandboxedWorkerConfig {
  /**
   * Worker Pool 大小
   * 同時存在的 Worker 數量上限
   * @default 4
   */
  poolSize?: number

  /**
   * 最小 Worker 數量
   * Pool 會預先創建並保持此數量的 Worker 就緒
   * @default 0
   */
  minWorkers?: number

  /**
   * 健康檢查間隔（毫秒）
   * 定期檢查 Worker 健康狀態並清理無效的 Worker
   * @default 30000 (30 秒)
   */
  healthCheckInterval?: number
}
```

## 最佳實踐

### 1. 選擇正確的模式

- **標準模式**：適合輕量級、短時間執行的 Job
- **Sandboxed 模式**：適合以下場景：
  - 執行時間不確定的 Job
  - 可能消耗大量記憶體的 Job
  - 執行不受信任代碼的 Job
  - 需要嚴格隔離的 Job

### 2. 設定合理的超時時間

```typescript
const worker = new Worker({
  sandboxed: true,
  sandboxConfig: {
    // 根據 Job 特性設定合理的超時時間
    maxExecutionTime: 30000,  // 30 秒
  },
})
```

### 3. 使用 WorkerPool 處理高並發

```typescript
// 對於高並發場景，使用 Worker Pool
const pool = new WorkerPool({
  poolSize: Math.min(os.cpus().length, 8),  // 根據 CPU 核心數設定
  minWorkers: 2,  // 預熱以加快首次執行
})
```

### 4. 記得清理資源

```typescript
// 使用 try-finally 確保資源被清理
const worker = new Worker({ sandboxed: true })
try {
  await worker.process(job)
} finally {
  await worker.terminate()
}
```

### 5. 監控 Worker 狀態

```typescript
const pool = new WorkerPool({ poolSize: 8 })

// 定期檢查 Pool 狀態
setInterval(() => {
  const stats = pool.getStats()
  if (stats.failed > 10) {
    console.warn('High failure rate detected!')
  }
}, 10000)
```

## 限制與注意事項

### 序列化限制

Worker Thread 之間的通訊需要序列化資料，因此：

- ✅ 支援：基本類型、物件、陣列、Date、RegExp
- ❌ 不支援：函式、Symbol、WeakMap、WeakSet

### 目前實作狀態

- ✅ **已實作**：
  - SandboxedWorker 基礎功能
  - WorkerPool 管理
  - Worker 整合
  - 超時控制
  - 記憶體限制配置
  - 閒置超時
  - 健康檢查

- ⚠️ **部分支援**：
  - Job 類別序列化（需要完整的類別註冊機制）

- 📝 **未來改進**：
  - 完整的 Job 類別序列化支援
  - MessagePack 序列化支援
  - Worker 熱重載
  - 效能監控和分析

## 故障排除

### Worker 初始化失敗

```typescript
// 確保 job-executor.js 檔案存在
// 檢查編譯輸出目錄
```

### Job 序列化失敗

```typescript
// 確保 Job 資料可以被 JSON 序列化
// 避免使用函式、Symbol 等不可序列化的值
```

### Worker 記憶體洩漏

```typescript
// 使用 isolateContexts 模式
const worker = new SandboxedWorker({
  isolateContexts: true,  // 每次執行都使用新的 Worker
  maxMemory: 512,         // 設定記憶體限制
})
```

## 更多資訊

- [Job 文件](../Job.ts)
- [Worker 文件](../Worker.ts)
- [測試範例](../../tests/sandboxed-worker.test.ts)
