---
title: Flux 工作流程
description: 具備重試與儲存介面的狀態機工作流程引擎。
---

# Flux 工作流程

Flux 不是「只是一段流程」，而是 Gravito 內的工作流標準：以「狀態機」為核心，將每一步的狀態與轉移明確化，讓流程可追蹤、可重播，並能以一致方式處理錯誤與恢復。它同時支援同步/非同步執行、工作流程化編排、逾時重試、事件 hooks 與儲存介面，特別適合長流程與高可靠性需求的場景。

## 適用情境

適合需要多步驟處理、可觀測性與可重試能力的流程，例如訂單履約、影像處理、報表生成、用戶註冊流程等。若你希望流程具備「明確狀態」與「故障可恢復」的能力，Flux 是最佳選擇。

## 安裝

```bash
bun add @gravito/flux
```

## 快速開始

```ts
import { FluxEngine, createWorkflow } from '@gravito/flux'

const onboarding = createWorkflow('onboarding')
  .input<{ userId: string }>()
  .step('load-user', async (ctx) => {
    ctx.data.user = await users.find(ctx.input.userId)
  })
  .commit('send-email', async (ctx) => {
    await mail.sendWelcome(ctx.data.user)
  })

const engine = new FluxEngine()
await engine.execute(onboarding, { userId: 'u_123' })
```

## 核心概念

- Workflow 由 Step 和 Commit 組成，透過 input/data 組合形成可追蹤狀態。
- Step 可讀寫共用狀態資料，支援 retries/timeout/when。
- Commit 表示需要確保落地的關鍵操作，適合寫入資料庫或外部系統。
- 儲存介面可保存流程狀態，支援流程重播與失敗恢復。
- 狀態機模型讓每一步狀態清晰可控，重試機制可自動處理不穩定的外部依賴。
- 事件 hooks 可在 stepStart/stepError 等時機掛載監控與告警。

## 定位與價值

- **工作流標準化**：在框架內用同一套模型描述流程，而不是每個服務自行手寫流程。
- **可靠性與可觀測**：狀態機 + 重試 + trace sink，讓流程可追蹤、可審計、可恢復。
- **可抽離與可複用**：Flux 可獨立於框架使用，讓 workflow 本身成為可移植的 workflow as code。

## 進階範例

### 訂單履約流程

```ts
import { FluxEngine, createWorkflow } from '@gravito/flux'

const orderFlow = createWorkflow('order-fulfillment')
  .input<{ orderId: string; items: { productId: string; qty: number }[] }>()
  .step('validate', async (ctx) => {
    for (const item of ctx.input.items) {
      const stock = await inventory.getStock(item.productId)
      if (stock < item.qty) throw new Error(`Out of stock: ${item.productId}`)
    }
  })
  .step(
    'charge',
    async (ctx) => {
      ctx.data.payment = await payment.charge(ctx.input.orderId)
    },
    { retries: 3, timeout: 30_000 }
  )
  .commit('reserve', async (ctx) => {
    ctx.data.reservationIds = await inventory.reserve(ctx.input.items)
  })
  .commit('notify', async (ctx) => {
    await email.send(ctx.input.orderId, 'order-confirmed', ctx.data)
  })

const engine = new FluxEngine()
await engine.execute(orderFlow, { orderId: 'o_001', items: [] })
```

### 影像處理流程

```ts
const imageFlow = createWorkflow('image-processing')
  .input<{ fileBuffer: Buffer; fileName: string }>()
  .step('validate', async (ctx) => {
    if (ctx.input.fileBuffer.length > 10 * 1024 * 1024) {
      throw new Error('File too large')
    }
  })
  .step('resize', async (ctx) => {
    ctx.data.thumbnail = await sharp(ctx.input.fileBuffer).resize(200).toBuffer()
  })
  .commit('upload', async (ctx) => {
    ctx.data.url = await s3.upload(ctx.input.fileName, ctx.data.thumbnail)
  })
```

## 重試、逾時與條件執行

重試與逾時是 Flux 的關鍵能力，讓流程即使面對不穩定服務也能自動恢復。

