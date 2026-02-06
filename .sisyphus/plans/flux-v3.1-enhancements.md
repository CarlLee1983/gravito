# Flux v3.1 Enhancements Implementation Plan

**Branch**: `feat/flux-v3.1-enhancements`
**Priority**: High
**Status**: Ready for Implementation

---

## Overview

Implement three major features for Flux v3.1:
1. **Redis LockProvider** - Distributed locking for cluster mode
2. **Workflow Versioning** - Version control for workflow definitions
3. **Batch Execution** - Execute multiple workflow instances efficiently

---

## Phase 1: Redis LockProvider

### 1.1 Create RedisLockProvider

**File**: `packages/flux/src/core/RedisLockProvider.ts`

```typescript
/**
 * Redis-based distributed lock provider for cluster mode.
 * Uses SET NX PX for atomic acquisition, Lua scripts for safe release.
 */

export interface RedisLockProviderOptions {
  client: RedisClient
  keyPrefix?: string      // default: 'flux:lock:'
  defaultTtl?: number     // default: 30000 (30s)
  retryDelay?: number     // default: 100ms
  maxRetries?: number     // default: 0
}

export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { EX?: number; PX?: number; NX?: boolean }): Promise<string | null>
  del(key: string | string[]): Promise<number>
  eval(script: string, keys: string[], args: string[]): Promise<unknown>
}

// Lua script for atomic release (only if owner matches)
const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`

// Lua script for atomic refresh
const REFRESH_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
`

export class RedisLockProvider implements LockProvider {
  constructor(options: RedisLockProviderOptions)
  
  async acquire(resourceId: string, owner: string, ttl?: number): Promise<Lock | null>
  async refresh(resourceId: string, owner: string, ttl: number): Promise<boolean>
  async release(resourceId: string, owner?: string): Promise<void>
}
```

### 1.2 Export from index files

**Update**: `packages/flux/src/core/index.ts`
- Add: `export { RedisLockProvider, type RedisLockProviderOptions, type RedisClient } from './RedisLockProvider'`

**Update**: `packages/flux/src/index.ts`
- Add: `export { RedisLockProvider, type RedisLockProviderOptions, type RedisClient } from './core/RedisLockProvider'`

**Update**: `packages/flux/src/index.node.ts`
- Add: `export { RedisLockProvider, type RedisLockProviderOptions, type RedisClient } from './core/RedisLockProvider'`

### 1.3 Write Tests

**File**: `packages/flux/tests/redis-lock-provider.test.ts`

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { RedisLockProvider } from '../src/core/RedisLockProvider'

// Mock Redis client
const createMockRedis = () => ({
  store: new Map<string, { value: string; expiresAt: number }>(),
  get: mock(async function(key: string) { /* ... */ }),
  set: mock(async function(key: string, value: string, options?: any) { /* ... */ }),
  del: mock(async function(key: string) { /* ... */ }),
  eval: mock(async function(script: string, keys: string[], args: string[]) { /* ... */ }),
})

describe('RedisLockProvider', () => {
  describe('acquire', () => {
    it('should acquire lock when resource is free')
    it('should return null when lock is held by another owner')
    it('should refresh lock when already owned')
    it('should retry on contention when maxRetries > 0')
  })
  
  describe('refresh', () => {
    it('should extend TTL when owner matches')
    it('should fail when owner does not match')
  })
  
  describe('release', () => {
    it('should release lock when owner matches')
    it('should not release lock when owner does not match')
    it('should force release when owner is not provided')
  })
  
  describe('integration', () => {
    it('should handle concurrent lock attempts correctly')
    it('should auto-expire locks after TTL')
  })
})
```

---

## Phase 2: Workflow Versioning

### 2.1 Update Types

**Update**: `packages/flux/src/types.ts`

Add version field to WorkflowDefinition:
```typescript
export interface WorkflowDefinition<TInput = unknown, TData = Record<string, any>> {
  name: string
  /** Semantic version of this workflow definition (e.g., "1.0.0", "2.1.0") */
  version?: string
  steps: StepDefinition<TInput, TData>[]
  validateInput?: (input: unknown) => input is TInput
}
```

Add version field to WorkflowState:
```typescript
export interface WorkflowState<TInput = unknown, TData = Record<string, any>> {
  // ... existing fields ...
  /** The version of the workflow definition used to create this instance */
  definitionVersion?: string
}
```

### 2.2 Update WorkflowBuilder

**Update**: `packages/flux/src/builder/WorkflowBuilder.ts`

Add version method:
```typescript
export class WorkflowBuilder<TInput, TData> {
  private _version?: string
  
