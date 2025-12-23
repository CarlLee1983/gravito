# @gravito/flux

> ⚡ Platform-agnostic, high-performance workflow engine for Gravito

## Features

- **Pure State Machine** - No runtime dependencies, Web Standard APIs only
- **Fluent Builder API** - Type-safe, chainable workflow definitions
- **Storage Adapters** - Memory, SQLite (Bun), PostgreSQL (coming soon)
- **Retry & Timeout** - Automatic retry with exponential backoff
- **Event Hooks** - Subscribe to workflow/step lifecycle events
- **Dual Platform** - Works with both Bun and Node.js

## Installation

```bash
# Bun
bun add @gravito/flux

# npm
npm install @gravito/flux
```

## Quick Start

```typescript
import { FluxEngine, createWorkflow } from '@gravito/flux'

// 1. Define workflow
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

// 2. Execute
const engine = new FluxEngine()
const result = await engine.execute(orderFlow, { orderId: '123' })

if (result.status === 'completed') {
  console.log('Order processed:', result.data)
}
```

## Examples

### 📦 Order Fulfillment

```typescript
const orderWorkflow = createWorkflow('order-fulfillment')
  .input<{ orderId: string; items: Item[] }>()
  .step('validate', async (ctx) => {
    for (const item of ctx.input.items) {
      const stock = await db.products.getStock(item.productId)
      if (stock < item.qty) throw new Error(`Out of stock: ${item.productId}`)
    }
  })
  .step('reserve', async (ctx) => {
    ctx.data.reservationIds = await inventory.reserve(ctx.input.items)
  })
  .step('payment', async (ctx) => {
    ctx.data.payment = await payment.charge(ctx.input.orderId)
  }, { retries: 3, timeout: 30000 })
  .commit('deduct', async (ctx) => {
    await inventory.deduct(ctx.data.reservationIds)
  })
  .commit('notify', async (ctx) => {
    await email.send(ctx.input.userId, 'order-confirmed', ctx.data)
  })
```

### 🖼️ Image Processing

```typescript
const uploadWorkflow = createWorkflow('image-processing')
  .input<{ fileBuffer: Buffer; fileName: string; userId: string }>()
  .step('validate', async (ctx) => {
    if (ctx.input.fileBuffer.length > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB')
    }
    ctx.data.mimeType = await detectMimeType(ctx.input.fileBuffer)
  })
  .step('scan', async (ctx) => {
    const result = await virusScanner.scan(ctx.input.fileBuffer)
    if (!result.clean) throw new Error('Malicious file detected')
  })
  .step('resize', async (ctx) => {
    ctx.data.thumbnail = await sharp(ctx.input.fileBuffer).resize(200).toBuffer()
  })
  .commit('upload', async (ctx) => {
    ctx.data.url = await s3.upload(ctx.input.fileName, ctx.data.compressed)
  })
```

### 👤 User Signup

```typescript
const signupWorkflow = createWorkflow('user-signup')
  .input<{ email: string; password: string; name: string }>()
  .step('validate', async (ctx) => {
    const exists = await db.users.findByEmail(ctx.input.email)
    if (exists) throw new Error('Email already in use')
  })
  .step('hash', async (ctx) => {
    ctx.data.hashedPassword = await bcrypt.hash(ctx.input.password, 12)
  })
  .commit('create', async (ctx) => {
    ctx.data.user = await db.users.create({
      email: ctx.input.email,
      password: ctx.data.hashedPassword,
      name: ctx.input.name,
    })
  })
  .commit('sendVerification', async (ctx) => {
    const token = await generateToken(ctx.data.user.id)
    await email.send(ctx.input.email, 'verify-email', { token })
  })
```

### 📈 Report Generation

