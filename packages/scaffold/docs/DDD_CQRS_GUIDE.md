# DDD + CQRS Complete Guide

## 📖 Table of Contents

1. [Introduction to CQRS](#introduction-to-cqrs)
2. [CQRS Fundamentals](#cqrs-fundamentals)
3. [Read Model Design](#read-model-design)
4. [Event Projector Patterns](#event-projector-patterns)
5. [Query Service Implementation](#query-service-implementation)
6. [Event Subscriber Pattern](#event-subscriber-pattern)
7. [Caching Strategies](#caching-strategies)
8. [HTTP Controller Implementation](#http-controller-implementation)
9. [Integration with Event Sourcing](#integration-with-event-sourcing)
10. [Testing CQRS Modules](#testing-cqrs-modules)
11. [Real-World Examples](#real-world-examples)
12. [Performance Optimization](#performance-optimization)
13. [Troubleshooting](#troubleshooting)
14. [Best Practices](#best-practices)

---

## Introduction to CQRS

### What is CQRS?

**CQRS** stands for **Command Query Responsibility Segregation**. It's an architectural pattern that separates read (query) operations from write (command) operations into different models.

### Why CQRS?

Traditional CRUD applications use a single model for both reading and writing data:

```
Single Model
    ↓
┌─────────────────┐
│  Create/Update  │
│    (Commands)   │
└─────────────────┘
│
├─ Constraints: All write operations share the same model
├─ Performance Issues: Denormalization conflicts with normalization
└─ Complexity: One model trying to do everything
```

CQRS solves these problems by separating concerns:

```
Write Side (Commands)          Read Side (Queries)
┌──────────────────┐          ┌──────────────────┐
│ Aggregate Root   │          │ Read Model       │
│ (Normalized)     │          │ (Denormalized)   │
└──────────────────┘          └──────────────────┘
        │                            ▲
        │ Events                     │
        ▼                            │
┌──────────────────┐          ┌──────────────────┐
│ Event Store      │────────▶ │ Projector        │
│                  │          │ (Pure Functions) │
└──────────────────┘          └──────────────────┘
                                     │
                                     ▼
                              ┌──────────────────┐
                              │ Database         │
                              │ (Optimized)      │
                              └──────────────────┘
```

### Benefits of CQRS

1. **Scalability**: Read and write sides can scale independently
2. **Performance**: Read models optimized for queries (denormalized)
3. **Flexibility**: Different database technologies for each side
4. **Consistency**: Write side has strong consistency, read side eventual
5. **Clear Responsibility**: One model for writes, one for reads
6. **Better Testing**: Pure projectors are deterministic and testable
7. **Event-Driven**: Enables event sourcing on the write side

---

## CQRS Fundamentals

### Core Concepts

#### 1. Command Side (Write Model)

The write side handles all state mutations:
- **Aggregates**: Consistency boundaries
- **Domain Events**: Record what happened
- **Event Store**: Source of truth
- **Strong Consistency**: Transactions ensure data correctness

```typescript
// Example: Deposit Command (Write Side)
class DepositService {
  execute(command: DepositCommand): void {
    const wallet = this.walletRepository.findById(command.walletId)
    wallet.deposit(command.amount)

    // Raises event
    wallet.raiseDomainEvent(
      new MoneyDepositedEvent(command.walletId, command.amount)
    )

    this.eventStore.save(wallet)
  }
}
```

#### 2. Query Side (Read Model)

The read side is optimized for queries:
- **Read Models**: Denormalized data structures
- **Projectors**: Transform events into read models
- **No Business Logic**: Pure data transformation
- **Eventual Consistency**: Updates lag behind events

```typescript
// Example: Wallet Balance Query (Read Side)
class GetWalletBalanceQuery {
  execute(walletId: string): WalletBalanceReadModel {
    return this.repository.findById(walletId)
  }
}

// Projection happens in background:
// Event: MoneyDepositedEvent
//   → Projector processes event
//   → Updates WalletBalanceReadModel
```

#### 3. Event Bus

Events flow from write side to read side:

```typescript
// Write Side - Raises Event
wallet.raiseDomainEvent(new MoneyDepositedEvent(...))

// Event Bus - Publishes
eventBus.publish(wallet.domainEvents)

// Event Subscriber - Receives
@EventSubscriber('MoneyDepositedEvent')
onMoneyDeposited(event: MoneyDepositedEvent) {
  // Trigger projection
  projector.project(event)
}
```

---

## Read Model Design

### What is a Read Model?

A read model is a **denormalized, query-optimized** data structure designed specifically for reads.

Key characteristics:
- **Immutable**: Never modified directly (only through projections)
- **Denormalized**: Combines data from multiple aggregates
- **Optimized**: Structured for specific queries
- **Eventual Consistency**: May lag behind events

### Designing Read Models

#### 1. Understand Your Queries

Start with the queries users need:

```typescript
// Required queries for a wallet module:
interface WalletQueries {
  findWalletById(walletId: string): WalletReadModel
  findAllWalletsForUser(userId: string): WalletReadModel[]
  searchWalletsByBalance(minBalance: number): WalletReadModel[]
  getWalletStatistics(userId: string): WalletStatisticsReadModel
}
```

#### 2. Design the Read Model Structure

Organize data for optimal query performance:

```typescript
// ❌ WRONG: Too normalized
interface WalletReadModel {
  id: string
  userId: string
  createdAt: Date
}

// ✅ CORRECT: Denormalized for queries
interface WalletReadModel {
  // Identity
  id: string
  userId: string
  userName: string  // Denormalized from User aggregate
  userEmail: string // Denormalized from User aggregate

  // Current state
  balance: number
  lastDepositAt: Date
  lastWithdrawalAt: Date

  // Statistics (pre-aggregated)
  totalDeposits: number
  totalWithdrawals: number
  depositCount: number
  withdrawalCount: number

  // Metadata
  createdAt: Date
  updatedAt: Date
}
```

#### 3. Immutability

Read models should be immutable. Use factory methods:

```typescript
export interface WalletReadModel {
  readonly id: string
  readonly userId: string
  readonly balance: number
  readonly createdAt: Date
}

// Factory method
export function createWalletReadModel(
  id: string,
  userId: string,
  balance: number,
  createdAt: Date
): WalletReadModel {
  return Object.freeze({
    id,
    userId,
    balance,
    createdAt
  })
}

// Cannot be modified
const wallet = createWalletReadModel('w1', 'u1', 100, new Date())
wallet.balance = 200  // ❌ Type error: Cannot assign to readonly
```

#### 4. Complete Read Model Example

```typescript
/**
 * WalletReadModel - Query-optimized read model
 *
 * Used for querying wallet balance, history, and statistics.
 * Denormalized for optimal query performance.
 */
export interface WalletReadModel {
  // Identity & Reference
  readonly id: string
  readonly userId: string
  readonly userName: string
  readonly userEmail: string

  // Current Balance
  readonly balance: number
  readonly currency: string

  // Recent Activity (pre-aggregated for queries)
  readonly lastDepositAmount: number | null
  readonly lastDepositAt: Date | null
  readonly lastWithdrawalAmount: number | null
  readonly lastWithdrawalAt: Date | null

  // Statistics (pre-calculated)
  readonly totalDepositCount: number
  readonly totalWithdrawalCount: number
  readonly totalDepositAmount: number
  readonly totalWithdrawalAmount: number
  readonly averageDepositAmount: number
  readonly averageWithdrawalAmount: number

  // Projection Metadata
  readonly projectionVersion: number
  readonly lastProjectedEventId: string
  readonly lastProjectedAt: Date
  readonly projectionIdempotencyKey: string

  // Metadata
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Factory method for creating new read models
 */
export function createWalletReadModel(
  data: Omit<WalletReadModel, 'readonly'>
): WalletReadModel {
  return Object.freeze({
    ...data
  })
}

/**
 * Validation function ensures read model invariants
 */
export function validateWalletReadModel(model: WalletReadModel): void {
  if (model.balance < 0) {
    throw new Error('Balance cannot be negative')
  }
  if (model.totalDepositCount < 0 || model.totalWithdrawalCount < 0) {
    throw new Error('Counts cannot be negative')
  }
}
```

---

## Event Projector Patterns

### What is an Event Projector?

An event projector is a **pure function** that transforms domain events into read model updates.

Key characteristics:
- **Pure**: No side effects, deterministic
- **Idempotent**: Same event always produces same result
- **Stateless**: No mutable state
- **Composable**: Can chain multiple projectors

### Projector Architecture

```typescript
/**
 * Pure projector function signature
 */
type Projector<TEvent, TReadModel> = (
  event: TEvent,
  currentModel: TReadModel | null
) => TReadModel
```

### Implementing Projectors

#### 1. Basic Projector

```typescript
/**
 * WalletEventProjector - Pure functions for event projection
 *
 * Transforms domain events into read model updates.
 * All functions are pure and idempotent.
 */

type WalletEvent =
  | MoneyDepositedEvent
  | MoneyWithdrawnEvent
  | WalletCreatedEvent

export class WalletEventProjector {
  /**
   * Main projection entry point
   * Dispatches event to appropriate handler
   */
  static project(
    event: WalletEvent,
    currentModel: WalletReadModel | null
  ): WalletReadModel {
    switch (event.constructor.name) {
      case 'WalletCreatedEvent':
        return this.projectWalletCreated(
          event as WalletCreatedEvent,
          currentModel
        )
      case 'MoneyDepositedEvent':
        return this.projectMoneyDeposited(
          event as MoneyDepositedEvent,
          currentModel!
        )
      case 'MoneyWithdrawnEvent':
        return this.projectMoneyWithdrawn(
          event as MoneyWithdrawnEvent,
          currentModel!
        )
      default:
        // Unknown event type - return unchanged
        return currentModel || createEmptyReadModel()
    }
  }

  /**
   * Pure projector: WalletCreatedEvent
   * Creates initial read model from creation event
   */
  private static projectWalletCreated(
    event: WalletCreatedEvent,
    _currentModel: WalletReadModel | null
  ): WalletReadModel {
    return createWalletReadModel({
      id: event.walletId,
      userId: event.userId,
      userName: event.userName,
      userEmail: event.userEmail,
      balance: 0,
      currency: event.currency,
      lastDepositAmount: null,
      lastDepositAt: null,
      lastWithdrawalAmount: null,
      lastWithdrawalAt: null,
      totalDepositCount: 0,
      totalWithdrawalCount: 0,
      totalDepositAmount: 0,
      totalWithdrawalAmount: 0,
      averageDepositAmount: 0,
      averageWithdrawalAmount: 0,
      projectionVersion: 1,
      lastProjectedEventId: event.eventId,
      lastProjectedAt: new Date(),
      projectionIdempotencyKey: event.eventId,
      createdAt: event.occurredAt,
      updatedAt: event.occurredAt
    })
  }

  /**
   * Pure projector: MoneyDepositedEvent
   * Updates balance and statistics
   */
  private static projectMoneyDeposited(
    event: MoneyDepositedEvent,
    currentModel: WalletReadModel
  ): WalletReadModel {
    // Guard against duplicate projections (idempotency)
    if (currentModel.lastProjectedEventId === event.eventId) {
      return currentModel
    }

    const newBalance = currentModel.balance + event.amount
    const newTotalDepositCount = currentModel.totalDepositCount + 1
    const newTotalDepositAmount = currentModel.totalDepositAmount + event.amount
    const newAverageDepositAmount =
      newTotalDepositAmount / newTotalDepositCount

    return createWalletReadModel({
      ...currentModel,
      balance: newBalance,
      lastDepositAmount: event.amount,
      lastDepositAt: event.occurredAt,
      totalDepositCount: newTotalDepositCount,
      totalDepositAmount: newTotalDepositAmount,
      averageDepositAmount: newAverageDepositAmount,
      projectionVersion: currentModel.projectionVersion + 1,
      lastProjectedEventId: event.eventId,
      lastProjectedAt: new Date(),
      projectionIdempotencyKey: event.eventId,
      updatedAt: event.occurredAt
    })
  }

  /**
   * Pure projector: MoneyWithdrawnEvent
   * Updates balance and statistics
   */
  private static projectMoneyWithdrawn(
    event: MoneyWithdrawnEvent,
    currentModel: WalletReadModel
  ): WalletReadModel {
    // Guard against duplicate projections (idempotency)
    if (currentModel.lastProjectedEventId === event.eventId) {
      return currentModel
    }

    const newBalance = currentModel.balance - event.amount
    const newTotalWithdrawalCount = currentModel.totalWithdrawalCount + 1
    const newTotalWithdrawalAmount =
      currentModel.totalWithdrawalAmount + event.amount
    const newAverageWithdrawalAmount =
      newTotalWithdrawalAmount / newTotalWithdrawalCount

    return createWalletReadModel({
      ...currentModel,
      balance: newBalance,
      lastWithdrawalAmount: event.amount,
      lastWithdrawalAt: event.occurredAt,
      totalWithdrawalCount: newTotalWithdrawalCount,
      totalWithdrawalAmount: newTotalWithdrawalAmount,
      averageWithdrawalAmount: newAverageWithdrawalAmount,
      projectionVersion: currentModel.projectionVersion + 1,
      lastProjectedEventId: event.eventId,
      lastProjectedAt: new Date(),
      projectionIdempotencyKey: event.eventId,
      updatedAt: event.occurredAt
    })
  }
}
```

#### 2. Testing Projectors

Since projectors are pure functions, they're easy to test:

```typescript
import { describe, it, expect } from 'bun:test'
import { WalletEventProjector } from '../WalletEventProjector'
import { createWalletReadModel } from '../WalletReadModel'

describe('WalletEventProjector - Pure Projection Functions', () => {
  describe('projectWalletCreated', () => {
    it('should create initial read model with zero balance', () => {
      const event = new WalletCreatedEvent(
        'wallet-1',
        'user-1',
        'John Doe',
        'john@example.com',
        'USD',
        'event-1',
        new Date()
      )

      const result = WalletEventProjector.project(event, null)

      expect(result.id).toBe('wallet-1')
      expect(result.balance).toBe(0)
      expect(result.totalDepositCount).toBe(0)
      expect(result.lastProjectedEventId).toBe('event-1')
    })
  })

  describe('projectMoneyDeposited', () => {
    it('should increase balance and update statistics', () => {
      const initialModel = createWalletReadModel({
        // ... initial state
        balance: 100,
        totalDepositCount: 1,
        totalDepositAmount: 100
      })

      const event = new MoneyDepositedEvent(
        'wallet-1',
        50,
        'event-2',
        new Date()
      )

      const result = WalletEventProjector.project(event, initialModel)

      expect(result.balance).toBe(150)
      expect(result.totalDepositCount).toBe(2)
      expect(result.totalDepositAmount).toBe(150)
    })

    it('should be idempotent - applying same event twice produces same result', () => {
      const initialModel = createWalletReadModel({
        // ... initial state
        balance: 100,
        lastProjectedEventId: 'event-1'
      })

      const event = new MoneyDepositedEvent(
        'wallet-1',
        50,
        'event-2',
        new Date()
      )

      const result1 = WalletEventProjector.project(event, initialModel)
      const result2 = WalletEventProjector.project(event, result1)

      expect(result1.balance).toBe(result2.balance)
      expect(result1).toEqual(result2)
    })
  })
})
```

---

## Query Service Implementation

### What is a Query Service?

A query service encapsulates all read-side use cases. It queries the denormalized read models.

Key responsibilities:
- Query read models from database
- Apply business logic for reads (filtering, aggregation)
- Convert read models to DTOs
- Handle errors gracefully

### Implementing Query Services

#### 1. Query Service Interface

```typescript
/**
 * Query service for wallet balance queries
 */
export interface IWalletBalanceQueryService {
  findById(walletId: string): Promise<WalletBalanceDTO | null>
  findAll(filters?: QueryFilters): Promise<WalletBalanceDTO[]>
  search(searchTerm: string): Promise<WalletBalanceDTO[]>
  getStatistics(userId: string): Promise<WalletStatisticsDTO>
  getTopWallets(limit: number): Promise<WalletBalanceDTO[]>
}
```

#### 2. Query Service Implementation

```typescript
/**
 * GetWalletBalanceService - Query use case
 *
 * Handles all wallet balance queries.
 * Transforms read models to DTOs for API responses.
 */
export class GetWalletBalanceService {
  constructor(
    private readonly repository: IWalletBalanceReadModelRepository,
    private readonly cache: CacheManager
  ) {}

  /**
   * Find wallet by ID
   * With caching for performance
   */
  async findById(walletId: string): Promise<WalletBalanceDTO | null> {
    // Check cache first
    const cacheKey = `wallet:${walletId}`
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      return WalletBalanceDTO.fromJSON(cached)
    }

    // Query read model
    const readModel = await this.repository.findById(walletId)
    if (!readModel) {
      return null
    }

    // Validate read model invariants
    validateWalletReadModel(readModel)

    // Convert to DTO
    const dto = WalletBalanceDTO.fromReadModel(readModel)

    // Cache for 5 minutes
    await this.cache.set(cacheKey, dto.toJSON(), 300)

    return dto
  }

  /**
   * Find all wallets for a user
   */
  async findAll(filters?: QueryFilters): Promise<WalletBalanceDTO[]> {
    const readModels = await this.repository.findByUserId(
      filters?.userId || ''
    )

    return readModels
      .filter(model => {
        if (filters?.minBalance && model.balance < filters.minBalance) {
          return false
        }
        if (filters?.maxBalance && model.balance > filters.maxBalance) {
          return false
        }
        return true
      })
      .map(model => {
        validateWalletReadModel(model)
        return WalletBalanceDTO.fromReadModel(model)
      })
  }

  /**
   * Search wallets by multiple criteria
   */
  async search(searchTerm: string): Promise<WalletBalanceDTO[]> {
    const readModels = await this.repository.search(searchTerm)

    return readModels.map(model => {
      validateWalletReadModel(model)
      return WalletBalanceDTO.fromReadModel(model)
    })
  }

  /**
   * Get aggregated statistics
   * Demonstrates complex query logic on read models
   */
  async getStatistics(userId: string): Promise<WalletStatisticsDTO> {
    const readModels = await this.repository.findByUserId(userId)

    const totalBalance = readModels.reduce((sum, w) => sum + w.balance, 0)
    const averageBalance = totalBalance / readModels.length || 0
    const maxBalance = Math.max(...readModels.map(w => w.balance), 0)
    const minBalance = Math.min(...readModels.map(w => w.balance), 0)

    return {
      userId,
      walletCount: readModels.length,
      totalBalance,
      averageBalance,
      maxBalance,
      minBalance,
      lastUpdatedAt: new Date()
    }
  }

  /**
   * Get top wallets by balance
   * Demonstrates ordering and limit
   */
  async getTopWallets(limit: number): Promise<WalletBalanceDTO[]> {
    const readModels = await this.repository.findAll()

    return readModels
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit)
      .map(model => {
        validateWalletReadModel(model)
        return WalletBalanceDTO.fromReadModel(model)
      })
  }
}
```

---

## Event Subscriber Pattern

### What is an Event Subscriber?

An event subscriber listens for domain events and triggers projections.

```typescript
/**
 * Event Subscriber Lifecycle
 */

// 1. Event is raised on write side
wallet.deposit(100) // → MoneyDepositedEvent

// 2. Event is published to event bus
eventStore.save(wallet) // → publishedEvent()

// 3. Subscriber receives event
@EventSubscriber('MoneyDepositedEvent')
onMoneyDeposited(event: MoneyDepositedEvent) {
  // 4. Trigger projection
  const readModel = this.projector.project(event, currentModel)

  // 5. Save to read model database
  await this.readModelRepository.save(readModel)
}
```

### Implementing Event Subscribers

```typescript
/**
 * WalletBalanceProjectionSubscriber
 *
 * Subscribes to wallet domain events and projects them to read models.
 * Uses event projector pattern for deterministic transformations.
 */
export class WalletBalanceProjectionSubscriber implements EventSubscriber {
  constructor(
    private readonly projector: WalletEventProjector,
    private readonly repository: IWalletBalanceReadModelRepository
  ) {}

  /**
   * Get event types this subscriber handles
   */
  subscribesTo(): string[] {
    return [
      'WalletCreatedEvent',
      'MoneyDepositedEvent',
      'MoneyWithdrawnEvent'
    ]
  }

  /**
   * Main entry point when event is published
   */
  async handle(event: DomainEvent): Promise<void> {
    try {
      // Get current read model (may be null for new aggregates)
      const currentModel = await this.repository.findById(event.aggregateId)

      // Apply pure projection
      const updatedModel = this.projector.project(
        event as WalletEvent,
        currentModel
      )

      // Validate invariants
      validateWalletReadModel(updatedModel)

      // Persist to read model database
      await this.repository.save(updatedModel)

      console.log(
        `✓ Projected ${event.constructor.name} for wallet ${event.aggregateId}`
      )
    } catch (error) {
      console.error(
        `✗ Failed to project event ${event.constructor.name}:`,
        error
      )

      // Recovery strategy: log and continue
      // The projector will eventually be rebuilt
      await this.logProjectionFailure(event, error as Error)
    }
  }

  /**
   * Log failed projections for recovery
   */
  private async logProjectionFailure(
    event: DomainEvent,
    error: Error
  ): Promise<void> {
    // TODO: Log to failure tracking system
    // This enables manual recovery or automatic replay
  }
}
```

---

## Caching Strategies

### Why Cache Read Models?

- **Performance**: Avoid database queries for frequently accessed data
- **Scalability**: Reduce database load
- **User Experience**: Faster API responses
- **Cost**: Reduce database connections

### Caching Patterns

#### 1. Cache-Aside Pattern

```typescript
/**
 * Read through cache
 */
async function getWallet(walletId: string): Promise<WalletDTO> {
  // 1. Check cache
  const cached = await cache.get(`wallet:${walletId}`)
  if (cached) {
    return cached  // Hit - return immediately
  }

  // 2. Miss - query database
  const readModel = await repository.findById(walletId)
  if (!readModel) {
    return null
  }

  // 3. Cache for future queries
  await cache.set(`wallet:${walletId}`, readModel, 300) // 5 min TTL

  // 4. Return to client
  return WalletDTO.fromReadModel(readModel)
}
```

#### 2. Write-Through Caching

When projecting events:

```typescript
/**
 * Update cache when read model changes
 */
async handle(event: MoneyDepositedEvent): Promise<void> {
  const currentModel = await repository.findById(event.walletId)
  const updatedModel = projector.project(event, currentModel)

  // Write to database
  await repository.save(updatedModel)

  // Also update cache immediately
  const dto = WalletDTO.fromReadModel(updatedModel)
  await cache.set(`wallet:${updatedModel.id}`, dto, 300)
}
```

#### 3. Cache Invalidation

Invalidate when read models change:

```typescript
/**
 * Invalidate cache on projections
 */
async invalidateWalletCache(walletId: string): Promise<void> {
  // Invalidate single wallet
  await cache.delete(`wallet:${walletId}`)

  // Invalidate related caches
  const wallet = await repository.findById(walletId)
  await cache.delete(`user-wallets:${wallet.userId}`)
  await cache.delete(`wallet-stats:${wallet.userId}`)
}
```

#### 4. Dual-Tier Caching

Memory cache for hot data, Redis for distributed cache:

```typescript
/**
 * WalletBalanceReadModelCache
 *
 * Two-tier caching strategy:
 * 1. Memory cache (fast, local)
 * 2. Redis cache (distributed, shared)
 */
export class WalletBalanceReadModelCache {
  constructor(
    private readonly memoryCache: Map<string, CachedModel>,
    private readonly redisCache: Redis,
    private readonly repository: IWalletBalanceReadModelRepository
  ) {}

  /**
   * Get with fallback: Memory → Redis → Database
   */
  async get(walletId: string): Promise<WalletReadModel> {
    // 1. Check memory cache (microseconds)
    if (this.memoryCache.has(walletId)) {
      return this.memoryCache.get(walletId)!.model
    }

    // 2. Check Redis cache (milliseconds)
    const redisKey = `wallet:${walletId}`
    const cached = await this.redisCache.get(redisKey)
    if (cached) {
      const model = JSON.parse(cached) as WalletReadModel
      this.memoryCache.set(walletId, {
        model,
        expiresAt: Date.now() + 300000 // 5 min
      })
      return model
    }

    // 3. Query database (seconds)
    const model = await this.repository.findById(walletId)
    if (model) {
      // Populate both caches
      this.memoryCache.set(walletId, {
        model,
        expiresAt: Date.now() + 300000
      })
      await this.redisCache.setex(redisKey, 300, JSON.stringify(model))
    }
    return model
  }

  /**
   * Set cache at all levels
   */
  async set(walletId: string, model: WalletReadModel): Promise<void> {
    // Update database
    await this.repository.save(model)

    // Populate memory cache
    this.memoryCache.set(walletId, {
      model,
      expiresAt: Date.now() + 300000
    })

    // Populate Redis
    const redisKey = `wallet:${walletId}`
    await this.redisCache.setex(redisKey, 300, JSON.stringify(model))
  }

  /**
   * Invalidate at all levels
   */
  async invalidate(walletId: string): Promise<void> {
    // Clear memory
    this.memoryCache.delete(walletId)

    // Clear Redis
    const redisKey = `wallet:${walletId}`
    await this.redisCache.del(redisKey)
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    await this.redisCache.flushdb()
  }
}
```

---

## HTTP Controller Implementation

### Query Controller Pattern

```typescript
/**
 * WalletBalanceQueryController
 *
 * HTTP endpoints for reading wallet balance data.
 * Uses query service to retrieve read models.
 * Returns DTOs in API responses.
 */
export class WalletBalanceQueryController {
  constructor(
    private readonly queryService: GetWalletBalanceService
  ) {}

  /**
   * GET /api/wallets/:id
   * Get single wallet balance
   */
  async findById(ctx: HttpContext): Promise<void> {
    const walletId = ctx.params.id

    try {
      const wallet = await this.queryService.findById(walletId)

      if (!wallet) {
        ctx.status = 404
        ctx.json({ error: 'Wallet not found' })
        return
      }

      ctx.json(wallet)
    } catch (error) {
      console.error('Failed to get wallet:', error)
      ctx.status = 500
      ctx.json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/wallets
   * Get all wallets with filtering
   */
  async findAll(ctx: HttpContext): Promise<void> {
    try {
      const filters = {
        userId: ctx.query.userId as string,
        minBalance: ctx.query.minBalance ? Number(ctx.query.minBalance) : undefined,
        maxBalance: ctx.query.maxBalance ? Number(ctx.query.maxBalance) : undefined
      }

      const wallets = await this.queryService.findAll(filters)

      ctx.json({
        data: wallets,
        meta: {
          total: wallets.length,
          count: wallets.length
        }
      })
    } catch (error) {
      console.error('Failed to list wallets:', error)
      ctx.status = 500
      ctx.json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/wallets/search
   * Search wallets
   */
  async search(ctx: HttpContext): Promise<void> {
    const searchTerm = ctx.query.q as string

    if (!searchTerm || searchTerm.length < 3) {
      ctx.status = 400
      ctx.json({ error: 'Search term must be at least 3 characters' })
      return
    }

    try {
      const results = await this.queryService.search(searchTerm)

      ctx.json({
        data: results,
        meta: {
          total: results.length,
          searchTerm
        }
      })
    } catch (error) {
      console.error('Search failed:', error)
      ctx.status = 500
      ctx.json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/wallets/:userId/statistics
   * Get wallet statistics for user
   */
  async getStatistics(ctx: HttpContext): Promise<void> {
    const userId = ctx.params.userId

    try {
      const stats = await this.queryService.getStatistics(userId)

      ctx.json(stats)
    } catch (error) {
      console.error('Failed to get statistics:', error)
      ctx.status = 500
      ctx.json({ error: 'Internal server error' })
    }
  }
}
```

### Route Registration

```typescript
/**
 * Register wallet query routes
 */
export function registerWalletBalanceRoutes(core: PlanetCore): void {
  const controller = new WalletBalanceQueryController(
    new GetWalletBalanceService(
      new WalletBalanceReadModelRepository(core.get('db')),
      new WalletBalanceReadModelCache(
        new Map(),
        core.get('redis'),
        new WalletBalanceReadModelRepository(core.get('db'))
      )
    )
  )

  // GET endpoints (read-only)
  core.router.get('/api/wallets/:id', (ctx) => controller.findById(ctx))
  core.router.get('/api/wallets', (ctx) => controller.findAll(ctx))
  core.router.get('/api/wallets/search', (ctx) => controller.search(ctx))
  core.router.get(
    '/api/users/:userId/statistics',
    (ctx) => controller.getStatistics(ctx)
  )
}
```

---

## Integration with Event Sourcing

### Write Side + Read Side Integration

CQRS pairs perfectly with Event Sourcing:

```
Write Side (Event Sourcing)          Read Side (CQRS)
┌──────────────────────────┐        ┌──────────────────┐
│ Aggregate Root           │        │ Read Models      │
│ (maintains invariants)   │        │ (optimized)      │
└──────────────────────────┘        └──────────────────┘
        ↓                                   ▲
        │ Domain Events                     │
        ▼                                   │
┌──────────────────────────┐        ┌──────────────────┐
│ Event Store              │───────▶│ Projector        │
│ (append-only log)        │        │ (pure functions) │
└──────────────────────────┘        └──────────────────┘
```

### Complete Example

```typescript
// ===== WRITE SIDE (Event Sourcing) =====

interface DepositCommand {
  walletId: string
  amount: number
  reference: string
}

class DepositCommandHandler {
  execute(command: DepositCommand): void {
    // 1. Get aggregate from event store
    const events = this.eventStore.getEvents(command.walletId)
    const wallet = WalletAggregate.fromEvents(events)

    // 2. Execute command (may raise events)
    wallet.deposit(command.amount, command.reference)

    // 3. Save events
    this.eventStore.saveEvents(wallet.id, wallet.uncommittedEvents)

    // 4. Publish events
    this.eventBus.publish(wallet.uncommittedEvents)
  }
}

// ===== EVENT BUS =====

class EventBus {
  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      // Notify all subscribers
      const subscribers = this.getSubscribers(event.constructor.name)
      for (const subscriber of subscribers) {
        await subscriber.handle(event)
      }
    }
  }
}

// ===== READ SIDE (CQRS) =====

class WalletBalanceProjectionSubscriber implements EventSubscriber {
  async handle(event: DomainEvent): Promise<void> {
    // 1. Get current read model
    const readModel = await this.repository.findById(event.aggregateId)

    // 2. Project event
    const updated = this.projector.project(event, readModel)

    // 3. Save to read model database
    await this.repository.save(updated)

    // 4. Invalidate cache
    await this.cache.invalidate(event.aggregateId)
  }
}

// ===== QUERIES =====

class GetWalletBalanceService {
  async findById(walletId: string): Promise<WalletBalanceDTO> {
    // Read from optimized read model
    const readModel = await this.repository.findById(walletId)
    return WalletBalanceDTO.fromReadModel(readModel)
  }
}

// ===== FLOW =====

// 1. User deposits money
const command = new DepositCommand('w1', 100, 'DEP-123')
await commandHandler.execute(command) // Saves events

// 2. Events are published
// → WalletBalanceProjectionSubscriber.handle(MoneyDepositedEvent)

// 3. Read model is updated
// await repository.save(updatedModel)

// 4. User queries balance
const balance = await queryService.findById('w1') // Returns updated balance
```

---

## Testing CQRS Modules

### Three-Layer Testing Strategy

#### 1. Unit Tests: Pure Projectors

Test projectors in isolation (no dependencies):

```typescript
describe('WalletEventProjector', () => {
  describe('projectMoneyDeposited', () => {
    it('should update balance', () => {
      const currentModel = {
        id: 'w1',
        balance: 100,
        totalDepositCount: 1,
        lastProjectedEventId: 'e1'
      }

      const event = new MoneyDepositedEvent('w1', 50, 'e2', new Date())
      const result = WalletEventProjector.project(event, currentModel)

      expect(result.balance).toBe(150)
      expect(result.totalDepositCount).toBe(2)
    })

    it('should be idempotent', () => {
      const model = { /* ... */ }
      const event = { /* ... */ }

      const result1 = WalletEventProjector.project(event, model)
      const result2 = WalletEventProjector.project(event, result1)

      expect(result1).toEqual(result2)
    })
  })
})
```

#### 2. Integration Tests: Subscribers + Repository

Test event subscription and persistence:

```typescript
describe('WalletBalanceProjectionSubscriber', () => {
  let subscriber: WalletBalanceProjectionSubscriber
  let mockRepository: IWalletBalanceReadModelRepository
  let mockProjector: WalletEventProjector

  beforeEach(() => {
    mockRepository = new InMemoryRepository()
    mockProjector = new WalletEventProjector()
    subscriber = new WalletBalanceProjectionSubscriber(
      mockProjector,
      mockRepository
    )
  })

  it('should project events to read models', async () => {
    const event = new MoneyDepositedEvent(
      'w1',
      100,
      'e1',
      new Date()
    )

    await subscriber.handle(event)

    const saved = await mockRepository.findById('w1')
    expect(saved.balance).toBe(100)
  })

  it('should handle multiple events in sequence', async () => {
    const event1 = new MoneyDepositedEvent('w1', 100, 'e1', new Date())
    const event2 = new MoneyDepositedEvent('w1', 50, 'e2', new Date())

    await subscriber.handle(event1)
    await subscriber.handle(event2)

    const saved = await mockRepository.findById('w1')
    expect(saved.balance).toBe(150)
  })
})
```

#### 3. Feature Tests: Full Query Endpoints

Test complete queries end-to-end:

```typescript
describe('GET /api/wallets/:id', () => {
  it('should return wallet balance', async () => {
    // Setup: Create read model
    await repository.save({
      id: 'w1',
      userId: 'u1',
      balance: 100,
      // ... other fields
    })

    // Execute
    const response = await fetch('http://localhost:3000/api/wallets/w1')

    // Verify
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.balance).toBe(100)
  })
})
```

---

## Real-World Examples

### Example 1: E-Commerce Order Query Module

```typescript
/**
 * Read model for order queries
 * Denormalized for efficient searches
 */
interface OrderReadModel {
  readonly id: string
  readonly customerId: string
  readonly customerName: string
  readonly customerEmail: string

  readonly status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'
  readonly totalAmount: number
  readonly itemCount: number
  readonly shippingAddress: string

  readonly items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
  }>

  readonly createdAt: Date
  readonly shippedAt: Date | null
  readonly deliveredAt: Date | null

  readonly projectionVersion: number
  readonly lastProjectedEventId: string
}

/**
 * Event projector for order events
 */
export class OrderEventProjector {
  static project(
    event: OrderEvent,
    currentModel: OrderReadModel | null
  ): OrderReadModel {
    switch (event.constructor.name) {
      case 'OrderCreatedEvent':
        return this.projectOrderCreated(event, currentModel)
      case 'OrderConfirmedEvent':
        return this.projectOrderConfirmed(event, currentModel!)
      case 'OrderShippedEvent':
        return this.projectOrderShipped(event, currentModel!)
      // ... more events
      default:
        return currentModel!
    }
  }

  private static projectOrderCreated(
    event: OrderCreatedEvent,
    _: OrderReadModel | null
  ): OrderReadModel {
    return {
      id: event.orderId,
      customerId: event.customerId,
      customerName: event.customerName,
      customerEmail: event.customerEmail,
      status: 'PENDING',
      totalAmount: event.totalAmount,
      itemCount: event.items.length,
      shippingAddress: event.shippingAddress,
      items: event.items,
      createdAt: event.occurredAt,
      shippedAt: null,
      deliveredAt: null,
      projectionVersion: 1,
      lastProjectedEventId: event.eventId
    }
  }

  private static projectOrderConfirmed(
    event: OrderConfirmedEvent,
    current: OrderReadModel
  ): OrderReadModel {
    return {
      ...current,
      status: 'CONFIRMED',
      projectionVersion: current.projectionVersion + 1,
      lastProjectedEventId: event.eventId
    }
  }

  private static projectOrderShipped(
    event: OrderShippedEvent,
    current: OrderReadModel
  ): OrderReadModel {
    return {
      ...current,
      status: 'SHIPPED',
      shippedAt: event.occurredAt,
      projectionVersion: current.projectionVersion + 1,
      lastProjectedEventId: event.eventId
    }
  }
}

/**
 * Query service for orders
 */
export class GetOrdersService {
  constructor(private readonly repository: IOrderReadModelRepository) {}

  async findByCustomerId(customerId: string): Promise<OrderDTO[]> {
    const readModels = await this.repository.findByCustomerId(customerId)
    return readModels.map(m => OrderDTO.fromReadModel(m))
  }

  async findByStatus(status: string): Promise<OrderDTO[]> {
    const readModels = await this.repository.findByStatus(status)
    return readModels.map(m => OrderDTO.fromReadModel(m))
  }

  async getOrderTimeline(orderId: string): Promise<OrderTimelineDTO> {
    const order = await this.repository.findById(orderId)
    return {
      orderId: order.id,
      created: order.createdAt,
      confirmed: order.confirmedAt,
      shipped: order.shippedAt,
      delivered: order.deliveredAt,
      timeline: [
        { status: 'CREATED', at: order.createdAt },
        { status: 'CONFIRMED', at: order.confirmedAt },
        { status: 'SHIPPED', at: order.shippedAt },
        { status: 'DELIVERED', at: order.deliveredAt }
      ]
    }
  }
}
```

### Example 2: Analytics Dashboard Query Module

```typescript
/**
 * Read model for analytics
 * Pre-aggregated for dashboard queries
 */
interface DashboardMetricsReadModel {
  readonly period: string
  readonly revenue: number
  readonly orderCount: number
  readonly averageOrderValue: number
  readonly customerCount: number
  readonly newCustomersCount: number
  readonly topProducts: Array<{ productId: string; name: string; sales: number }>
  readonly conversionRate: number
  readonly lastUpdatedAt: Date
  readonly projectionVersion: number
}

/**
 * Event projector for analytics
 * Maintains running aggregations
 */
export class DashboardMetricsProjector {
  static project(
    event: DomainEvent,
    currentModel: DashboardMetricsReadModel | null
  ): DashboardMetricsReadModel {
    const period = this.getPeriodKey(event.occurredAt)

    switch (event.constructor.name) {
      case 'OrderConfirmedEvent': {
        const orderEvent = event as OrderConfirmedEvent
        return {
          ...currentModel!,
          period,
          revenue: (currentModel?.revenue || 0) + orderEvent.totalAmount,
          orderCount: (currentModel?.orderCount || 0) + 1,
          averageOrderValue:
            ((currentModel?.revenue || 0) + orderEvent.totalAmount) /
            ((currentModel?.orderCount || 0) + 1),
          projectionVersion: (currentModel?.projectionVersion || 0) + 1,
          lastUpdatedAt: event.occurredAt
        }
      }
      case 'CustomerRegisteredEvent':
        return {
          ...currentModel!,
          period,
          customerCount: (currentModel?.customerCount || 0) + 1,
          newCustomersCount: (currentModel?.newCustomersCount || 0) + 1,
          projectionVersion: (currentModel?.projectionVersion || 0) + 1,
          lastUpdatedAt: event.occurredAt
        }
      // ... more events
      default:
        return currentModel!
    }
  }

  private static getPeriodKey(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }
}

/**
 * Query service for analytics
 */
export class GetDashboardMetricsService {
  constructor(private readonly repository: IDashboardMetricsRepository) {}

  async getCurrentMetrics(): Promise<DashboardMetricsDTO> {
    const month = new Date().toISOString().slice(0, 7)
    const model = await this.repository.findByPeriod(month)
    return DashboardMetricsDTO.fromReadModel(model)
  }

  async getMetricsHistory(
    months: number = 12
  ): Promise<DashboardMetricsDTO[]> {
    const models = await this.repository.findLastNPeriods(months)
    return models.map(m => DashboardMetricsDTO.fromReadModel(m))
  }
}
```

---

## Performance Optimization

### Query Performance Tips

#### 1. Index Strategy

```typescript
/**
 * Indexing read models
 */
export class WalletBalanceReadModelRepository {
  async setup(): Promise<void> {
    // Single field indexes
    await this.db.index('wallet_balance', 'id')
    await this.db.index('wallet_balance', 'userId')
    await this.db.index('wallet_balance', 'balance')

    // Composite indexes for common queries
    await this.db.compositeIndex('wallet_balance', ['userId', 'balance'])
    await this.db.compositeIndex('wallet_balance', ['userId', 'updatedAt'])
  }

  // Now queries are fast
  async findByUserId(userId: string): Promise<WalletReadModel[]> {
    // Uses composite index on (userId, updatedAt)
    return this.db.query('SELECT * FROM wallet_balance WHERE userId = ?', [userId])
  }
}
```

#### 2. Pagination

```typescript
/**
 * Paginate large result sets
 */
export class GetWalletsService {
  async findAllPaginated(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<WalletDTO>> {
    const offset = (page - 1) * limit

    const total = await this.repository.count()
    const models = await this.repository.findAll()
      .limit(limit)
      .offset(offset)

    return {
      data: models.map(m => WalletDTO.fromReadModel(m)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }
}
```

#### 3. Projection Batching

```typescript
/**
 * Batch event projections for efficiency
 */
export class BatchProjectionSubscriber {
  private eventQueue: DomainEvent[] = []
  private timer: NodeJS.Timeout | null = null

  async onEvent(event: DomainEvent): Promise<void> {
    this.eventQueue.push(event)

    // Process every 100 events or every 5 seconds
    if (this.eventQueue.length >= 100) {
      await this.flushQueue()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flushQueue(), 5000)
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return

    const events = this.eventQueue.splice(0)

    // Batch update in database
    const updates = events.map(e => this.projector.project(e))
    await this.repository.saveMany(updates)

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
```

#### 4. Materialized Views

```typescript
/**
 * Pre-compute complex queries
 */
export class WalletStatisticsReadModel {
  readonly id: string
  readonly userId: string

  // Pre-aggregated statistics
  readonly totalDeposits: number
  readonly totalWithdrawals: number
  readonly depositCount: number
  readonly withdrawalCount: number
  readonly averageDepositAmount: number
  readonly averageWithdrawalAmount: number
  readonly largestDepositAmount: number
  readonly largestWithdrawalAmount: number

  readonly lastUpdatedAt: Date
}

/**
 * Subscriber that maintains materialized view
 */
export class WalletStatisticsProjector {
  async handle(event: WalletEvent): Promise<void> {
    let stats = await this.repository.findById(event.walletId) ||
      this.createEmptyStats(event.walletId)

    // Update aggregate values
    if (event instanceof MoneyDepositedEvent) {
      stats.totalDeposits += event.amount
      stats.depositCount++
      stats.averageDepositAmount = stats.totalDeposits / stats.depositCount
      stats.largestDepositAmount = Math.max(
        stats.largestDepositAmount,
        event.amount
      )
    }

    // Save materialized view
    await this.repository.save(stats)
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Eventual Consistency Lag

**Problem**: User sees stale data after mutation

```
User: Deposit $100
  ↓
Write side: Creates event ✓
  ↓
Event bus: Publishes event ✓
  ↓
Read side: Projects event (3ms delay) ⏳
  ↓
User query: Sees old balance (without new $100)
```

**Solution**: Options based on requirements

```typescript
// Option 1: Optimistic updates (client-side)
async deposit(amount: number): Promise<void> {
  // Optimistically update UI
  this.wallet.balance += amount

  try {
    // Send command
    await api.deposit(amount)
    // Command succeeds, projection will follow
  } catch (error) {
    // Revert optimistic update
    this.wallet.balance -= amount
    throw error
  }
}

// Option 2: Synchronous read-after-write
async deposit(amount: number): Promise<void> {
  const result = await api.deposit(amount)

  // Wait for projection with timeout
  const startTime = Date.now()
  while (Date.now() - startTime < 5000) {
    const balance = await api.getBalance()
    if (balance >= this.wallet.balance + amount) {
      this.wallet.balance = balance
      return
    }
    await sleep(100)
  }

  throw new Error('Projection timeout')
}

// Option 3: Event ID in response
async deposit(amount: number): Promise<void> {
  const { eventId } = await api.deposit(amount)

  // Wait for specific event to be projected
  const startTime = Date.now()
  while (Date.now() - startTime < 5000) {
    const model = await api.getBalance()
    if (model.lastProjectedEventId === eventId) {
      return // Projection complete
    }
    await sleep(100)
  }
}
```

#### 2. Projection Failures

**Problem**: Event failed to project, read model is stale

```
Solution: Implement projection failure handling
```

```typescript
export class ResilientProjectionSubscriber {
  constructor(
    private readonly projector: EventProjector,
    private readonly repository: ReadModelRepository,
    private readonly failureLog: ProjectionFailureLog
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    try {
      const model = await this.repository.findById(event.aggregateId)
      const updated = this.projector.project(event, model)
      await this.repository.save(updated)
    } catch (error) {
      // Log failure for manual recovery
      await this.failureLog.record({
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        error: String(error),
        timestamp: new Date()
      })

      // Don't throw - let event bus continue
      console.error('Projection failed:', error)
    }
  }

  /**
   * Manual recovery: Replay events for specific aggregate
   */
  async rebuildProjection(aggregateId: string): Promise<void> {
    // 1. Get all events for aggregate
    const events = await this.eventStore.getEventsFor(aggregateId)

    // 2. Rebuild read model from scratch
    let model = null
    for (const event of events) {
      model = this.projector.project(event, model)
    }

    // 3. Save rebuilt model
    if (model) {
      await this.repository.save(model)
    }
  }

  /**
   * Rebuild all projections
   */
  async rebuildAll(): Promise<void> {
    const aggregateIds = await this.eventStore.getAllAggregateIds()

    for (const id of aggregateIds) {
      try {
        await this.rebuildProjection(id)
        console.log(`✓ Rebuilt projection for ${id}`)
      } catch (error) {
        console.error(`✗ Failed to rebuild ${id}:`, error)
      }
    }
  }
}
```

#### 3. Memory Leaks in Cache

**Problem**: Cache grows unbounded, memory exhausted

```typescript
/**
 * Fix: Implement cache size limits and eviction
 */
export class LimitedCache {
  private readonly cache = new LRUCache<string, any>({
    max: 10000,           // Max 10,000 items
    maxSize: 100 * 1024,  // Max 100MB
    ttl: 300 * 1000       // 5 minute TTL
  })

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // LRU cache automatically evicts least-recently-used items
    this.cache.set(key, value, { ttl })
  }

  async get(key: string): Promise<any | null> {
    return this.cache.get(key) ?? null
  }
}
```

#### 4. Out-of-Order Event Processing

**Problem**: Events processed out of order, breaking invariants

```
Event 1: Create wallet
Event 2: Deposit $100
Event 3: Withdraw $50

But processed as: 2 → 1 → 3
Result: Withdraw fails because wallet doesn't exist yet
```

**Solution**: Process events sequentially per aggregate

```typescript
/**
 * Sequential projection per aggregate
 */
export class SequentialProjector {
  private readonly queues = new Map<string, Promise<void>>()

  async project(event: DomainEvent, model: ReadModel): Promise<void> {
    const aggregateId = event.aggregateId

    // Get queue for this aggregate
    let queue = this.queues.get(aggregateId) ?? Promise.resolve()

    // Enqueue projection
    queue = queue
      .then(async () => {
        const current = await this.repository.findById(aggregateId)
        const updated = this.projector.project(event, current)
        await this.repository.save(updated)
      })
      .catch(err => {
        console.error(`Projection failed for ${aggregateId}:`, err)
      })

    this.queues.set(aggregateId, queue)
  }
}
```

---

## Best Practices

### 1. Read Model Design

```typescript
// ✅ DO: Design for specific queries
interface UserDashboardReadModel {
  id: string
  name: string
  recentOrders: Order[]      // Pre-filtered
  totalSpent: number         // Pre-aggregated
  loyaltyTier: string        // Pre-calculated
}

// ❌ DON'T: Generic, normalized read model
interface UserReadModel {
  id: string
  name: string
  // Need to join, filter, aggregate for every query
}
```

### 2. Projector Purity

```typescript
// ✅ DO: Pure projectors
const projectEvent = (event: Event, model: Model) => ({
  ...model,
  field: model.field + event.value
})

// ❌ DON'T: Side effects in projectors
const projectEvent = (event: Event, model: Model) => {
  model.field += event.value  // Mutation
  email.send(...)             // Side effect
  return model
}
```

### 3. Testing Readiness

```typescript
// ✅ DO: Testable repositories
interface IRepository {
  findById(id: string): Promise<Model>
  save(model: Model): Promise<void>
}

// Use in-memory implementations for tests
class InMemoryRepository implements IRepository {
  private models = new Map<string, Model>()

  async findById(id: string): Promise<Model> {
    return this.models.get(id)!
  }

  async save(model: Model): Promise<void> {
    this.models.set(model.id, model)
  }
}

// ❌ DON'T: Coupled to database
class QueryService {
  private db = new Database() // Direct database dependency
}
```

### 4. Graceful Degradation

```typescript
// ✅ DO: Cache failures don't break functionality
async getUser(id: string): Promise<User> {
  try {
    return await cache.get(id)
  } catch (cacheError) {
    console.warn('Cache error:', cacheError)
    // Fall through to database
  }

  return await database.findById(id)
}

// ❌ DON'T: Cascading failures
async getUser(id: string): Promise<User> {
  const user = await cache.get(id) // Throws if cache down
  return user
}
```

### 5. Monitoring & Observability

```typescript
/**
 * Monitor projection lag
 */
export class MonitoredProjector {
  async project(event: DomainEvent, model: Model): Promise<Model> {
    const before = Date.now()

    try {
      const result = this.projector.project(event, model)
      const duration = Date.now() - before

      // Track projection metrics
      metrics.record('projection.duration', duration)
      metrics.increment('projection.success')

      return result
    } catch (error) {
      const duration = Date.now() - before
      metrics.record('projection.duration', duration)
      metrics.increment('projection.failure')
      throw error
    }
  }

  /**
   * Monitor read model staleness
   */
  async checkStaleness(): Promise<void> {
    const models = await this.repository.findAll()

    for (const model of models) {
      const lag = Date.now() - model.lastProjectedAt.getTime()
      metrics.record('read_model.lag_ms', lag)

      if (lag > 60000) { // > 1 minute
        console.warn(`High lag for ${model.id}: ${lag}ms`)
      }
    }
  }
}
```

---

## Summary

CQRS is a powerful pattern that separates concerns and enables scalability:

1. **Write Side**: Uses Event Sourcing for strong consistency and complete history
2. **Read Side**: Denormalizes for optimal query performance
3. **Event Projectors**: Pure functions transform events to read models
4. **Eventual Consistency**: Accept brief lags for huge performance gains
5. **Caching**: Critical for performance at scale
6. **Testing**: Pure projectors are deterministic and easy to test

Start simple with a single read model, then add complexity as needed. Monitor projection lag and maintain projection failure recovery.

Happy projecting! 🎬

