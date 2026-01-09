# @gravito/flux

> Gravito 的高效能工作流程引擎，跨平台、型別安全的狀態機，強調可追蹤、可重播與可靠重試。

## 定位與價值

- **工作流標準化**：在框架內用同一套模型描述流程，而不是每個服務自行手寫流程。
- **可靠性與可觀測**：狀態機 + 重試 + trace sink，讓流程可追蹤、可審計、可恢復。
- **可抽離與可複用**：Flux 可獨立於框架使用，讓 workflow 本身成為可移植的 workflow as code。

## API 語意（input / step / commit）

- `input<T>()`：定義輸入資料型別，提供型別推斷與編輯器提示。
- `step(name, handler, options)`：一般步驟，會依序執行，可設定重試/逾時/條件。
- `commit(name, handler, options)`：具副作用的步驟（寫庫、扣款、通知），在重播或重跑時語意更明確。

## 最佳實務與注意事項

- **儲存介面**：Memory 僅適合開發與測試，正式環境請使用持久化 storage。
- **版本變更**：workflow 定義改動時，既有流程的重跑需評估相容性。
- **重試策略**：外部依賴錯誤才重試，業務邏輯錯誤建議直接 fail。
- **Step vs Commit**：有副作用的操作應放在 commit，確保重播一致性。

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

## 暫停與信號 (Async Signals)

流程可以暫停並等待外部事件（如人工審核、Webhook 回調）。

```typescript
.step('wait-approval', async () => {
    // 掛起流程，狀態轉為 suspended，釋放資源
    return Flux.wait('approval-signal')
})

// 喚醒流程
await engine.signal(workflow, id, 'approval-signal', { approved: true })
```

## Saga Pattern (自動補償)

支援分散式事務的最終一致性。當流程失敗時，引擎會自動反向執行已定義的 `compensate` 邏輯。

```typescript
.step('reserve-flight', 
  async (ctx) => {
    ctx.data.flightId = await api.bookFlight()
  },
  { 
    // 若後續步驟失敗，會自動執行此回滾邏輯
    compensate: async (ctx) => {
      await api.cancelFlight(ctx.data.flightId)
    }
  }
)
```

## 重跑指定步驟

```typescript
const first = await engine.execute(flow, { orderId: 'ORD-001' })
await engine.retryStep(flow, first.id, 'charge')
```

## 與隊列搭配的應用

隊列消費者只負責觸發 Flux，Flux 會把任務拆成多步驟 workflow。當某一步失敗時，只重試該步，不會重跑已完成的步驟。

```typescript
queue.on('message', async (job) => {
  await flux.execute(orderFlow, job.data)
})
```

搭配持久化 storage，已完成的步驟會被保留，避免重複執行。

### Kafka 完整案例（事件 → 消費者 → Flux）

**1) 事件觸發：把任務丟進 Kafka**

```typescript
import { Kafka } from 'kafkajs'

const kafka = new Kafka({ clientId: 'orders', brokers: ['localhost:9092'] })
const producer = kafka.producer()

await producer.connect()
await producer.send({
  topic: 'order.created',
  messages: [
    { key: 'ORD-001', value: JSON.stringify({ orderId: 'ORD-001', userId: 'u_1' }) },
  ],
})
```

**2) 消費者接到任務後交給 Flux**

```typescript
import { Kafka } from 'kafkajs'
import { createWorkflow, FluxEngine, MemoryStorage } from '@gravito/flux'

const orderFlow = createWorkflow('order-flow')
  .input<{ orderId: string; userId: string }>()
  .step('validate', async (ctx) => {
    ctx.data.validated = true
  })
  .step('reserve', async (ctx) => {
    ctx.data.reserved = true
  })
  .commit('notify', async () => {})

const flux = new FluxEngine({ storage: new MemoryStorage() })

const kafka = new Kafka({ clientId: 'orders-worker', brokers: ['localhost:9092'] })
const consumer = kafka.consumer({ groupId: 'order-workers' })

await consumer.connect()
await consumer.subscribe({ topic: 'order.created' })
await consumer.run({
  eachMessage: async ({ message }) => {
    const payload = JSON.parse(message.value?.toString() ?? '{}')
    await flux.execute(orderFlow, payload)
  },
})
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

## 多節點任務（類似 n8n）

```typescript
const flow = createWorkflow('multi-node')
  .input<{ type: 'email' | 'slack' | 'webhook'; payload: unknown }>()
  .step('classify', async (ctx) => {
    ctx.data.route = ctx.input.type
  })
  .step(
    'send-email',
    async (ctx) => {
      await email.send(ctx.input.payload)
    },
    { when: (ctx) => ctx.data.route === 'email' }
  )
  .step(
    'send-slack',
    async (ctx) => {
      await slack.send(ctx.input.payload)
    },
    { when: (ctx) => ctx.data.route === 'slack' }
  )
  .step(
    'call-webhook',
    async (ctx) => {
      await webhook.post(ctx.input.payload)
    },
    { when: (ctx) => ctx.data.route === 'webhook' }
  )
  .commit('audit', async (ctx) => {
    await audit.save(ctx.data)
  })
```

<img
  src="./assets/flux-branching.svg"
  alt="Flux branching diagram"
  style="max-width: 720px; width: 100%; height: auto; display: block; margin: 12px 0;"
/>

上圖對應 `when` 條件：只會走符合條件的分支，未符合者會被標記為 skipped。

### 可執行分支範例

```bash
bun run examples/branching.ts
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

## 以微服務或 AWS Lambda 部署

Flux 可抽離成無狀態 workflow runner。把 workflow 定義與 input 交給函式執行，再將狀態與 trace 寫入外部儲存即可：

```typescript
import { FluxEngine, JsonFileTraceSink, MemoryStorage, createWorkflow } from '@gravito/flux'

const workflow = createWorkflow('lambda-flow')
  .input<{ orderId: string }>()
  .step('prepare', async (ctx) => {
    ctx.data.ready = true
  })
  .commit('notify', async () => {})

const engine = new FluxEngine({
  storage: new MemoryStorage(),
  trace: new JsonFileTraceSink({ path: '/tmp/flux-trace.ndjson', reset: false }),
})

export const handler = async (event: { orderId: string }) => {
  const result = await engine.execute(workflow, { orderId: event.orderId })
  return { status: result.status, id: result.id }
}
```

### 其他雲端函式範例

GCP Cloud Functions（HTTP，需安裝對應套件並確認最新版本）：

```typescript
import type { HttpFunction } from '@google-cloud/functions-framework'

export const runFlux: HttpFunction = async (req, res) => {
  const payload = req.body ?? {}
  const result = await engine.execute(workflow, payload)
  res.json({ status: result.status, id: result.id })
}
```

Azure Functions（HTTP Trigger，需安裝對應套件並確認最新版本）：

```typescript
import type { AzureFunction, Context, HttpRequest } from '@azure/functions'

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest) => {
  const payload = req.body ?? {}
  const result = await engine.execute(workflow, payload)
  context.res = { status: 200, body: { status: result.status, id: result.id } }
}

export default httpTrigger
```

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