```typescript
const reportWorkflow = createWorkflow('generate-report')
  .input<{ reportType: string; dateRange: DateRange; requestedBy: string }>()
  .step('fetch-data', async (ctx) => {
    ctx.data.sales = await db.orders.aggregate(ctx.input.dateRange)
    ctx.data.users = await db.users.getMetrics(ctx.input.dateRange)
  }, { timeout: 60000 })
  .step('calculate', async (ctx) => {
    ctx.data.metrics = {
      revenue: ctx.data.sales.reduce((sum, s) => sum + s.total, 0),
      orders: ctx.data.sales.length,
    }
  })
  .step('generate-pdf', async (ctx) => {
    ctx.data.pdf = await pdfGenerator.create(ctx.data.metrics)
  })
  .commit('upload', async (ctx) => {
    ctx.data.url = await s3.upload(`reports/${ctx.id}.pdf`, ctx.data.pdf)
  })
  .commit('notify', async (ctx) => {
    await email.send(ctx.input.requestedBy, 'report-ready', { url: ctx.data.url })
  })
```

## API

### `createWorkflow(name)`

Create a workflow builder.

```typescript
const flow = createWorkflow('my-workflow')
  .input<{ value: number }>()   // Define input type
  .step('step1', handler)        // Add step
  .step('step2', handler, opts)  // With options
  .commit('save', handler)       // Commit step (always runs)
```

### `FluxEngine`

Execute workflows.

```typescript
const engine = new FluxEngine({
  storage: new MemoryStorage(),   // Default
  defaultRetries: 3,              // Default retry count
  defaultTimeout: 30000,          // Default 30s timeout
  logger: new FluxConsoleLogger(),
  on: {
    stepStart: (step, ctx) => {},
    stepComplete: (step, ctx, result) => {},
    stepError: (step, ctx, error) => {},
    workflowComplete: (ctx) => {},
    workflowError: (ctx, error) => {},
  }
})

const result = await engine.execute(workflow, input)
```

### Step Options

```typescript
.step('name', handler, {
  retries: 5,                    // Override retry count
  timeout: 60000,                // Override timeout (ms)
  when: (ctx) => ctx.data.x > 0, // Conditional execution
})
```

### Commit Steps

Commit steps are marked to always execute, even on workflow replay:

```typescript
.commit('save-to-db', async (ctx) => {
  await db.insert(ctx.data)  // Side effect
})
```

## Storage Adapters

### MemoryStorage (Default)

In-memory, for development:

```typescript
import { MemoryStorage } from '@gravito/flux'
const engine = new FluxEngine({ storage: new MemoryStorage() })
```

### BunSQLiteStorage (Bun only)

High-performance SQLite:

```typescript
import { FluxEngine } from '@gravito/flux'
import { BunSQLiteStorage } from '@gravito/flux/bun'

const engine = new FluxEngine({
  storage: new BunSQLiteStorage({ path: './data/workflows.db' })
})
```

### Custom Storage

Implement `WorkflowStorage` interface:

```typescript
interface WorkflowStorage {
  save(state: WorkflowState): Promise<void>
  load(id: string): Promise<WorkflowState | null>
  list(filter?: WorkflowFilter): Promise<WorkflowState[]>
  delete(id: string): Promise<void>
  init?(): Promise<void>
  close?(): Promise<void>
}
```

## Gravito Integration

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

// Access via services
const flux = core.services.get<FluxEngine>('flux')
await flux.execute(myWorkflow, input)
```

## Platform Support

| Feature | Bun | Node.js |
|---------|-----|---------|
| FluxEngine | ✅ | ✅ |
| MemoryStorage | ✅ | ✅ |
| BunSQLiteStorage | ✅ | ❌ |
| OrbitFlux | ✅ | ✅ |

## Run Examples

```bash
cd packages/flux

# Order fulfillment
bun run examples/order-fulfillment.ts

# Image processing
bun run examples/image-processing.ts

# User signup
bun run examples/user-signup.ts

# Report generation
bun run examples/report-generation.ts
```

## License

MIT