```ts
const flow = createWorkflow('notify')
  .input<{ userId: string; enabled: boolean }>()
  .step(
    'send',
    async (ctx) => {
      await notifier.send(ctx.input.userId)
    },
    {
      retries: 5,
      timeout: 10_000,
      when: (ctx) => ctx.input.enabled,
    }
  )
```

## 儲存介面

```ts
import { FluxEngine, MemoryStorage } from '@gravito/flux'
const engine = new FluxEngine({ storage: new MemoryStorage() })
```

```ts
import { FluxEngine } from '@gravito/flux'
import { BunSQLiteStorage } from '@gravito/flux/bun'

const engine = new FluxEngine({
  storage: new BunSQLiteStorage({ path: './data/workflows.db' }),
})
```

## 重跑指定步驟

若需要在流程失敗後重跑某個 step，可使用 `retryStep` 直接從指定步驟重新開始，後續步驟會依序再執行。

```ts
const first = await engine.execute(flow, { orderId: 'ORD-001' })
// 修復外部依賴後重跑
await engine.retryStep(flow, first.id, 'charge')
```

## 事件 Hooks

```ts
import { FluxEngine, FluxConsoleLogger } from '@gravito/flux'

const engine = new FluxEngine({
  logger: new FluxConsoleLogger(),
  on: {
    stepStart: (step, ctx) => {},
    stepComplete: (step, ctx, result) => {},
    stepError: (step, ctx, error) => {},
    workflowComplete: (ctx) => {},
    workflowError: (ctx, error) => {},
  },
})
```

## 像在寫一個 n8n

Flux 可以用程式化方式描述流程節點與連線關係，適合用「可版本控制的 workflow as code」來建立自動化流程。你可以像定義節點一樣定義 step，把觸發、邏輯與副作用拆成清晰的區塊，再透過重試與逾時策略保證穩定性。

### 分支流程（多支點）

```ts
import { FluxEngine, createWorkflow } from '@gravito/flux'

const flow = createWorkflow('event-routing')
  .input<{ payload: EventPayload }>()
  .step('classify', async (ctx) => {
    ctx.data.route = classify(ctx.input.payload) // 'auto' | 'manual' | 'risk'
  })
  .step(
    'auto-handle',
    async (ctx) => {
      ctx.data.result = await autoProcess(ctx.input.payload)
    },
    { when: (ctx) => ctx.data.route === 'auto' }
  )
  .step(
    'manual-review',
    async (ctx) => {
      ctx.data.ticketId = await ticketing.create(ctx.input.payload)
    },
    { when: (ctx) => ctx.data.route === 'manual' }
  )
  .step(
    'risk-audit',
    async (ctx) => {
      ctx.data.auditId = await auditQueue.enqueue(ctx.input.payload)
    },
    { when: (ctx) => ctx.data.route === 'risk' }
  )
  .commit('notify', async (ctx) => {
    await notifier.send(ctx.data)
  })

const engine = new FluxEngine()
await engine.execute(flow, { payload: eventPayload })
```

## 本地開發視覺化

開發階段可啟用 Trace Sink，將事件流輸出為 NDJSON，並使用內建 CLI 開啟 Dev Viewer 直觀檢視流程走向與重試狀態。

```ts
import { FluxEngine, JsonFileTraceSink } from '@gravito/flux'

const engine = new FluxEngine({
  trace: new JsonFileTraceSink({ path: './.flux/trace.ndjson', reset: true }),
})
```

```bash
flux dev --trace ./.flux/trace.ndjson --port 4280
```

### 驗證流程（本 repo）

```bash
bun run examples/trace-viewer.ts
bun run dev:viewer
```

## 企業級追蹤

Flux 的 Trace Sink 可以接到你既有的觀測/排程模組，將 workflow 的事件流寫入資料庫或監控系統，後續可做執行查詢、重播、告警與監控面板。

## 與 Gravito 整合

```ts
import { OrbitFlux } from '@gravito/flux'

const core = await PlanetCore.boot({
  orbits: [
    new OrbitFlux({
      storage: 'sqlite',
      dbPath: './data/workflows.db',
    }),
  ],
})

const flux = core.services.get<FluxEngine>('flux')
await flux.execute(onboarding, { userId: 'u_123' })
```

## 下一步

- 使用 [佇列](./queues.md) 分流重任務
- 透過 [Horizon](./horizon.md) 排程週期性流程
