# @gravito/flux

> Gravito 的高效能工作流程引擎，跨平台、型別安全的狀態機，強調可追蹤、可重播與可靠重試。

## 定位與價值

- **工作流標準化**：在框架內用同一套模型描述流程，而不是每個服務自行手寫流程。
- **可靠性與可觀測**：狀態機 + 重試 + trace sink，讓流程可追蹤、可審計、可恢復。
- **可抽離與可複用**：Flux 可獨立於框架使用，讓 workflow 本身成為可移植的 workflow as code。

## 核心特色

- **純狀態機模型** - 以明確狀態描述流程，讓每一步清晰可控
- **鏈式 Builder API** - 型別安全的流程定義方式
- **儲存介面** - Memory、Bun SQLite，其他儲存可自訂
- **重試與逾時** - Step 可設定 retries/timeout/when，面對不穩定依賴也能自動恢復
- **同步/非同步** - 同時支援同步流程與非同步長流程
- **事件 Hooks** - 監聽流程與步驟生命週期
- **事件 Hooks** - 監聽流程與步驟生命周期
- **雙平台支援** - Bun 與 Node.js 均可使用

## 安裝

```bash
bun add @gravito/flux

# npm
npm install @gravito/flux
```

## 快速開始

```typescript
import { FluxEngine, createWorkflow } from '@gravito/flux'

const orderFlow = createWorkflow('order-process')
  .input<{ orderId: string }>()
  .step('fetch', async (ctx) => {
    ctx.data.order = await db.orders.find(ctx.input.orderId)
  })
  .step('validate', async (ctx) => {
    if (!ctx.data.order.isPaid) throw new Error('Unpaid order')
  })
  .commit('fulfill', async (ctx) => {
    await fulfillment.ship(ctx.data.order)
  })

const engine = new FluxEngine()
const result = await engine.execute(orderFlow, { orderId: '123' })
```

## 範例

### 訂單履約

```typescript
const orderWorkflow = createWorkflow('order-fulfillment')
  .input<{ orderId: string; items: Item[] }>()
  .step('validate', async (ctx) => {
    for (const item of ctx.input.items) {
      const stock = await db.products.getStock(item.productId)
      if (stock < item.qty) throw new Error(`Out of stock: ${item.productId}`)
    }
  })
  .step(
    'payment',
    async (ctx) => {
      ctx.data.payment = await payment.charge(ctx.input.orderId)
    },
    { retries: 3, timeout: 30_000 }
  )
  .commit('deduct', async (ctx) => {
    await inventory.deduct(ctx.data.reservationIds)
  })
```

### 影像處理

```typescript
const uploadWorkflow = createWorkflow('image-processing')
  .input<{ fileBuffer: Buffer; fileName: string; userId: string }>()
  .step('validate', async (ctx) => {
    if (ctx.input.fileBuffer.length > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB')
    }
  })
  .step('resize', async (ctx) => {
    ctx.data.thumbnail = await sharp(ctx.input.fileBuffer).resize(200).toBuffer()
  })
  .commit('upload', async (ctx) => {
    ctx.data.url = await s3.upload(ctx.input.fileName, ctx.data.thumbnail)
  })
```

### 報表生成

```typescript
const reportWorkflow = createWorkflow('generate-report')
  .input<{ reportType: string; dateRange: DateRange; requestedBy: string }>()
  .step('fetch-data', async (ctx) => {
    ctx.data.sales = await db.orders.aggregate(ctx.input.dateRange)
  }, { timeout: 60_000 })
  .step('calculate', async (ctx) => {
    ctx.data.metrics = { revenue: 0, orders: 0 }
  })
  .commit('upload', async (ctx) => {
    ctx.data.url = await s3.upload(`reports/${ctx.id}.pdf`, ctx.data.pdf)
  })
```

## API

### `createWorkflow(name)`

```typescript
const flow = createWorkflow('my-workflow')
  .input<{ value: number }>()
  .step('step1', handler)
  .step('step2', handler, { retries: 3 })
  .commit('save', handler)
```

### `FluxEngine`

```typescript
const engine = new FluxEngine({
  storage: new MemoryStorage(),
  defaultRetries: 3,
  defaultTimeout: 30_000,
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

### Step Options

```typescript
.step('name', handler, {
  retries: 5,
  timeout: 60_000,
  when: (ctx) => ctx.data.x > 0,
})
```

## 重跑指定步驟

```typescript
const first = await engine.execute(flow, { orderId: 'ORD-001' })
await engine.retryStep(flow, first.id, 'charge')
```

## 分支流程（多支點）

```typescript
const flow = createWorkflow('event-routing')
  .input<{ payload: EventPayload }>()
  .step('classify', async (ctx) => {
    ctx.data.route = classify(ctx.input.payload)
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
```

## 本地開發視覺化

```typescript
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

透過 `FluxTraceSink` 可以把事件流送到你自己的監控、排程或分析模組，建立完整的執行查詢、重播與告警能力。

## 儲存介面

### MemoryStorage

```typescript
import { FluxEngine, MemoryStorage } from '@gravito/flux'
const engine = new FluxEngine({ storage: new MemoryStorage() })
```

### BunSQLiteStorage (Bun only)

```typescript
import { FluxEngine } from '@gravito/flux'
import { BunSQLiteStorage } from '@gravito/flux/bun'

const engine = new FluxEngine({
  storage: new BunSQLiteStorage({ path: './data/workflows.db' })
})
```

## Gravito 整合

```typescript
import { OrbitFlux } from '@gravito/flux'

const core = await PlanetCore.boot({
  orbits: [
    new OrbitFlux({
      storage: 'sqlite',
      dbPath: './data/workflows.db',
    })
  ]
})

const flux = core.services.get<FluxEngine>('flux')
await flux.execute(myWorkflow, input)
```

## 平台支援

| Feature | Bun | Node.js |
|---------|-----|---------|
| FluxEngine | ✅ | ✅ |
| MemoryStorage | ✅ | ✅ |
| BunSQLiteStorage | ✅ | ❌ |
| OrbitFlux | ✅ | ✅ |
