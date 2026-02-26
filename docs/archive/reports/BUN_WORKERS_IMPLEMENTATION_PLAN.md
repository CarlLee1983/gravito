# Bun Workers 集成實作計畫

## 📋 項目概述

**目標**：將 Bun Workers 原生支援集成到 Gravito 框架中，提升隊列系統的性能和 TypeScript 開發體驗。

**分支**：`feature/bun-workers-support`

---

## 🎯 Phase 1：核心 Bun Worker 實現

### Task 1.1：BunWorker 類實現
**文件位置**：`packages/stream/src/workers/BunWorker.ts`

**實現內容**：
- 實現 `BunWorker` 類，對應 `SandboxedWorker` 的 Bun 版本
- 利用 Bun 原生特性：
  - 直接支持 TypeScript
  - `smol: true` 優化內存
  - `preload` 預加載必要模組
  - `ref/unref` 生命週期管理
- 支持配置選項：
  ```typescript
  interface BunWorkerConfig extends SandboxedWorkerConfig {
    smol?: boolean        // 內存優化模式
    preload?: string | string[]  // 預加載模組
    inspectPort?: number  // 調試端口（可選）
  }
  ```

**關鍵特性**：
- 復用 `SandboxedWorker` 的配置接口
- 實現相同的生命週期方法：`execute()`、`terminate()`、`getState()`
- 优化消息傳遞：優先使用字符串消息（繞過序列化）

**驗收標準**：
- ✅ TypeScript 編譯無誤
- ✅ 支持基本的 job 執行
- ✅ 正確處理超時和錯誤
- ✅ 內存占用小於 Node Worker Threads 版本 30%

---

### Task 1.2：Worker Executor 適配
**文件位置**：`packages/stream/src/workers/bun-job-executor.ts`（新建）

**實現內容**：
- 創建 Bun 專用的 job executor
- 使用 `self.onmessage` 代替 `parentPort.on`
- 優化序列化：
  - 對於簡單字符串消息直接傳遞
  - 對於複雜對象使用 structured clone
- 處理 Bun 特定的環境信息

**差異處理**：
```typescript
// Node.js 版本
import { parentPort } from 'node:worker_threads'
parentPort?.on('message', (msg) => { ... })

// Bun 版本
declare var self: Worker
self.onmessage = (event) => { ... }
```

---

## 🎯 Phase 2：Runtime 抽象層

### Task 2.1：Worker Factory 實現
**文件位置**：`packages/stream/src/workers/WorkerFactory.ts`（新建）

**實現內容**：
```typescript
export interface WorkerFactory {
  create(config: SandboxedWorkerConfig): SandboxedWorker | BunWorker
  detectRuntime(): 'node' | 'bun'
}

export class RuntimeAwareWorkerFactory {
  private runtime: 'node' | 'bun'

  constructor(runtimeOverride?: 'node' | 'bun') {
    this.runtime = runtimeOverride ?? this.detectRuntime()
  }

  private detectRuntime(): 'node' | 'bun' {
    // 檢查 Bun.isMainThread
    if (typeof Bun !== 'undefined' && Bun.isMainThread) {
      return 'bun'
    }
    return 'node'
  }

  create(config: SandboxedWorkerConfig): SandboxedWorker | BunWorker {
    if (this.runtime === 'bun') {
      return new BunWorker(config as BunWorkerConfig)
    }
    return new SandboxedWorker(config)
  }
}
```

**關鍵特性**：
- 自動偵測運行環境（Bun vs Node.js）
- 支持強制指定 runtime（開發/測試用途）
- 返回統一接口，對上層透明

---

### Task 2.2：WorkerPool 適配
**文件位置**：修改 `packages/stream/src/workers/WorkerPool.ts`

**實現內容**：
- 添加 `factory` 配置選項
- 修改 `createWorker()` 使用 factory
- 保持現有接口不變

```typescript
export interface WorkerPoolConfig extends SandboxedWorkerConfig {
  poolSize?: number
  minWorkers?: number
  healthCheckInterval?: number
  factory?: WorkerFactory  // 新增
  runtime?: 'auto' | 'node' | 'bun'  // 新增
}
```

**修改方案**：
```typescript
private factory: WorkerFactory

constructor(config: WorkerPoolConfig = {}) {
  // ...
  this.factory = config.factory ??
    new RuntimeAwareWorkerFactory(config.runtime === 'auto' ? undefined : config.runtime)
}

private createWorker(): SandboxedWorker {
  return this.factory.create({
    maxExecutionTime: this.config.maxExecutionTime,
    // ...
  }) as SandboxedWorker
}
```

---

## 🎯 Phase 3：配置系統整合

### Task 3.1：Profile 配置
**文件位置**：`packages/core/src/profiles/`

