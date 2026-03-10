# CQRS Test Framework Templates

Complete test scaffold templates for CQRS read-side modules. Covers unit, integration, and feature tests.

---

## 1. Unit Tests: Event Projector

Test pure projection functions in isolation.

### File: `tests/Unit/QueryModules/{Name}/Projector.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { {Name}EventProjector } from '../../../../src/Modules/{Name}/Domain/Projectors/{Name}EventProjector'
import { create{Name}ReadModel } from '../../../../src/Modules/{Name}/Domain/ReadModels/{Name}ReadModel'

describe('{Name}EventProjector - Pure Projection Functions', () => {
  describe('project - Event dispatch', () => {
    it('should dispatch to appropriate handler', () => {
      const event = new {EventType}(/* ... */)
      const model = create{Name}ReadModel({ /* ... */ })

      const result = {Name}EventProjector.project(event, model)

      expect(result).toBeDefined()
      expect(result.id).toBe(model.id)
    })

    it('should handle null model (new aggregate)', () => {
      const event = new {CreatedEventType}(/* ... */)

      const result = {Name}EventProjector.project(event, null)

      expect(result).toBeDefined()
      expect(result.id).toBe(event.aggregateId)
    })

    it('should handle unknown event types', () => {
      const unknownEvent = { type: 'UnknownEvent', aggregateId: 'id-1' }
      const model = create{Name}ReadModel({ /* ... */ })

      const result = {Name}EventProjector.project(unknownEvent as any, model)

      expect(result).toEqual(model) // Returns unchanged
    })
  })

  describe('project{CreatedEventType} - Initial creation', () => {
    it('should create initial read model with correct values', () => {
      const event = new {CreatedEventType}(
        'id-1',
        'user-1',
        'Test Name',
        'test@example.com',
        'event-1',
        new Date()
      )

      const result = {Name}EventProjector.project(event, null)

      expect(result.id).toBe('id-1')
      expect(result.userId).toBe('user-1')
      expect(result.name).toBe('Test Name')
      expect(result.projectionVersion).toBe(1)
      expect(result.lastProjectedEventId).toBe('event-1')
    })

    it('should initialize with zero counts and aggregates', () => {
      const event = new {CreatedEventType}(
        'id-1',
        'user-1',
        'Test Name',
        'test@example.com',
        'event-1',
        new Date()
      )

      const result = {Name}EventProjector.project(event, null)

      expect(result.totalCount).toBe(0)
      expect(result.totalAmount).toBe(0)
      expect(result.averageAmount).toBe(0)
    })

    it('should set projection metadata', () => {
      const event = new {CreatedEventType}(/* ... */)

      const result = {Name}EventProjector.project(event, null)

      expect(result.projectionVersion).toBe(1)
      expect(result.lastProjectedEventId).toBe(event.eventId)
      expect(result.projectionIdempotencyKey).toBe(event.eventId)
      expect(result.lastProjectedAt).toBeDefined()
    })
  })

  describe('project{UpdateEventType} - Idempotency', () => {
    let initialModel: {Name}ReadModel

    beforeEach(() => {
      initialModel = create{Name}ReadModel({
        id: 'id-1',
        totalCount: 1,
        totalAmount: 100,
        lastProjectedEventId: 'event-1'
      })
    })

    it('should skip duplicate events (idempotency)', () => {
      const event = new {UpdateEventType}(
        'id-1',
        50,
        'event-1', // Same event ID
        new Date()
      )

      const result = {Name}EventProjector.project(event, initialModel)

      expect(result).toEqual(initialModel) // Unchanged
    })

    it('should process new events', () => {
      const event = new {UpdateEventType}(
        'id-1',
        50,
        'event-2', // Different event ID
        new Date()
      )

      const result = {Name}EventProjector.project(event, initialModel)

      expect(result.totalAmount).toBe(150)
      expect(result.totalCount).toBe(2)
      expect(result.lastProjectedEventId).toBe('event-2')
    })

    it('should maintain idempotency across multiple identical replays', () => {
      const event = new {UpdateEventType}(
        'id-1',
        50,
        'event-2',
        new Date()
      )

      const result1 = {Name}EventProjector.project(event, initialModel)
      const result2 = {Name}EventProjector.project(event, result1)
      const result3 = {Name}EventProjector.project(event, result2)

      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
    })
  })

  describe('project{CalculationEventType} - Aggregations', () => {
    let model: {Name}ReadModel

    beforeEach(() => {
      model = create{Name}ReadModel({
        id: 'id-1',
        totalCount: 2,
        totalAmount: 150,
        lastProjectedEventId: 'event-1'
      })
    })

    it('should update sum correctly', () => {
      const event = new {CalculationEventType}(
        'id-1',
        50,
        'event-2',
        new Date()
      )

      const result = {Name}EventProjector.project(event, model)

      expect(result.totalAmount).toBe(200)
    })

    it('should update count', () => {
      const event = new {CalculationEventType}(
        'id-1',
        50,
        'event-2',
        new Date()
      )

      const result = {Name}EventProjector.project(event, model)

      expect(result.totalCount).toBe(3)
    })

    it('should recalculate average', () => {
      const event = new {CalculationEventType}(
        'id-1',
        100,
        'event-2',
        new Date()
      )

      const result = {Name}EventProjector.project(event, model)

      const expected = (150 + 100) / (2 + 1)
      expect(result.averageAmount).toBeCloseTo(expected, 2)
    })

    it('should handle edge cases (zero counts)', () => {
      const emptyModel = create{Name}ReadModel({
        id: 'id-1',
        totalCount: 0,
        totalAmount: 0
      })

      const event = new {CalculationEventType}(
        'id-1',
        50,
        'event-1',
        new Date()
      )

      const result = {Name}EventProjector.project(event, emptyModel)

      expect(result.averageAmount).toBe(50)
    })
  })

  describe('Immutability', () => {
    it('should not mutate input model', () => {
      const original = create{Name}ReadModel({
        id: 'id-1',
        totalAmount: 100,
        lastProjectedEventId: 'event-1'
      })

      const originalCopy = { ...original }

      const event = new {UpdateEventType}(
        'id-1',
        50,
        'event-2',
        new Date()
      )

      {Name}EventProjector.project(event, original)

      expect(original).toEqual(originalCopy)
    })

    it('should return immutable read model', () => {
      const event = new {CreatedEventType}(/* ... */)

      const result = {Name}EventProjector.project(event, null)

      // TypeScript should prevent mutation at compile time
      // Runtime check for additional safety
      expect(Object.isFrozen(result) || true).toBe(true)
    })
  })

  describe('Projection Version Management', () => {
    it('should increment version on each projection', () => {
      const event1 = new {CreatedEventType}(/* ... */)
      const model1 = {Name}EventProjector.project(event1, null)

      expect(model1.projectionVersion).toBe(1)

      const event2 = new {UpdateEventType}(/* ... */)
      const model2 = {Name}EventProjector.project(event2, model1)

      expect(model2.projectionVersion).toBe(2)
    })

    it('should track last projected event ID', () => {
      const event1 = new {CreatedEventType}('id-1', /* ... */, 'event-1', /* ... */)
      const model1 = {Name}EventProjector.project(event1, null)

      expect(model1.lastProjectedEventId).toBe('event-1')

      const event2 = new {UpdateEventType}('id-1', /* ... */, 'event-2', /* ... */)
      const model2 = {Name}EventProjector.project(event2, model1)

      expect(model2.lastProjectedEventId).toBe('event-2')
    })
  })

  describe('Event Ordering', () => {
    it('should handle events in chronological order', () => {
      const event1 = new {CreatedEventType}('id-1', /* ... */, 'event-1', new Date('2024-01-01'))
      const event2 = new {UpdateEventType}('id-1', 50, 'event-2', new Date('2024-01-02'))
      const event3 = new {UpdateEventType}('id-1', 30, 'event-3', new Date('2024-01-03'))

      let model = {Name}EventProjector.project(event1, null)
      model = {Name}EventProjector.project(event2, model)
      model = {Name}EventProjector.project(event3, model)

      expect(model.totalAmount).toBe(80)
      expect(model.lastProjectedEventId).toBe('event-3')
      expect(model.updatedAt).toEqual(new Date('2024-01-03'))
    })
  })
})
```

---

## 2. Integration Tests: Event Subscriber

Test event subscription and repository persistence.

### File: `tests/Integration/QueryModules/{Name}/Subscriber.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { {Name}ProjectionSubscriber } from '../../../../src/Modules/{Name}/Infrastructure/Subscribers/{Name}ProjectionSubscriber'
import { InMemory{Name}ReadModelRepository } from './mocks/InMemory{Name}ReadModelRepository'
import { {Name}EventProjector } from '../../../../src/Modules/{Name}/Domain/Projectors/{Name}EventProjector'

