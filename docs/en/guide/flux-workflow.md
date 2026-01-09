---
title: Flux Workflow
description: State-machine workflow engine with retries and storage adapters.
---

# Flux Workflow

Flux is Gravito's workflow standard: a state-machine engine that makes every step explicit and traceable. It supports synchronous or async execution, retries, timeouts, event hooks, and storage adapters. This makes it ideal for long-running flows that must recover reliably.

## When to use Flux

Use Flux for multi-step processes that need observability, retries, and clear separation between steps. Typical examples include order fulfillment, media processing, report generation, and onboarding flows.

## Installation

```bash
bun add @gravito/flux
```

## Quick Start

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

## Core Concepts

- A workflow is composed of steps and commits, with input/data forming the traceable state.
- Steps read/write shared data and can configure retries, timeouts, and `when` conditions.
- Commits represent durable, side-effecting actions (DB writes, payments, notifications).
- Storage adapters persist workflow state for replay and recovery.
- The state-machine model makes each step predictable and retry-safe.
- Event hooks let you attach monitoring and alerting at stepStart/stepError, etc.

## API Semantics (input / step / commit)

- `input<T>()`: defines the input type for inference and editor hints.
- `step(name, handler, options)`: normal steps, executed in order with retries/timeout/when.
- `commit(name, handler, options)`: durable, side-effecting steps for DB writes or external calls.

## Positioning & Value

- **Workflow standardization**: a single model instead of ad-hoc flow logic per service.
- **Reliability & observability**: state machine + retries + trace sinks.
- **Portability**: Flux can be used standalone as workflow-as-code.

## Best Practices

- **Storage**: Memory is for dev/testing. Use persistent storage in production.
- **Versioning**: if step names change, consider compatibility for in-flight workflows.
- **Retries**: retry external dependency failures; fail fast for business logic errors.
- **Step vs Commit**: put side effects in commit to keep replay semantics clean.

## Advanced Examples

### Order Fulfillment Flow

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

### Image Processing Flow

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

## Retries & Timeouts

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
    }
  )
```

## Conditional Execution

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

## Storage Adapters

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

## Retry a Specific Step

```ts
const first = await engine.execute(flow, { orderId: 'ORD-001' })
await engine.retryStep(flow, first.id, 'charge')
```

## Pairing With Queues

```ts
queue.on('message', async (job) => {
  await flux.execute(orderFlow, job.data)
})
```

### Kafka Example (Event -> Consumer -> Flux)

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

## Enterprise RabbitMQ workflow

The `examples/flux-enterprise` folder walks through a runnable RabbitMQ → Flux proof of concept (exchange `orders.workflow`, queue `orders.workflow`, a Gravito consumer, and a `JsonFileTraceSink`). It covers retries, health checks (`bun gravito doctor`), and trace observability in a single package.

1. Copy the environment template, start RabbitMQ, and run the consumer:

```bash
cp examples/flux-enterprise/.env.example examples/flux-enterprise/.env
docker compose -f docker-compose.flux.yml up -d rabbitmq
cd examples/flux-enterprise
bun run src/consumer.ts
```

2. Publish an order via the included HTTP producer or helper script:

```bash
bun run src/server.ts
curl -X POST http://localhost:4002/orders \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"u1","items":[{"productId":"widget-b","qty":1}]}'
# or
bun run scripts/publish-order.ts
```

3. Tail the trace file to follow each workflow step and retry count:

```bash
curl http://localhost:4002/trace | tail
```

4. Visit the built-in dashboard at `http://localhost:4002/` to publish orders via a button and see queue + workflow trace updates (the UI polls `/trace-events` and highlights retries/errors, and the animated canvas visualizes each stage as a flying particle so you can intuitively feel retries or forwards movement).

5. Re-run the full DX verification when you change the demo:

```bash
bun run examples/flux-enterprise/flux-enterprise.ts
```

The example README explains the RabbitMQ exchange/queue, the `tracePath` location, and the workflow steps in detail.

## Event Hooks

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

## Workflow as Code (n8n-style)

```ts
import { FluxEngine, createWorkflow } from '@gravito/flux'

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

const engine = new FluxEngine()
await engine.execute(flow, { payload: eventPayload })
```

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

```bash
bun run examples/branching.ts
```

## Local Trace Viewer

```ts
import { FluxEngine, JsonFileTraceSink } from '@gravito/flux'

const engine = new FluxEngine({
  trace: new JsonFileTraceSink({ path: './.flux/trace.ndjson', reset: true }),
})
```

```bash
flux dev --trace ./.flux/trace.ndjson --port 4280
```

### Verify (This Repo)

```bash
bun run examples/trace-viewer.ts
bun run dev:viewer
```

## Enterprise Tracing

Flux Trace Sinks can connect to your observability stack to store workflow events, enabling querying, replay, alerting, and dashboards.

## Deploy as Microservice or AWS Lambda

```ts
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

### Other Cloud Function Examples

```ts
import type { HttpFunction } from '@google-cloud/functions-framework'

export const runFlux: HttpFunction = async (req, res) => {
  const payload = req.body ?? {}
  const result = await engine.execute(workflow, payload)
  res.json({ status: result.status, id: result.id })
}
```

```ts
import type { AzureFunction, Context, HttpRequest } from '@azure/functions'

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest) => {
  const payload = req.body ?? {}
  const result = await engine.execute(workflow, payload)
  context.res = { status: 200, body: { status: result.status, id: result.id } }
}

export default httpTrigger
```

## Integrate With Gravito

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

## Next Steps

- Offload heavy work via [Queues](./queues.md)
- Schedule recurring flows with [Horizon](./horizon.md)