  /**
   * Sets the version of this workflow definition.
   * Used for version tracking and migration.
   * 
   * @example
   * createWorkflow('order-process')
   *   .version('2.0.0')
   *   .input<OrderInput>()
   *   .step('validate', async (ctx) => { ... })
   */
  version(v: string): this {
    this._version = v
    return this
  }
  
  // Update build() to include version
  build(): WorkflowDefinition<TInput, TData> {
    return {
      name: this._name,
      version: this._version,
      steps: this._steps,
      validateInput: this._validateInput,
    }
  }
}
```

### 2.3 Update FluxEngine

**Update**: `packages/flux/src/engine/FluxEngine.ts`

Store definition version when creating workflow:
```typescript
async execute<TInput, TData>(workflow, input): Promise<FluxResult<TData>> {
  const definition = resolveDefinition(workflow)
  
  let ctx = this.contextManager.create<TInput, TData>(
    definition.name,
    input,
    definition.steps.length
  )
  
  // Store definition version in workflow state
  if (definition.version) {
    ctx = updateWorkflowContext(ctx, { definitionVersion: definition.version })
  }
  // ...
}
```

Add version check on resume:
```typescript
async resume<TInput, TData>(workflow, workflowId, options?): Promise<FluxResult<TData> | null> {
  const definition = resolveDefinition(workflow)
  const state = await this.storage.load(workflowId)
  
  // Check version compatibility
  if (state?.definitionVersion && definition.version && 
      state.definitionVersion !== definition.version) {
    // Option 1: Throw error (strict mode)
    // throw Errors.workflowVersionMismatch(state.definitionVersion, definition.version)
    
    // Option 2: Emit warning but continue (lenient mode - default)
    this.config.logger?.warn(
      `Resuming workflow with version mismatch: stored=${state.definitionVersion}, current=${definition.version}`
    )
  }
  // ...
}
```

### 2.4 Add Version Filter to Storage

**Update**: `packages/flux/src/types.ts`

```typescript
export interface WorkflowFilter {
  name?: string
  status?: WorkflowStatus | WorkflowStatus[]
  /** Filter by definition version */
  version?: string
  limit?: number
  offset?: number
}
```

**Update**: Storage implementations to support version filter:
- `MemoryStorage.ts`
- `BunSQLiteStorage.ts`
- `PostgreSQLStorage.ts`

### 2.5 Add Error Type

**Update**: `packages/flux/src/errors.ts`

```typescript
export const workflowVersionMismatch = (stored: string, current: string) =>
  new FluxError(
    `Workflow version mismatch: stored version "${stored}" does not match current "${current}"`,
    FluxErrorCode.WORKFLOW_DEFINITION_CHANGED
  )
```

### 2.6 Write Tests

**File**: `packages/flux/tests/workflow-versioning.test.ts`

```typescript
describe('Workflow Versioning', () => {
  describe('WorkflowBuilder.version()', () => {
    it('should set version on definition')
    it('should include version in describe() output')
  })
  
  describe('FluxEngine version handling', () => {
    it('should store definition version on execute')
    it('should warn on version mismatch during resume')
    it('should filter by version in list()')
  })
  
  describe('Storage version support', () => {
    it('MemoryStorage should filter by version')
    it('BunSQLiteStorage should filter by version')
  })
})
```

---

## Phase 3: Batch Execution

### 3.1 Create BatchExecutor

**File**: `packages/flux/src/engine/BatchExecutor.ts`

```typescript
/**
 * Batch executor for running multiple workflow instances efficiently.
 */

export interface BatchExecutionOptions {
  /** Maximum concurrent workflow executions. @default 10 */
  concurrency?: number
  /** Whether to continue on individual workflow failures. @default true */
  continueOnError?: boolean
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number, result: BatchItemResult) => void
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

export interface BatchItemResult<TData = any> {
  /** Index in the batch */
  index: number
  /** Input provided to this workflow */
  input: unknown
  /** Execution result (null if failed before execution) */
  result: FluxResult<TData> | null
  /** Error if failed */
  error?: Error
  /** Whether this item succeeded */
  success: boolean
}

export interface BatchResult<TData = any> {
  /** Total items in batch */
  total: number
  /** Number of successful executions */
  succeeded: number
  /** Number of failed executions */
  failed: number
  /** Results for each item in order */
  results: BatchItemResult<TData>[]
  /** Total execution time in milliseconds */
  duration: number
}

export class BatchExecutor {
  constructor(private engine: FluxEngine) {}
  