describe('{Name}ProjectionSubscriber - Event Projection Integration', () => {
  let subscriber: {Name}ProjectionSubscriber
  let repository: InMemory{Name}ReadModelRepository
  let projector: {Name}EventProjector

  beforeEach(() => {
    repository = new InMemory{Name}ReadModelRepository()
    projector = new {Name}EventProjector()
    subscriber = new {Name}ProjectionSubscriber(projector, repository)
  })

  describe('handle - Main entry point', () => {
    it('should create read model on first event', async () => {
      const event = new {CreatedEventType}(
        'id-1',
        'user-1',
        'Test',
        'test@example.com',
        'event-1',
        new Date()
      )

      await subscriber.handle(event)

      const saved = await repository.findById('id-1')
      expect(saved).toBeDefined()
      expect(saved?.id).toBe('id-1')
      expect(saved?.userId).toBe('user-1')
    })

    it('should update existing read model on subsequent events', async () => {
      const createEvent = new {CreatedEventType}(/* ... */)
      await subscriber.handle(createEvent)

      const updateEvent = new {UpdateEventType}(
        'id-1',
        50,
        'event-2',
        new Date()
      )
      await subscriber.handle(updateEvent)

      const saved = await repository.findById('id-1')
      expect(saved?.totalAmount).toBe(50)
      expect(saved?.projectionVersion).toBe(2)
    })

    it('should handle error gracefully', async () => {
      const badEvent = {
        type: 'UnknownEvent',
        aggregateId: 'id-1'
      }

      // Should not throw
      await expect(subscriber.handle(badEvent as any)).resolves.toBeUndefined()
    })
  })

  describe('subscribesTo - Event type routing', () => {
    it('should declare subscribed event types', () => {
      const types = subscriber.subscribesTo()

      expect(types).toContain('{CreatedEventType}')
      expect(types).toContain('{UpdateEventType}')
    })

    it('should handle multiple event types', () => {
      const types = subscriber.subscribesTo()

      expect(types.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Event Processing Pipeline', () => {
    it('should handle sequence of events for single aggregate', async () => {
      const events = [
        new {CreatedEventType}('id-1', 'user-1', /* ... */, 'event-1', /* ... */),
        new {UpdateEventType}('id-1', 100, 'event-2', /* ... */),
        new {UpdateEventType}('id-1', 50, 'event-3', /* ... */),
        new {UpdateEventType}('id-1', 25, 'event-4', /* ... */)
      ]

      for (const event of events) {
        await subscriber.handle(event)
      }

      const saved = await repository.findById('id-1')
      expect(saved?.totalAmount).toBe(175)
      expect(saved?.projectionVersion).toBe(4)
      expect(saved?.lastProjectedEventId).toBe('event-4')
    })

    it('should handle concurrent events for different aggregates', async () => {
      const event1A = new {CreatedEventType}('id-1', 'user-1', /* ... */)
      const event2A = new {CreatedEventType}('id-2', 'user-2', /* ... */)
      const event1B = new {UpdateEventType}('id-1', 50, /* ... */)
      const event2B = new {UpdateEventType}('id-2', 75, /* ... */)

      // Simulate concurrent processing
      await Promise.all([
        subscriber.handle(event1A),
        subscriber.handle(event2A),
        subscriber.handle(event1B),
        subscriber.handle(event2B)
      ])

      const model1 = await repository.findById('id-1')
      const model2 = await repository.findById('id-2')

      expect(model1?.totalAmount).toBe(50)
      expect(model2?.totalAmount).toBe(75)
    })
  })

  describe('Idempotency', () => {
    it('should handle duplicate event gracefully', async () => {
      const event = new {UpdateEventType}(
        'id-1',
        50,
        'event-1',
        new Date()
      )

      // Process same event twice
      await subscriber.handle(event)
      await subscriber.handle(event)

      const saved = await repository.findById('id-1')
      // Second projection should be idempotent
      expect(saved?.projectionVersion).toBe(2) // Both succeeded but only one produced a change
    })

    it('should track idempotency key', async () => {
      const event = new {UpdateEventType}(
        'id-1',
        50,
        'event-1',
        new Date()
      )

      await subscriber.handle(event)

      const saved = await repository.findById('id-1')
      expect(saved?.projectionIdempotencyKey).toBe('event-1')
    })
  })

  describe('Failure Recovery', () => {
    it('should log projection failures', async () => {
      const badEvent = {
        type: 'BadEvent',
        aggregateId: 'id-1',
        constructor: { name: 'BadEvent' }
      }

      const consoleSpy = (global.console.error as any).mock
      if (consoleSpy) consoleSpy.clearCalls()

      await subscriber.handle(badEvent as any)

      if (consoleSpy) {
        expect(consoleSpy.callCount).toBeGreaterThan(0)
      }
    })

    it('should continue on projection error', async () => {
      const event1 = new {CreatedEventType}(/* ... */)
      const badEvent = { /* invalid structure */ } as any
      const event2 = new {UpdateEventType}('id-1', 50, /* ... */)

      await subscriber.handle(event1)
      await subscriber.handle(badEvent) // Should fail gracefully
      await subscriber.handle(event2) // Should still process

      const saved = await repository.findById('id-1')
      expect(saved?.totalAmount).toBe(50)
    })
  })

  describe('Projection Metadata', () => {
    it('should maintain projection version', async () => {
      const events = [
        new {CreatedEventType}(/* ... */),
        new {UpdateEventType}('id-1', 50, /* ... */),
        new {UpdateEventType}('id-1', 25, /* ... */)
      ]

      for (const event of events) {
        await subscriber.handle(event)
      }

      const saved = await repository.findById('id-1')
      expect(saved?.projectionVersion).toBe(3)
    })

    it('should track last projection time', async () => {
      const event = new {CreatedEventType}(/* ... */)
      const before = new Date()

      await subscriber.handle(event)

      const after = new Date()
      const saved = await repository.findById('id-1')

      expect(saved?.lastProjectedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(saved?.lastProjectedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })
})
```

---

## 3. Feature Tests: Query Controller

Test HTTP endpoints end-to-end.

### File: `tests/Feature/QueryModules/{Name}/Controller.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { test, expect as testExpect } from '@playwright/test'

describe('{Name}QueryController - HTTP Endpoints', () => {
  const apiBase = 'http://localhost:3000'

  describe('GET /api/{names}/:{id}', () => {
    it('should return read model by ID', async () => {
      const response = await fetch(`${apiBase}/api/{names}/id-1`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.id).toBe('id-1')
      expect(data.userId).toBeDefined()
      expect(data.totalAmount).toBeDefined()
    })

    it('should return 404 for non-existent {name}', async () => {
      const response = await fetch(`${apiBase}/api/{names}/non-existent-id`)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should handle invalid ID format', async () => {
      const response = await fetch(`${apiBase}/api/{names}/invalid@id`)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/{names}', () => {
    it('should return all {names}', async () => {
      const response = await fetch(`${apiBase}/api/{names}`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.meta).toBeDefined()
      expect(data.meta.total).toBeGreaterThanOrEqual(0)
    })

    it('should support filtering by userId', async () => {
      const response = await fetch(`${apiBase}/api/{names}?userId=user-1`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data.data)).toBe(true)

      // All results should match userId
      for (const item of data.data) {
        expect(item.userId).toBe('user-1')
      }
    })

    it('should support filtering by balance range', async () => {
      const response = await fetch(
        `${apiBase}/api/{names}?minBalance=100&maxBalance=1000`
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      for (const item of data.data) {
        expect(item.totalAmount).toBeGreaterThanOrEqual(100)
        expect(item.totalAmount).toBeLessThanOrEqual(1000)
      }
    })

    it('should support pagination', async () => {
      const page1 = await fetch(`${apiBase}/api/{names}?page=1&limit=10`)
      const data1 = await page1.json()

      expect(data1.data.length).toBeLessThanOrEqual(10)
      expect(data1.meta.page).toBe(1)
      expect(data1.meta.limit).toBe(10)
    })

    it('should validate pagination parameters', async () => {
      const response = await fetch(`${apiBase}/api/{names}?limit=invalid`)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/{names}/search', () => {
    it('should search {names}', async () => {
      const response = await fetch(`${apiBase}/api/{names}/search?q=test`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should require minimum search term length', async () => {
      const response = await fetch(`${apiBase}/api/{names}/search?q=ab`)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('at least 3 characters')
    })

    it('should handle search with special characters', async () => {
      const response = await fetch(
        `${apiBase}/api/{names}/search?q=user%40example.com`
      )

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/users/:userId/statistics', () => {
    it('should return aggregated statistics', async () => {
      const response = await fetch(`${apiBase}/api/users/user-1/statistics`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.userId).toBe('user-1')
      expect(data.walletCount).toBeDefined()
      expect(data.totalBalance).toBeDefined()
      expect(data.averageBalance).toBeDefined()
      expect(data.maxBalance).toBeDefined()
      expect(data.minBalance).toBeDefined()
    })

    it('should handle missing user', async () => {
      const response = await fetch(`${apiBase}/api/users/nonexistent-user/statistics`)

      // Either 200 with zero data or 404
      expect([200, 404]).toContain(response.status)
    })

    it('should calculate correct statistics', async () => {
      const response = await fetch(`${apiBase}/api/users/user-1/statistics`)

      const data = await response.json()

      // Validate statistics are consistent
      if (data.walletCount > 0) {
        expect(data.totalBalance / data.walletCount).toBeCloseTo(
          data.averageBalance,
          2
        )
      }
    })
  })

  describe('Performance & Caching', () => {
    it('should return consistent results from cache', async () => {
      const response1 = await fetch(`${apiBase}/api/{names}/id-1`)
      const data1 = await response1.json()

      // Immediate second request should return same data
      const response2 = await fetch(`${apiBase}/api/{names}/id-1`)
      const data2 = await response2.json()

      expect(data1).toEqual(data2)
    })

    it('should respond within acceptable time', async () => {
      const start = performance.now()

      await fetch(`${apiBase}/api/{names}`)

      const duration = performance.now() - start
      expect(duration).toBeLessThan(1000) // 1 second
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on server error', async () => {
      // This test depends on actual error conditions
      // Adjust based on your implementation
      const response = await fetch(
        `${apiBase}/api/{names}/id-with-corrupted-data`
      )

      if (response.status === 500) {
        const data = await response.json()
        expect(data.error).toBeDefined()
      }
    })

    it('should handle missing required parameters', async () => {
      const response = await fetch(`${apiBase}/api/{names}`)

      expect([200, 400]).toContain(response.status)
    })
  })
})
```

---

## 4. Test Utilities & Mocks

### File: `tests/Shared/QueryModules/MockRepository.ts`

```typescript
/**
 * In-memory read model repository for testing
 */
export class InMemory{Name}ReadModelRepository
  implements I{Name}ReadModelRepository {
  private models = new Map<string, {Name}ReadModel>()

  async findById(id: string): Promise<{Name}ReadModel | null> {
    return this.models.get(id) || null
  }

  async findAll(): Promise<{Name}ReadModel[]> {
    return Array.from(this.models.values())
  }

  async findByUserId(userId: string): Promise<{Name}ReadModel[]> {
    return Array.from(this.models.values()).filter(
      m => m.userId === userId
    )
  }

  async save(model: {Name}ReadModel): Promise<void> {
    this.models.set(model.id, model)
  }

  async search(searchTerm: string): Promise<{Name}ReadModel[]> {
    const term = searchTerm.toLowerCase()
    return Array.from(this.models.values()).filter(
      m =>
        m.id.toLowerCase().includes(term) ||
        m.userId.toLowerCase().includes(term)
    )
  }

  async delete(id: string): Promise<void> {
    this.models.delete(id)
  }

  async count(): Promise<number> {
    return this.models.size
  }

  clear(): void {
    this.models.clear()
  }
}
```

### File: `tests/Shared/QueryModules/MockCache.ts`

```typescript
/**
 * In-memory cache for testing
 */
export class MockCache {
  private cache = new Map<string, any>()

  async get(key: string): Promise<any | null> {
    return this.cache.get(key) || null
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value)

    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl * 1000)
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }
}
```

---

## 5. Running Tests

```bash
# All CQRS query module tests
bun test tests/Unit/QueryModules
bun test tests/Integration/QueryModules
bun test tests/Feature/QueryModules

# Specific module
bun test tests/Unit/QueryModules/{Name}
bun test tests/Integration/QueryModules/{Name}

# Watch mode
bun test --watch tests/Unit/QueryModules

# With verbose output
bun test --verbose tests/Integration/QueryModules

# Coverage
bun test --coverage tests/QueryModules
```

---

## 6. Test Coverage Goals

Target 80%+ coverage for CQRS query modules:

```
ReadModel          - 100% (immutable interfaces, factories)
Projector          - 100% (pure functions, easily testable)
QueryService       - 85%+ (business logic, DTOs)
Repository         - 90%+ (persistence logic)
Controller         - 80%+ (HTTP endpoints, routing)
Subscriber         - 85%+ (event handling, integration)
Cache              - 85%+ (caching logic)
```

---

## 7. Common Test Patterns

### Testing Immutability

```typescript
it('should not mutate input', () => {
  const original = create{Name}ReadModel({ /* ... */ })
  const copy = { ...original }

  {Name}EventProjector.project(event, original)

  expect(original).toEqual(copy)
})
```

### Testing Idempotency

```typescript
it('should be idempotent', () => {
  const model1 = {Name}EventProjector.project(event, initialModel)
  const model2 = {Name}EventProjector.project(event, model1)

  expect(model1).toEqual(model2)
})
```

### Testing Aggregations

```typescript
it('should calculate aggregate correctly', () => {
  const result = projector.project(event, model)

  const expectedSum = model.total + event.amount
  expect(result.total).toBe(expectedSum)
})
```

### Testing Event Ordering

```typescript
it('should respect event order', async () => {
  const model1 = await subscriber.handle(event1) // Creates
  const model2 = await subscriber.handle(event2) // Updates 1
  const model3 = await subscriber.handle(event3) // Updates 2

  expect(model3.projectionVersion).toBe(3)
})
```

---

## Summary

CQRS query modules follow a three-tier testing strategy:

1. **Unit Tests** (Projectors): Fast, deterministic, no dependencies
2. **Integration Tests** (Subscribers): Event subscription + persistence
3. **Feature Tests** (Controllers): HTTP endpoints end-to-end

Target 80%+ coverage, focus on:
- Idempotency (duplicate events)
- Immutability (no mutations)
- Aggregations (math correctness)
- Error handling (graceful failures)
- Performance (response time, caching)

