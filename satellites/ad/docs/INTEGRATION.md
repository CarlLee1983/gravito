# Integration Guide

Comprehensive guide for integrating satellite-ad into your Gravito application. Covers SDK usage, event communication, hooks setup, and advanced patterns.

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Core Integration Patterns](#core-integration-patterns)
3. [Event Communication](#event-communication)
4. [Hook System](#hook-system)
5. [Dependency Injection](#dependency-injection)
6. [Advanced Patterns](#advanced-patterns)
7. [Testing Integration](#testing-integration)

## Installation & Setup

### Package Installation

```bash
# Using bun
bun add @gravito/satellite-ad @gravito/core

# Verify installation
bun list @gravito/satellite-ad
```

### Basic Configuration

```typescript
// gravito.config.ts
import { defineSatellite } from '@gravito/core'
import { AdServiceProvider } from '@gravito/satellite-ad'

export default {
  satellites: [
    AdServiceProvider.of(),
    // ... other satellites
  ],
  hooks: {
    // Ad-related hooks (see Hook System section)
  },
}
```

### IoC Container Registration

```typescript
// src/bootstrap.ts
import { createContainer } from '@gravito/core'
import { AdServiceProvider } from '@gravito/satellite-ad'

const container = createContainer()
const adProvider = AdServiceProvider.of()

// Register ad services
adProvider.register(container)

export { container }
```

## Core Integration Patterns

### Pattern 1: Dependency Injection (Recommended)

Inject ad services into your application via the IoC container:

```typescript
// src/services/PromotionService.ts
import type { IAdRepository } from '@gravito/satellite-ad'
import { createPromotionWithAds } from './promotions'

export class PromotionService {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly core: PlanetCore
  ) {}

  async createWithAd(promotionData: CreatePromotionInput): Promise<void> {
    // Create promotion
    const promotion = await this.createPromotion(promotionData)

    // Create associated advertisement
    const adContext = new AdCreationContext(this.adRepository, this.core)
    const ad = await adContext.execute({
      slotSlug: 'promotion-banner',
      title: promotion.name,
      imageUrl: promotion.imageUrl,
      targetUrl: promotion.url,
      weight: 75,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      activateImmediately: true,
    })

    // Link ad to promotion
    await this.linkAdToPromotion(promotion.id, ad.id)
  }

  private async createPromotion(data: CreatePromotionInput) {
    // Promotion creation logic
  }

  private async linkAdToPromotion(promotionId: string, adId: string) {
    // Link logic
  }
}
```

### Pattern 2: HTTP Controller Integration

Expose ad operations through HTTP endpoints:

```typescript
// src/routes/ads.routes.ts
import { createHonoApp } from '@gravito/photon'
import { AdminAdController } from '@gravito/satellite-ad'
import type { PlanetCore } from '@gravito/core'

export function setupAdRoutes(core: PlanetCore) {
  const app = createHonoApp()
  const controller = core.resolve(AdminAdController)

  // Admin endpoints
  app.post('/api/admin/v1/ads', (ctx) => controller.create(ctx))
  app.get('/api/admin/v1/ads', (ctx) => controller.list(ctx))
  app.get('/api/admin/v1/ads/:id', (ctx) => controller.show(ctx))
  app.put('/api/admin/v1/ads/:id', (ctx) => controller.update(ctx))
  app.patch('/api/admin/v1/ads/:id/status', (ctx) => controller.toggleStatus(ctx))
  app.delete('/api/admin/v1/ads/:id', (ctx) => controller.destroy(ctx))

  // Public endpoints
  app.post('/api/v1/ads/delivery', (ctx) => controller.delivery(ctx))
  app.get('/api/v1/ads/slots/:slotSlug', (ctx) => controller.getSlot(ctx))

  return app
}
```

### Pattern 3: Direct Repository Access

For advanced use cases, access the repository directly:

```typescript
// src/services/AnalyticsService.ts
import type { IAdRepository } from '@gravito/satellite-ad'
import { MetricName } from '@gravito/satellite-analytics'

export class AnalyticsService {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly analyticsContext: MetricQueryContext
  ) {}

  async getAdPerformanceMetrics(slotSlug: string, period: 'week' | 'month') {
    // Get ads for slot
    const ads = await this.adRepository.findBySlot(slotSlug)

    // Query delivery metrics
    const report = await this.analyticsContext.queryMetric({
      metricName: 'ad_deliveries',
      period: period === 'week' ? 'LAST_7_DAYS' : 'LAST_30_DAYS',
      dimensions: [
        { key: 'slot_slug', value: slotSlug },
        { key: 'status', value: 'ACTIVE' },
      ],
      aggregation: 'COUNT',
      chartType: 'TIMESERIES',
    })

    return {
      ads,
      metrics: report,
    }
  }
}
```

## Event Communication

### Publishing Ad Events

Satellite-ad publishes events to the event bus for other satellites to consume:

```typescript
// Available ad events
enum AdEvents {
  CREATED = 'ad:created',
  UPDATED = 'ad:updated',
  STATUS_CHANGED = 'ad:status_changed',
  DELETED = 'ad:deleted',
  DELIVERED = 'ad:delivered',
}

// Event payload types
interface AdCreatedEvent {
  id: string
  slotSlug: string
  title: string
  status: AdStatus
  createdAt: Date
}

interface AdStatusChangedEvent {
  id: string
  oldStatus: AdStatus
  newStatus: AdStatus
  changedAt: Date
}

interface AdDeliveredEvent {
  id: string
  slotSlug: string
  deliveredAt: Date
}
```

### Subscribing to Ad Events

```typescript
// src/subscribers/PromoNotificationSubscriber.ts
import { subscribe } from '@gravito/signal'
import type { AdCreatedEvent } from '@gravito/satellite-ad'

@subscribe('ad:created')
export class PromoNotificationSubscriber {
  constructor(
    private readonly emailService: EmailService,
    private readonly slackService: SlackService
  ) {}

  async handle(event: AdCreatedEvent): Promise<void> {
    // Send email notification
    await this.emailService.send({
      to: 'marketing@example.com',
      subject: `New Advertisement: ${event.title}`,
      template: 'new-ad-created',
      data: {
        adId: event.id,
        title: event.title,
        slotSlug: event.slotSlug,
      },
    })

    // Post to Slack
    await this.slackService.postToChannel('#marketing', {
      text: `📺 New ad created: *${event.title}* for slot \`${event.slotSlug}\``,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${event.title}*\nSlot: \`${event.slotSlug}\`\nStatus: ${event.status}`,
          },
        },
      ],
    })
  }
}
```

### Cross-Satellite Event Handling

Handle events from other satellites affecting ads:

```typescript
// src/subscribers/InventoryAdSyncSubscriber.ts
// When catalog inventory changes, update ad status
import { subscribe } from '@gravito/signal'
import type { InventoryDepletedEvent } from '@gravito/satellite-catalog'
import { AdManagementContext } from '@gravito/satellite-ad'