**實現內容**：
- 在 `core` profile 添加 `workers` 配置選項
- 允許用戶指定 runtime 偏好

```typescript
// gravito.config.ts 中
export const config = {
  workers: {
    runtime: 'auto',     // 'auto' | 'node' | 'bun'
    poolSize: 4,
    minWorkers: 1,
    // Bun 專有配置
    smol: false,         // 內存優化
    preload: [],         // 預加載模組
  }
}
```

---

## 🎯 Phase 4：性能優化和監控

### Task 4.1：性能基準測試
**文件位置**：`packages/stream/tests/benchmarks/workers.bench.ts`

**測試場景**：
1. 簡單字符串消息傳遞
2. 複雜對象序列化
3. 高並發 job 執行（1000 jobs）
4. 內存占用對比

**預期結果**：
- ⚡ Bun Workers 消息傳遞 50-200% 快於 Node.js
- 🧠 內存占用減少 20-40%（啟用 `smol` 模式）

---

### Task 4.2：監控和日誌
**文件位置**：修改 `packages/stream/src/workers/`

**實現內容**：
- 添加 `GRAVITO_WORKER_DEBUG` 環境變數
- 記錄 runtime 檢測結果
- 性能指標：
  - 消息大小 / 序列化耗時
  - worker 啟動耗時
  - 記憶體占用（Bun 相對 Node.js）

---

## 🎯 Phase 5：文檔和示例

### Task 5.1：開發文檔
**文件位置**：`docs/guides/BUN_WORKERS_GUIDE.md`

**內容**：
1. Bun Workers 簡介
2. 性能對比數據
3. 配置示例
4. 遷移指南（Node.js → Bun）
5. 故障排除

### Task 5.2：示例應用
**文件位置**：`examples/bun-workers-example/`

**示例場景**：
- 基本 job 隊列
- CPU 密集任務
- 大文件處理
- 性能監控面板

---

## 🎯 Phase 6：測試和驗證

### Task 6.1：單元測試
**文件位置**：`packages/stream/tests/workers/`

```typescript
// BunWorker.test.ts
describe('BunWorker (Bun Runtime)', () => {
  it('executes simple jobs', async () => { ... })
  it('respects execution timeout', async () => { ... })
  it('handles TypeScript jobs natively', async () => { ... })
  it('uses preload modules', async () => { ... })
})

// WorkerFactory.test.ts
describe('RuntimeAwareWorkerFactory', () => {
  it('detects Bun runtime', () => { ... })
  it('detects Node.js runtime', () => { ... })
  it('respects runtime override', () => { ... })
})
```

### Task 6.2：集成測試
**文件位置**：`packages/stream/tests/integration/workers.int.ts`

```typescript
describe('WorkerPool with Bun Runtime', () => {
  it('handles concurrent jobs', async () => { ... })
  it('maintains pool statistics', async () => { ... })
  it('recovers from worker crashes', async () => { ... })
})
```

---

## 📊 成功標準

| 指標 | 目標 | 驗證方法 |
|------|------|--------|
| TypeScript 支持 | ✅ 原生執行無編譯 | CI 測試通過 |
| 性能 | ⚡ 比 Node 快 2x | 基準測試 |
| 內存 | 🧠 減少 30% | 內存監控 |
| 測試覆蓋 | ✅ 80%+ | Coverage report |
| 向後兼容性 | ✅ 100% | 現有測試全過 |

---

## 🔄 實施順序

1. **Phase 1**：實現核心 BunWorker（Task 1.1、1.2）
2. **Phase 2**：抽象層（Task 2.1、2.2）
3. **Phase 4.1**：性能測試（早期驗證價值）
4. **Phase 3**：配置系統（Task 3.1）
5. **Phase 6**：測試驗證（Task 6.1、6.2）
6. **Phase 5**：文檔示例（Task 5.1、5.2）

---

## 🚨 依賴和風險

### 依賴
- ✅ 框架已使用 Bun
- ✅ 已有 WorkerPool 基礎設施
- ✅ 測試框架就位

### 風險
| 風險 | 緩解方案 |
|------|--------|
| Bun Workers API 變化 | 監控 Bun 發佈說明，隔離實現 |
| Node.js 環境回退失敗 | 完整測試兩個 runtime |
| 模組預加載複雜性 | 從簡單配置開始，漸進增強 |

---

## 📝 提交記錄範例

```
feat: [stream] Add Bun Workers support with runtime auto-detection
- Implement BunWorker class with TypeScript-first execution
- Add RuntimeAwareWorkerFactory for automatic runtime detection
- Support Bun-specific optimizations: smol mode, preload modules
- Maintain backward compatibility with Node.js Worker Threads
- Add performance benchmarks showing 2x speedup
```