  /**
   * Execute a workflow for multiple inputs in parallel with controlled concurrency.
   * 
   * @example
   * const batch = new BatchExecutor(engine)
   * const results = await batch.execute(
   *   orderWorkflow,
   *   [{ orderId: '1' }, { orderId: '2' }, { orderId: '3' }],
   *   { concurrency: 5 }
   * )
   */
  async execute<TInput, TData>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    inputs: TInput[],
    options?: BatchExecutionOptions
  ): Promise<BatchResult<TData>>
  
  /**
   * Execute different workflows in a single batch.
   * 
   * @example
   * const results = await batch.executeMany([
   *   { workflow: orderWorkflow, input: { orderId: '1' } },
   *   { workflow: emailWorkflow, input: { to: 'user@example.com' } },
   * ])
   */
  async executeMany<TData = any>(
    items: Array<{ workflow: WorkflowDefinition<any, any>; input: any }>,
    options?: BatchExecutionOptions
  ): Promise<BatchResult<TData>>
}
```

### 3.2 Add to FluxEngine

**Update**: `packages/flux/src/engine/FluxEngine.ts`

Add batch method as convenience wrapper:
```typescript
export class FluxEngine {
  // ... existing methods ...
  
  /**
   * Execute a workflow for multiple inputs in batch.
   * 
   * @example
   * const results = await engine.executeBatch(
   *   orderWorkflow,
   *   orders.map(o => ({ orderId: o.id })),
   *   { concurrency: 10 }
   * )
   */
  async executeBatch<TInput, TData>(
    workflow: WorkflowBuilder<TInput, TData> | WorkflowDefinition<TInput, TData>,
    inputs: TInput[],
    options?: BatchExecutionOptions
  ): Promise<BatchResult<TData>> {
    const executor = new BatchExecutor(this)
    return executor.execute(workflow, inputs, options)
  }
}
```

### 3.3 Export from index files

**Update**: `packages/flux/src/index.ts`
```typescript
export { BatchExecutor, type BatchExecutionOptions, type BatchResult, type BatchItemResult } from './engine/BatchExecutor'
```

**Update**: `packages/flux/src/index.node.ts`
```typescript
export { BatchExecutor, type BatchExecutionOptions, type BatchResult, type BatchItemResult } from './engine/BatchExecutor'
```

### 3.4 Write Tests

**File**: `packages/flux/tests/batch-executor.test.ts`

```typescript
describe('BatchExecutor', () => {
  describe('execute()', () => {
    it('should execute all inputs in parallel')
    it('should respect concurrency limit')
    it('should continue on error when continueOnError=true')
    it('should stop on first error when continueOnError=false')
    it('should call onProgress callback')
    it('should respect AbortSignal')
  })
  
  describe('executeMany()', () => {
    it('should execute different workflows')
    it('should handle mixed success/failure')
  })
  
  describe('FluxEngine.executeBatch()', () => {
    it('should work as convenience wrapper')
  })
})
```

---

## Phase 4: Documentation & Exports

### 4.1 Update README.md

**Update**: `packages/flux/README.md`

Add sections for:
- Redis LockProvider (cluster mode)
- Workflow Versioning
- Batch Execution

### 4.2 Update Architecture Docs

**Update**: `docs/architecture/flux.md`

- Change version from 3.0.0 to 3.1.0
- Add RedisLockProvider to component diagram
- Add BatchExecutor to component list
- Add versioning documentation

---

## Implementation Checklist

### Phase 1: Redis LockProvider
- [ ] Create `src/core/RedisLockProvider.ts`
- [ ] Export from `src/core/index.ts`
- [ ] Export from `src/index.ts` and `src/index.node.ts`
- [ ] Write `tests/redis-lock-provider.test.ts`
- [ ] Verify all tests pass

### Phase 2: Workflow Versioning
- [ ] Update `src/types.ts` with version fields
- [ ] Add `version()` method to WorkflowBuilder
- [ ] Update FluxEngine execute/resume with version handling
- [ ] Update WorkflowFilter with version
- [ ] Update MemoryStorage to filter by version
- [ ] Update BunSQLiteStorage to filter by version
- [ ] Add `workflowVersionMismatch` error
- [ ] Write `tests/workflow-versioning.test.ts`
- [ ] Verify all tests pass

### Phase 3: Batch Execution
- [ ] Create `src/engine/BatchExecutor.ts`
- [ ] Add `executeBatch()` to FluxEngine
- [ ] Export from index files
- [ ] Write `tests/batch-executor.test.ts`
- [ ] Verify all tests pass

### Phase 4: Finalization
- [ ] Update README.md with new features
- [ ] Update architecture docs
- [ ] Run full test suite (`bun test`)
- [ ] Run type check (`bun run typecheck`)
- [ ] Commit and create PR

---

## Testing Requirements

- All new code must have **80%+ coverage**
- Run existing tests to ensure no regressions
- Integration tests for Redis should use mock client

## Branch & PR

- Branch: `feat/flux-v3.1-enhancements`
- PR Title: `feat(flux): implement v3.1 features - Redis lock, versioning, batch execution`