@subscribe('inventory:depleted')
export class InventoryAdSyncSubscriber {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly core: PlanetCore
  ) {}

  async handle(event: InventoryDepletedEvent): Promise<void> {
    // Find ads promoting this product
    const relatedAds = await this.adRepository.findByMetadata({
      product_id: event.productId,
    })

    // Pause ads for out-of-stock products
    const context = new AdManagementContext(this.adRepository, this.core)
    for (const ad of relatedAds) {
      if (ad.status === 'ACTIVE') {
        await context.pause(ad)
      }
    }
  }
}
```

## Hook System

### Lifecycle Hooks

Register hooks to execute code at specific ad lifecycle moments:

```typescript
// gravito.config.ts
import { createGravitoApp } from '@gravito/core'

const app = createGravitoApp({
  hooks: {
    // Before ad creation
    'ad:before_create': async (input, context) => {
      // Validate against business rules
      if (input.weight < 1) {
        throw new Error('Weight must be at least 1')
      }

      // Enrich input
      return {
        ...input,
        metadata: {
          ...input.metadata,
          created_by_hook: true,
        },
      }
    },

    // After ad creation
    'ad:after_create': async (ad, context) => {
      console.log(`Ad created: ${ad.id}`)
      // Send analytics event
      // Trigger notifications
      // Update cache
    },

    // Before ad update
    'ad:before_update': async (ad, changes, context) => {
      // Prevent updating certain fields based on status
      if (ad.status === 'PAUSED' && changes.title) {
        throw new Error('Cannot update paused ad title')
      }
      return changes
    },

    // After ad deletion
    'ad:after_delete': async (adId, context) => {
      // Clean up related records
      // Update analytics
      // Notify dashboards
    },
  },
})
```

### Validation Hooks

```typescript
// gravito.config.ts
const app = createGravitoApp({
  hooks: {
    'ad:validate': async (input, context) => {
      const errors: Record<string, string> = {}

      // Check slot exists
      if (!VALID_SLOTS.includes(input.slotSlug)) {
        errors.slotSlug = `Invalid slot: ${input.slotSlug}`
      }

      // Check dates
      if (new Date(input.startsAt) >= new Date(input.endsAt)) {
        errors.schedule = 'Start date must be before end date'
      }

      // Check business hours
      const start = new Date(input.startsAt)
      if (start.getHours() < 9 || start.getHours() > 17) {
        errors.schedule = 'Ads must start during business hours (9-17)'
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Ad validation failed', errors)
      }

      return input
    },
  },
})
```

## Dependency Injection

### Container Configuration

```typescript
// src/container.ts
import { createContainer, type Container } from '@gravito/core'
import { AdServiceProvider } from '@gravito/satellite-ad'

