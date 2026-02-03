---
title: 佇列系統 (Queues)
description: 了解如何使用 Gravito Stream 處理背景任務與非同步處理。
---

# 佇列系統 (Queues)

> 在背景處理耗時任務（如發送郵件、圖像處理），讓您的應用程式保持閃擊般的響應速度。

## 核心概念

Gravito 的佇列系統由 `@gravito/stream` 提供，支援多種驅動程式與延遲處理。

### 步驟 1：定義 Job

Job 是包裝業務邏輯的類別。

```typescript
import { Job } from '@gravito/stream'

export class ProcessOrder extends Job {
  constructor(private orderId: string) {
    super()
  }

  async handle(): Promise<void> {
    // 執行耗時邏輯...
    console.log(`正在處理訂單: ${this.orderId}`)
  }
}
```

### 步驟 2：推送到佇列

您可以在控制器或任何地方將 Job 推送到佇列：

```typescript
core.app.post('/orders', async (c) => {
  const queue = c.get('queue')
  
  // 立即推送
  await queue.push(new ProcessOrder('123'))

  // 延遲 10 分鐘處理
  await queue.push(new ProcessOrder('124'))
    .delay(600)

  return c.json({ message: '訂單已加入處理佇列' })
})
```

## 配置驅動程式

在 `gravito.config.ts` 中配置 `OrbitStream`：

```typescript
import { OrbitStream } from '@gravito/stream'

export default {
  orbits: [
    OrbitStream.configure({
      default: 'redis',
      connections: {
        memory: { driver: 'memory' },
        redis: {
          driver: 'redis',
          host: 'localhost',
          port: 6379
        }
      }
    })
  ]
}
```

## 執行 Worker

Worker 是負責監聽並執行 Job 的背景程序。

### 開發環境 (Embedded)

您可以配置 `autoStartWorker: true` 讓 Worker 隨應用程式一起啟動。

### 生產環境 (Standalone)

在生產環境，建議單獨執行 Worker 進程：

```bash
bun run gravito queue:work --connection=redis --queues=default
```

---

## 下一步
了解如何 [發送電子郵件](./mail.md) 並與佇列系統整合。
