# @gravito/stream

> Galaxy 架構的高效能輕量化隊列與背景任務系統。

[![npm version](https://img.shields.io/npm/v/@gravito/stream.svg)](https://www.npmjs.com/package/@gravito/stream)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/stream** 是 Gravito 應用程式的標準背景處理單元。基於 **Orbit** 模式構建，它為各種訊息代理（Broker）和隊列系統提供了統一的抽象層，讓您能夠從簡單的記憶體任務無縫擴展到分佈式事件驅動架構。

## ✨ 特性

- 🪐 **Orbit 整合** - 與 PlanetCore 微核心及依賴注入系統原生整合。
- 🔌 **多 Broker 支援** - 內建支援 **Redis**、**SQS**、**Kafka**、**RabbitMQ**、**資料庫** (SQL) 與 **記憶體** (Memory) 驅動。
- 🛠️ **基於 Job 的 API** - 簡潔的類別式（Class-based）任務定義，內建序列化與錯誤處理。
- 🚀 **高吞吐量** - 針對 **Bun** 進行優化，支援批量消費（Batching）、並發處理與自適應輪詢（Polling）。
- 🛡️ **可靠性** - 內建指數退避重試（Exponential Backoff）、死信隊列（DLQ）與順序任務分組。
- 📝 **審計與持久化** - 可選的 SQL 持久化層，用於存檔任務歷史並提供完整的審計追蹤（Audit Trail）。
- 🕒 **排程器** - 內建基於 CRON 的排程功能，支援週期性任務。
- 🏢 **Worker 模式** - 開發環境可運行嵌入式 Worker，生產環境可運行獨立 Worker 進程。

## 📦 安裝

```bash
bun add @gravito/stream
```

## 🚀 快速上手

### 1. 定義任務 (Job)

建立一個繼承自 `Job` 的類別並實作 `handle` 邏輯：

```typescript
import { Job } from '@gravito/stream';

export class ProcessOrder extends Job {
  constructor(private orderId: string) {
    super();
  }

  async handle(): Promise<void> {
    // 業務邏輯：處理訂單
    console.log(`正在處理訂單: ${this.orderId}`);
  }

  async failed(error: Error): Promise<void> {
    // 選配：在永久失敗時進行清理或通知
    console.error(`訂單 ${this.orderId} 失敗: ${error.message}`);
  }
}
```

### 2. 初始化 OrbitStream

在應用程式啟動時註冊 Orbit：

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitStream } from '@gravito/stream';

const core = new PlanetCore();

core.addOrbit(OrbitStream.configure({
  default: 'redis',
  connections: {
    redis: {
      driver: 'redis',
      host: 'localhost',
      port: 6379
    }
  },
  autoStartWorker: process.env.NODE_ENV === 'development',
  workerOptions: { queues: ['default'] }
}));

await core.bootstrap();
```

### 3. 將任務推入隊列

從請求上下文或容器中獲取 `queue` 服務：

```typescript
core.app.post('/orders', async (c) => {
  const { id } = await c.req.json();
  const queue = c.get('queue');

  // 使用流暢介面進行配置
  await queue.push(new ProcessOrder(id))
    .onQueue('high-priority') // 指定隊列
    .delay(30)                // 延遲 30 秒執行
    .backoff(5, 2);           // 重試策略：初始延遲 5s，之後每次翻倍

  return c.json({ success: true });
});
```

## 🔧 進階配置

### 多隊列與並發處理

配置消費者以處理不同優先級的隊列與並發等級：

```typescript
const consumer = new Consumer(manager, {
  queues: ['critical', 'default', 'low'],
  concurrency: 10,           // 最大同時執行 10 個任務
  groupJobsSequential: true, // 相同 groupId 的任務將嚴格依序執行
  batchSize: 5,              // 每次輪詢獲取 5 個任務
});
```

### 持久化與審計追蹤

保留所有任務（成功、失敗或排隊中）的歷史記錄：

```typescript
OrbitStream.configure({
  // ... 連線配置
  persistence: {
    adapter: new SQLitePersistence(db),
    archiveCompleted: true,
    archiveFailed: true,
    archiveEnqueued: true, // 審計模式：推入隊列時立即記錄
    bufferSize: 100        // 批量寫入以提升效能
  }
});
```

## 📖 API 參考

### `QueueManager`

透過 `c.get('queue')` 或 `core.container.make('queue')` 獲取。

- **`push(job)`**: 將任務派發至隊列。
- **`pushMany(jobs)`**: 高效派發多個任務。
- **`size(queue?)`**: 獲取隊列中的任務數量。
- **`clear(queue?)`**: 清空隊列中的所有任務。

### `Job` 流暢方法

- **`onQueue(name)`**: 指定目標隊列。
- **`onConnection(name)`**: 使用特定連線。
- **`delay(seconds)`**: 設置初始延遲。
- **`backoff(seconds, multiplier?)`**: 配置重試策略。
- **`withPriority(priority)`**: 設置任務優先級。

## 🔌 支援的驅動 (Drivers)

- **Redis** - 功能豐富（支援 DLQ、限流、優先級）。
- **SQS** - AWS 託管隊列（Standard/FIFO）。
- **Kafka** - 高吞吐量分佈式串流。
- **RabbitMQ** - 傳統 AMQP 代理。
- **Database** - 簡單的 SQL 持久化方案（PostgreSQL, MySQL, SQLite）。
- **Memory** - 快速、開發/測試環境零配置。

## 🤝 貢獻

歡迎提交貢獻、問題與功能請求！
請隨時查看 [Issues 頁面](https://github.com/gravito-framework/gravito/issues)。

## 📝 授權

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