export function configureContainer(): Container {
  const container = createContainer()

  // Register ad services
  const adProvider = AdServiceProvider.of()
  adProvider.register(container)

  // Register custom ad services
  container.singleton('AdAnalyticsService', () => {
    return new AdAnalyticsService(
      container.resolve('IAdRepository'),
      container.resolve('MetricQueryContext')
    )
  })

  // Register use cases
  container.singleton('CreateFeaturedAdUseCase', () => {
    return new CreateFeaturedAdUseCase(
      container.resolve('CreateAdUseCase'),
      container.resolve('AdAnalyticsService')
    )
  })

  return container
}
```

### Resolving Services

```typescript
// src/services/MyService.ts
import type { Container } from '@gravito/core'
import type { IAdRepository } from '@gravito/satellite-ad'

export class MyService {
  private readonly adRepository: IAdRepository
  private readonly adContext: AdCreationContext

  constructor(container: Container) {
    this.adRepository = container.resolve('IAdRepository')
    this.adContext = new AdCreationContext(
      this.adRepository,
      container.resolve('PlanetCore')
    )
  }

  async performAdOperation() {
    // Use resolved services
  }
}
```

## Advanced Patterns

### Pattern: Batch Ad Operations

```typescript
// src/services/BatchAdService.ts
import { AdManagementContext } from '@gravito/satellite-ad'

