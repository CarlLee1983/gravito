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

## API 語意（input / step / commit）

- `input<T>()`：定義輸入資料型別，提供型別推斷與編輯器提示。
- `step(name, handler, options)`：一般步驟，會依序執行，可設定重試/逾時/條件。
- `commit(name, handler, options)`：具副作用的步驟（寫庫、扣款、通知），在重播或重跑時語意更明確，建議把會產生外部影響的操作放在 commit。

## 定位與價值

- **工作流標準化**：在框架內用同一套模型描述流程，而不是每個服務自行手寫流程。
- **可靠性與可觀測**：狀態機 + 重試 + trace sink，讓流程可追蹤、可審計、可恢復。
- **可抽離與可複用**：Flux 可獨立於框架使用，讓 workflow 本身成為可移植的 workflow as code。

## 最佳實務與注意事項

- **儲存介面**：Memory 僅適合開發與測試，正式環境請使用持久化 storage，避免流程狀態遺失。
- **版本變更**：若 workflow 定義改動（步驟新增/刪除/改名），既有流程的重跑需評估相容性。
- **重試策略**：建議針對外部依賴錯誤重試；業務邏輯錯誤應直接 fail 以避免無限重試。
- **Step vs Commit**：會產生副作用的操作（寫庫、扣款、通知）應放在 commit，確保重播語意一致。

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

## 重試與逾時

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
      timeout: 10_000, // 10 秒（TypeScript 數字分隔符寫法）
    }
  )
```

## 條件執行

`when` 用來決定是否執行某個 step，條件不成立時會被標記為 `skipped`，不代表重試。

```ts
const flow = createWorkflow('notify')
  .input<{ userId: string; enabled: boolean }>()
  .step(
    'send',
    async (ctx) => {
      await notifier.send(ctx.input.userId)
    },
    {
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

## 與隊列搭配的應用

將隊列消費者作為「觸發器」，把工作交給 Flux 執行，可以把單一任務拆成多步驟的 workflow。當某一步失敗時，只會重試該步，而不是整個任務從頭重跑。

```ts
// Queue consumer
queue.on('message', async (job) => {
  await flux.execute(orderFlow, job.data)
})
```

搭配持久化 storage，已完成的步驟會被保留，避免重複執行；這讓隊列重試與 workflow 重試的職責分離，流程更穩定、更可控。

### Kafka 完整案例（事件 → 消費者 → Flux）

**1) 事件觸發：把任務丟進 Kafka**

```ts
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

```ts
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

## 企業級 RabbitMQ 工作流

`examples/flux-enterprise` 是一個可以實際運行的 RabbitMQ → Flux 範例，搭配 `docker-compose.flux.yml` 啟用 `orders.workflow` exchange/queue、Flux consumer、`JsonFileTraceSink` 追蹤，每個 step 都能看到 retry 次數與錯誤。

1. 複製環境設定、啟 RabbitMQ 並啟動 consumer：

```bash
cp examples/flux-enterprise/.env.example examples/flux-enterprise/.env
docker compose -f docker-compose.flux.yml up -d rabbitmq
cd examples/flux-enterprise
bun run src/consumer.ts
```

2. 另開一個終端啟動 HTTP 伺服器或直接用 helper script 發單：

```bash
bun run src/server.ts
curl -X POST http://localhost:4002/orders -H "Content-Type: application/json" -d '{"userId":"u1","items":[{"productId":"widget-b","qty":1}]}'
# 或
bun run scripts/publish-order.ts
```

3. 查 trace 檔案，確認每個 step 的狀態與重試：

```bash
curl http://localhost:4002/trace | tail
```

4. 造訪內建的儀表板（`http://localhost:4002/`），按一次「Publish sample order」就能送出任務並即時看到追蹤事件、重試與錯誤，畫面的 canvas timeline 會用飛行粒子標記每個 stage 以傳達事件流動與重試的感覺。

5. 每次修改 demo 時，跑一次 DX 驗證腳本：

```bash
bun run examples/flux-enterprise/flux-enterprise.ts
```

更多細節請見 `examples/flux-enterprise/README.md`，裡面說明了 RabbitMQ exchange/queue、trace 路徑與整個 workflow 的運作。

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

### 多節點任務（類似 n8n）

```ts
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
  src="/static/image/flux-branching.svg"
  alt="Flux branching diagram"
  style="max-width: 720px; width: 100%; height: auto; display: block; margin: 12px 0;"
/>

上圖對應 `when` 條件：只會走符合條件的分支，未符合者會被標記為 skipped。

### 可執行分支範例

```bash
bun run examples/branching.ts
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

## 以微服務或 AWS Lambda 部署

Flux 可以抽離成無狀態 workflow runner。把 workflow 定義與 input 交給函式執行，再將狀態與 trace 寫入外部儲存即可。以下為 Lambda 範例（示意）：

```ts
import { FluxEngine, JsonFileTraceSink, MemoryStorage, createWorkflow } from '@gravito/flux'

const workflow = createWorkflow('lambda-flow')
  .input<{ orderId: string }>()
  .step('prepare', async (ctx) => {
    ctx.data.ready = true
  })
  .commit('notify', async () => {})

const engine = new FluxEngine({
  storage: new MemoryStorage(), // 實務上可換成 DynamoDB / Postgres adapter
  trace: new JsonFileTraceSink({ path: '/tmp/flux-trace.ndjson', reset: false }),
})

export const handler = async (event: { orderId: string }) => {
  const result = await engine.execute(workflow, { orderId: event.orderId })
  return { status: result.status, id: result.id }
}
```

### 其他雲端函式範例

GCP Cloud Functions（HTTP，需安裝對應套件並確認最新版本）：

```ts
import type { HttpFunction } from '@google-cloud/functions-framework'

export const runFlux: HttpFunction = async (req, res) => {
  const payload = req.body ?? {}
  const result = await engine.execute(workflow, payload)
  res.json({ status: result.status, id: result.id })
}
```

Azure Functions（HTTP Trigger，需安裝對應套件並確認最新版本）：

```ts
import type { AzureFunction, Context, HttpRequest } from '@azure/functions'

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest) => {
  const payload = req.body ?? {}
  const result = await engine.execute(workflow, payload)
  context.res = { status: 200, body: { status: result.status, id: result.id } }
}

export default httpTrigger
```

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
