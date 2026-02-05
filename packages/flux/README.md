# @gravito/flux

> ⚡ Platform-agnostic, high-performance workflow engine for Gravito

## Features

- **Pure State Machine** - No runtime dependencies, Web Standard APIs only
- **Fluent Builder API** - Type-safe, chainable workflow definitions
- **Storage Adapters** - Memory, SQLite (Bun), PostgreSQL (coming soon)
- **Distributed Locking** - Redis-based locking for multi-node deployments
- **Retry & Timeout** - Automatic retry with exponential backoff
- **Event Hooks** - Subscribe to workflow/step lifecycle events
- **Dual Platform** - Works with both Bun and Node.js
- **Well-Tested** - 87% function coverage, 92% line coverage, 277 passing tests

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

### Suspension & Signals

Workflows can be suspended to wait for external events (e.g., manual approval, webhooks).

```typescript
.step('wait-approval', async () => {
    // Suspend workflow, state becomes 'suspended', resources released
    return Flux.wait('approval-signal')
})

// Resume workflow
await engine.signal(workflow, id, 'approval-signal', { approved: true })
```

### Saga Pattern (Compensation)

Supports eventual consistency for distributed transactions. If a workflow fails, the engine automatically executes defined `compensate` handlers in reverse order.

```typescript
.step('reserve-flight', 
  async (ctx) => {
    ctx.data.flightId = await api.bookFlight()
  },
  { 
    // If subsequent steps fail, this rollback logic runs automatically
    compensate: async (ctx) => {
      await api.cancelFlight(ctx.data.flightId)
    }
  }
)
```

### Commit Steps

Commit steps are marked to always execute, even on workflow replay:

```typescript
.commit('save-to-db', async (ctx) => {
  await db.insert(ctx.data)  // Side effect
})
```

## Workflow Versioning

Track workflow definition versions for migration and compatibility management:

### Setting Version

```typescript
const workflow = createWorkflow('order-process')
  .version('2.0.0')
  .input<OrderInput>()
  .step('validate', async (ctx) => { /* ... */ })
  .build()
```

### Filtering by Version

```typescript
// List workflows by version
const v1Workflows = await engine.list({ version: '1.0.0' })

// Combine with other filters
const results = await engine.list({
  name: 'order-process',
  version: '2.0.0',
  status: 'completed',
  limit: 10,
})
```

### Version Mismatch Warning

When resuming a workflow with a different definition version, Flux logs a warning:

```typescript
// Original execution with v1.0.0
const result = await engine.execute(workflowV1, input)

// Resume with v2.0.0 - warns about mismatch
await engine.resume(workflowV2, result.id, { fromStep: 1 })
// ⚠️ Warning: version mismatch (stored: 1.0.0, current: 2.0.0)
```

## Batch Execution

Execute multiple workflow instances efficiently with controlled concurrency:

### Basic Usage

```typescript
const results = await engine.executeBatch(
  orderWorkflow,
  orders.map(o => ({ orderId: o.id })),
  { 
    concurrency: 10,
    continueOnError: true,
    onProgress: (completed, total) => console.log(`${completed}/${total}`)
  }
)

console.log(`Succeeded: ${results.succeeded}, Failed: ${results.failed}`)
```

### Using BatchExecutor

For more control, use `BatchExecutor` directly:

```typescript
import { BatchExecutor } from '@gravito/flux'

const executor = new BatchExecutor(engine)

// Same workflow, multiple inputs
const result = await executor.execute(workflow, inputs, {
  concurrency: 5,        // Max parallel executions (default: 10)
  continueOnError: true, // Continue if one fails (default: false)
  signal: controller.signal, // AbortSignal for cancellation
  onProgress: (completed, total, lastResult) => {
    updateProgressBar(completed / total)
  }
})

// Different workflows
const result = await executor.executeMany([
  { workflow: orderWorkflow, input: { orderId: '1' } },
  { workflow: notifyWorkflow, input: { userId: '2' } },
  { workflow: orderWorkflow, input: { orderId: '3' } },
])
```

### Result Structure

```typescript
interface BatchResult<T> {
  total: number        // Total items processed
  succeeded: number    // Successful executions
  failed: number       // Failed executions
  duration: number     // Total execution time (ms)
  results: Array<{
    index: number
    input: T
    success: boolean
    result?: WorkflowState
    error?: Error
  }>
}
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

### PostgreSQLStorage (Production)

PostgreSQL for production deployments:

```typescript
import { FluxEngine, PostgreSQLStorage } from '@gravito/flux'

const storage = new PostgreSQLStorage({
  connectionString: 'postgresql://user:password@localhost:5432/dbname',
  tableName: 'flux_workflows',
  ssl: true
})