export class BatchAdService {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly core: PlanetCore
  ) {}

  async batchActivate(adIds: string[]): Promise<ActivationResult[]> {
    const context = new AdManagementContext(this.adRepository, this.core)
    const results: ActivationResult[] = []

    for (const adId of adIds) {
      try {
        const ad = await this.adRepository.findById(adId)
        if (!ad) {
          results.push({ adId, success: false, error: 'Not found' })
          continue
        }

        const updated = await context.activate(ad)
        results.push({ adId, success: true, ad: updated })
      } catch (error) {
        results.push({
          adId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  async batchPause(adIds: string[]): Promise<PauseResult[]> {
    // Similar to batchActivate
  }

  async batchDelete(adIds: string[]): Promise<DeleteResult[]> {
    // Similar to batchActivate
  }
}
```

### Pattern: Ad Scheduling with Cron

```typescript
// src/jobs/AdSchedulerJob.ts
import { CronJob } from 'cron'
import { AdDeliveryContext } from '@gravito/satellite-ad'

export class AdSchedulerJob {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly core: PlanetCore
  ) {}

  start(): CronJob {
    // Run every hour to check for status transitions
    const job = new CronJob('0 * * * *', async () => {
      await this.checkScheduledTransitions()
    })

    job.start()
    return job
  }

  private async checkScheduledTransitions(): Promise<void> {
    const now = new Date()
    const context = new AdManagementContext(this.adRepository, this.core)

    // Find ads ready to activate
    const draftAds = await this.adRepository.findByStatus('DRAFT')
    for (const ad of draftAds) {
      if (ad.startsAt <= now) {
        await context.activate(ad)
      }
    }

    // Find ads to archive
    const activeAds = await this.adRepository.findByStatus('ACTIVE')
    for (const ad of activeAds) {
      if (ad.endsAt <= now) {
        await context.archive(ad)
      }
    }
  }
}
```

### Pattern: Ad Caching Layer

```typescript
// src/services/CachedAdService.ts
import type { IAdRepository } from '@gravito/satellite-ad'
import { Redis } from 'ioredis'

export class CachedAdService {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly redis: Redis
  ) {}

  async getAdsBySlot(slotSlug: string): Promise<Advertisement[]> {
    const cacheKey = `ads:slot:${slotSlug}`
    const cached = await this.redis.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    const ads = await this.adRepository.findBySlot(slotSlug)
    await this.redis.setex(cacheKey, 3600, JSON.stringify(ads)) // 1 hour TTL

    return ads
  }

  async invalidateSlotCache(slotSlug: string): Promise<void> {
    const cacheKey = `ads:slot:${slotSlug}`
    await this.redis.del(cacheKey)
  }

  async invalidateAllCache(): Promise<void> {
    const pattern = 'ads:slot:*'
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}

// Register cache invalidation on ad updates
subscribe('ad:updated', async (event: AdUpdatedEvent) => {
  await cachedAdService.invalidateSlotCache(event.slotSlug)
})
```

### Pattern: Ad Analytics Tracking

```typescript
// src/services/AdTrackingService.ts
import { PlanetCore } from '@gravito/core'

export class AdTrackingService {
  constructor(
    private readonly core: PlanetCore,
    private readonly analyticsContext: MetricQueryContext
  ) {}

  async trackDelivery(adId: string, slotSlug: string): Promise<void> {
    // Publish event through event bus
    await this.core.emit('ad:delivered', {
      id: adId,
      slotSlug,
      deliveredAt: new Date(),
    })

    // Record metric
    await this.analyticsContext.ingestDataPoint({
      metricName: 'ad_deliveries',
      timestamp: new Date(),
      value: 1,
      dimensions: [
        { key: 'ad_id', value: adId },
        { key: 'slot_slug', value: slotSlug },
      ],
    })
  }

  async trackClick(adId: string): Promise<void> {
    await this.core.emit('ad:clicked', {
      id: adId,
      clickedAt: new Date(),
    })

    await this.analyticsContext.ingestDataPoint({
      metricName: 'ad_clicks',
      timestamp: new Date(),
      value: 1,
      dimensions: [{ key: 'ad_id', value: adId }],
    })
  }
}
```

## Testing Integration

### Unit Testing with Ad Services

```typescript
// tests/services/MyService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAdRepository } from '@gravito/satellite-ad'
import { MyService } from '@/services/MyService'

describe('MyService', () => {
  let service: MyService
  let adRepository: InMemoryAdRepository

  beforeEach(() => {
    adRepository = new InMemoryAdRepository()
    service = new MyService(adRepository)
  })

  it('should create ad and update related records', async () => {
    // Create test ad
    const ad = Advertisement.create(
      'ad-1',
      SlotSlug.of('homepage-banner'),
      {
        title: 'Test Ad',
        imageUrl: 'https://example.com/image.jpg',
        targetUrl: 'https://example.com',
        weight: 50,
        schedule: AdSchedule.ofRange(
          new Date('2026-03-01'),
          new Date('2026-03-31')
        ),
      }
    )

    await adRepository.save(ad)

    // Perform service operation
    await service.performAdOperation()

    // Verify state
    const saved = await adRepository.findById('ad-1')
    expect(saved).toBeDefined()
  })
})
```

### Integration Testing with Hooks

```typescript
// tests/integration/AdHooksIntegration.test.ts
import { describe, it, expect } from 'vitest'
import { createGravitoApp } from '@gravito/core'
import { AdServiceProvider } from '@gravito/satellite-ad'

describe('Ad Hooks Integration', () => {
  it('should execute validation hook before create', async () => {
    const hookCalled: string[] = []

    const app = createGravitoApp({
      satellites: [AdServiceProvider.of()],
      hooks: {
        'ad:validate': async (input) => {
          hookCalled.push('validate')
          return input
        },
        'ad:after_create': async (ad) => {
          hookCalled.push('after_create')
        },
      },
    })

    const createUseCase = app.container.resolve('CreateAdUseCase')
    await createUseCase.execute({
      slotSlug: 'homepage-banner',
      title: 'Test',
      imageUrl: 'https://example.com/image.jpg',
      targetUrl: 'https://example.com',
      weight: 50,
      startsAt: new Date('2026-03-01').toISOString(),
      endsAt: new Date('2026-03-31').toISOString(),
    })

    expect(hookCalled).toContain('validate')
    expect(hookCalled).toContain('after_create')
  })
})
```

### E2E Testing with HTTP Routes

```typescript
// tests/e2e/AdRoutes.test.ts
import { describe, it, expect } from 'vitest'
import { request } from 'supertest'
import { createApp } from '@/app'

describe('Ad API Routes (E2E)', () => {
  it('should create and retrieve advertisement', async () => {
    const app = createApp()

    // Create ad
    const createRes = await request(app).post('/api/admin/v1/ads').send({
      slotSlug: 'homepage-banner',
      title: 'E2E Test Ad',
      imageUrl: 'https://example.com/image.jpg',
      targetUrl: 'https://example.com',
      weight: 50,
      startsAt: '2026-03-01T00:00:00Z',
      endsAt: '2026-03-31T23:59:59Z',
    })

    expect(createRes.status).toBe(201)
    expect(createRes.body.success).toBe(true)
    expect(createRes.body.data.id).toBeDefined()

    const adId = createRes.body.data.id

    // Retrieve ad
    const getRes = await request(app).get(`/api/admin/v1/ads/${adId}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body.data.title).toBe('E2E Test Ad')
  })
})
```

## Configuration Reference

### Environment Variables

```bash
# Database
AD_DATABASE_URL=postgresql://user:pass@localhost:5432/gravito

# Cache
AD_REDIS_URL=redis://localhost:6379

# Event Bus
AD_EVENT_BUS=redis # or memory, kafka

# Feature Flags
AD_ENABLE_AUTO_SCHEDULING=true
AD_MAX_ADS_PER_SLOT=20
AD_CACHE_TTL=3600

# Analytics
AD_TRACK_DELIVERIES=true
AD_TRACK_CLICKS=true
```

### Container Bindings

```typescript
// Available bindings in container
container.resolve('IAdRepository')           // Repository interface
container.resolve('AdminAdController')       // Admin controller
container.resolve('PublicAdController')      // Public controller
container.resolve('CreateAdUseCase')         // Create use case
container.resolve('UpdateAdUseCase')         // Update use case
container.resolve('DeleteAdUseCase')         // Delete use case
container.resolve('ToggleAdStatusUseCase')   // Toggle status use case
container.resolve('ListAdsUseCase')          // List use case
container.resolve('AdCreationContext')       // DCI context
container.resolve('AdManagementContext')     // DCI context
container.resolve('AdDeliveryContext')       // DCI context
```

---

For more information, see [API.md](./API.md) for endpoint details and [EXAMPLES.md](./EXAMPLES.md) for code examples.