const engine = new FluxEngine({ storage })
```

Features:
- **JSONB columns** for efficient querying of workflow data
- **Connection pooling** via `pg` library
- **Automatic schema migration** on init
- **Optimized indexes** for name, status, and created_at

Alternative configuration:

```typescript
const storage = new PostgreSQLStorage({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'secret',
  tableName: 'workflows',
  ssl: { rejectUnauthorized: false }
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

## Distributed Locking

For multi-node deployments, Flux provides a Redis-based distributed locking mechanism to prevent concurrent execution of the same workflow across multiple nodes.

### RedisLockProvider

Use Redis for distributed locking in production clusters:

```typescript
import { FluxEngine, RedisLockProvider } from '@gravito/flux'
import Redis from 'ioredis'

const redis = new Redis({
  host: 'localhost',
  port: 6379,
})

const lockProvider = new RedisLockProvider({
  client: redis,
  keyPrefix: 'myapp:locks:',  // Default: 'flux:lock:'
  defaultTtl: 30000,           // Default: 30000ms (30s)
  retryDelay: 100,             // Default: 100ms
  maxRetries: 3,               // Default: 0 (no retries)
})

const engine = new FluxEngine({
  storage: new PostgreSQLStorage({ /* ... */ }),
  lockProvider,
})
```

### Features

- **Atomic Acquisition**: Uses Redis `SET NX PX` for atomic lock acquisition
- **Safe Release**: Lua scripts ensure only the lock owner can release
- **Auto-Expiration**: Locks automatically expire if a node crashes
- **Retry Support**: Configurable retry with exponential backoff
- **Idempotent**: Same owner can refresh an existing lock

### Usage

Locks are automatically acquired and released during workflow execution:

```typescript
// Flux automatically acquires lock before execution
const result = await engine.execute(workflow, input)
// Lock is automatically released after completion
```

Manual lock management:

```typescript
const lock = await lockProvider.acquire('workflow-123', 'node-1', 30000)

if (lock) {
  try {
    // Critical section - only one node can execute
    await doWork()
  } finally {
    await lock.release()
  }
} else {
  console.log('Another node is processing this workflow')
}
```

### MemoryLockProvider (Development)

For single-node development environments:

```typescript
import { FluxEngine, MemoryLockProvider } from '@gravito/flux'

const engine = new FluxEngine({
  lockProvider: new MemoryLockProvider(),
})
```

### Custom Lock Providers

Implement the `LockProvider` interface for custom backends:

```typescript
interface LockProvider {
  acquire(resourceId: string, owner: string, ttl: number): Promise<Lock | null>
  refresh(resourceId: string, owner: string, ttl: number): Promise<boolean>
  release(resourceId: string): Promise<void>
}

interface Lock {
  id: string
  owner: string
  expiresAt: number
  release(): Promise<void>
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
| PostgreSQLStorage | ✅ | ✅ |
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

# PostgreSQL storage (requires PostgreSQL)
POSTGRES_URL="postgresql://localhost:5432/flux_demo" bun run examples/postgresql-storage.ts
```

## Testing

Flux has comprehensive test coverage with 300 total tests across 26 test files:

```bash
# Run all tests
bun test

# Run with coverage report
bun test --coverage

# Run specific test file
bun test tests/flux.test.ts
bun test tests/errors.test.ts
bun test tests/workflow-builder.test.ts
```

### Coverage Metrics

- **Function Coverage:** 87% (86.98%)
- **Line Coverage:** 92% (92.49%)
- **Total Tests:** 300 passing, 12 skipped (PostgreSQL integration tests)

### What's Tested

- ✅ Core workflow execution (FluxEngine, WorkflowExecutor, StepExecutor)
- ✅ State management (StateMachine, ContextManager, StateUpdater)
- ✅ Error handling (all 14 error factory functions, FluxError class)
- ✅ Retry & timeout mechanisms (CompensationRetryPolicy, IdempotencyGuard)
- ✅ Compensation & rollback (RollbackManager, RecoveryManager, Saga pattern)
- ✅ Storage adapters (Memory, BunSQLite, PostgreSQL)
- ✅ Parallel execution (ParallelExecutor)
- ✅ Suspension & signals (wait/resume workflows)
- ✅ Workflow builder API (data, describe, validate, step chaining)
- ✅ Visualization (MermaidGenerator with all diagram variations)
- ✅ Profiling & tracing (WorkflowProfiler, TraceEmitter, JsonFileTraceSink)
- ✅ Gravito integration (OrbitFlux lifecycle)
- ✅ Workflow versioning (.version(), version filtering, mismatch warnings)
- ✅ Batch execution (BatchExecutor, executeBatch, concurrency control)
- ✅ Redis distributed locking (RedisLockProvider with mocked Redis)

### Skipped Tests

The 12 skipped tests are PostgreSQL integration tests that require a running database:

```bash
# To run PostgreSQL tests locally:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15
export POSTGRES_URL="postgresql://postgres:test@localhost:5432/flux_test"
bun test tests/postgresql-storage.test.ts
```

## License

MIT
