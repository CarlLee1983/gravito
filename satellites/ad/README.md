# satellite-ad

Advertisement management satellite for the Gravito framework. Provides CRUD operations for advertisements and weighted random selection for delivery across multiple slots.

## Features

- 🎯 **Multi-Slot Management** - Deploy ads to multiple predefined slots (homepage-banner, sidebar, footer, etc.)
- ⚖️ **Weighted Selection** - Intelligent probability-based ad delivery using weight-based random selection
- 🔄 **State Machine** - Type-safe ad lifecycle management (DRAFT → ACTIVE ↔ PAUSED → ARCHIVED)
- 📅 **Schedule Control** - Time-based activation and expiration with automatic transitions
- 🏗️ **DDD + DCI Architecture** - Domain-driven design with data-context-interaction pattern for complex business logic
- 🧪 **Fully Tested** - 138+ unit tests with 100% pass rate, zero `as any` violations
- 🔌 **Event-Driven** - Publishes events for integration with other satellites (catalog, analytics, etc.)
- ⚡ **Performance Optimized** - Redis caching, database query optimization, minimal memory footprint

## Quick Start

### Installation

```bash
# Add satellite-ad to your Gravito project
bun add @gravito/satellite-ad @gravito/core @gravito/photon

# Verify installation
bun list @gravito/satellite-ad
```

### Basic Setup

```typescript
// gravito.config.ts
import { createGravitoApp } from '@gravito/core'
import { AdServiceProvider } from '@gravito/satellite-ad'
import { setupAdRoutes } from './routes/ads.routes'

const app = createGravitoApp({
  satellites: [
    AdServiceProvider.of(),
    // ... other satellites
  ],
})

// Mount routes
app.use('/api', setupAdRoutes(app.container))

export default app
```

### Create Your First Advertisement

```typescript
import type { PlanetCore } from '@gravito/core'
import { AdCreationContext } from '@gravito/satellite-ad'

const core = app.container.resolve('PlanetCore')
const adRepository = app.container.resolve('IAdRepository')

const context = new AdCreationContext(adRepository, core)

const ad = await context.execute({
  slotSlug: 'homepage-banner',
  title: 'Summer Sale 2026',
  imageUrl: 'https://cdn.example.com/banner.jpg',
  targetUrl: 'https://example.com/sale',
  weight: 75,
  startsAt: new Date('2026-03-01'),
  endsAt: new Date('2026-03-31'),
  activateImmediately: true,
})

console.log('Created ad:', ad.id, ad.status)
```

### Deliver Ads to Users

```typescript
// Get weighted random ad for a slot
const deliveryContext = new AdDeliveryContext(adRepository, core)
const ad = await deliveryContext.selectForSlot('homepage-banner')

if (ad) {
  return {
    id: ad.id,
    title: ad.title,
    imageUrl: ad.imageUrl,
    targetUrl: ad.targetUrl,
  }
}
```

## API Overview

### Admin Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/v1/ads` | Create advertisement |
| GET | `/api/admin/v1/ads` | List advertisements (with filtering) |
| GET | `/api/admin/v1/ads/:id` | Get specific advertisement |
| PUT | `/api/admin/v1/ads/:id` | Update advertisement |
| PATCH | `/api/admin/v1/ads/:id/status` | Change status (activate, pause, resume, archive) |
| DELETE | `/api/admin/v1/ads/:id` | Delete advertisement (DRAFT only) |

### Public Delivery Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/ads/delivery` | Get ads for multiple slots |
| GET | `/api/v1/ads/slots/:slotSlug` | Get single ad for slot |

**Complete API Reference:** See [docs/API.md](./docs/API.md)

## Architecture

### Layered Design (DDD + DCI)

```
┌─────────────────────────────────────────┐
│  Infrastructure (HTTP Controllers)      │
│  AdminAdController, PublicAdController  │
└────────────────┬────────────────────────┘
                 │
┌────────────────┴────────────────────────┐
│  Application (Use Cases)                │
│  CreateAdUseCase, UpdateAdUseCase, etc. │
└────────────────┬────────────────────────┘
                 │
┌────────────────┴─────────────────────────────────┐
│  Domain (DCI Contexts + Roles)                   │
│  AdCreationContext, AdManagementContext, etc.    │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────┴──────────────────────┐
│  Domain (Entities + Value Objects)    │
│  Advertisement, AdWeight, AdSchedule  │
└───────────────────────────────────────┘
```

### State Machine

```
     ┌──────────┐
     │  DRAFT   │
     └────┬─────┘
          │ activate
          ▼
     ┌──────────┐◄──────────┐
     │ ACTIVE   │   resume  │
     └────┬─────┴────┬──────┘
          │ pause    │
          ▼          │
     ┌──────────┐───┘
     │ PAUSED   │
     └──────────┘
          │
          │ archive (from any state)
          ▼
     ┌──────────┐
     └ ARCHIVED ┘
```

## Documentation

- **[API.md](./docs/API.md)** - Complete API reference with examples
- **[openapi.json](./docs/openapi.json)** - OpenAPI 3.0.3 specification
- **[INTEGRATION.md](./docs/INTEGRATION.md)** - Integration patterns and hooks
- **[EXAMPLES.md](./docs/EXAMPLES.md)** - Code examples (cURL, JS, TS, React)
- **[PERFORMANCE.md](./docs/PERFORMANCE.md)** - Optimization and benchmarks
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Valid Slots

Pre-configured advertisement slots available in the system:

- `homepage-banner` - Main homepage banner area
- `sidebar` - Right sidebar widget area
- `footer` - Footer promotion area
- `product-page` - Product detail page banner
- `checkout` - Checkout page promotion
- `search-results` - Search results sidebar

## Key Concepts

### Weighted Random Selection

Ads are selected using probability-weighted randomization:

```typescript
// Weight distribution example
const ads = [
  { title: 'Premium Promotion', weight: 100 }, // 50% chance
  { title: 'Standard Ad', weight: 50 },         // 25% chance
  { title: 'Secondary Ad', weight: 30 },        // 15% chance
  { title: 'Backup Ad', weight: 20 },           // 10% chance
]

// Selection algorithm: O(n) time complexity
// Guaranteed fair distribution over many requests
```

### Ad Lifecycle

1. **DRAFT** - Initial state, not visible to users
2. **ACTIVE** - Visible to users during scheduled period (startsAt ≤ now < endsAt)
3. **PAUSED** - Temporarily hidden, can be resumed
4. **ARCHIVED** - Permanently removed from circulation

### Schedule Management

Ads are automatically considered "active" only during their scheduled window:

```typescript
// Ad is only deliverable if:
// 1. Status is ACTIVE
// 2. Current time >= startsAt
// 3. Current time < endsAt

const isDeliverable = ad.isDeliverable(new Date())
```

## Event System

Subscribe to ad lifecycle events:

- `ad:created` - New advertisement created
- `ad:updated` - Advertisement details updated
- `ad:status_changed` - Status transition occurred
- `ad:deleted` - Advertisement deleted
- `ad:delivered` - Advertisement shown to user

**Example:**

```typescript
subscribe('ad:created', (event: AdCreatedEvent) => {
  console.log(`New ad: ${event.title} for ${event.slotSlug}`)
})
```

See [INTEGRATION.md](./docs/INTEGRATION.md#event-communication) for details.

## Performance

Key metrics (1000 concurrent users, 50 ads per slot):

| Operation | Avg | P95 | P99 |
|-----------|-----|-----|-----|
| GET /ads/slots/:id (cached) | 2.3ms | 15ms | 45ms |
| GET /ads/slots/:id (uncached) | 3.1ms | 20ms | 60ms |
| POST /ads (create) | 45ms | 120ms | 250ms |
| PUT /ads/:id (update) | 52ms | 130ms | 280ms |
| GET /ads (list) | 12ms | 40ms | 120ms |

See [PERFORMANCE.md](./docs/PERFORMANCE.md) for optimization tips.

## Environment Variables

```bash
# Database
AD_DATABASE_URL=postgresql://user:pass@localhost:5432/gravito

# Cache (optional)
AD_REDIS_URL=redis://localhost:6379

# Configuration
AD_CACHE_TTL=3600              # Cache TTL in seconds
AD_MAX_ADS_PER_SLOT=20         # Maximum ads allowed per slot
AD_ENABLE_AUTO_SCHEDULING=true # Auto-activate/archive ads

# Analytics
AD_TRACK_DELIVERIES=true
AD_TRACK_CLICKS=true
```

## Testing

Run tests for satellite-ad:

```bash
# Run all tests
bun test satellites/ad

# Run with coverage
bun test --coverage satellites/ad

# Run specific test file
bun test satellites/ad/tests/Domain/Entities/Advertisement.test.ts

# Watch mode
bun test --watch satellites/ad
```

**Test Coverage:** 138+ unit tests covering:
- Domain entities and value objects
- DCI roles and contexts
- Use cases
- HTTP controllers
- Event subscribers
- Error handling
- Edge cases

## Troubleshooting

**Common Issues:**

- **Ads not showing?** Check that status is ACTIVE and current time is within schedule window
- **Slow queries?** See [PERFORMANCE.md#query-optimization](./docs/PERFORMANCE.md#query-optimization)
- **Cache issues?** See [TROUBLESHOOTING.md#cache-issues](./docs/TROUBLESHOOTING.md#cache-issues)
- **API errors?** See [TROUBLESHOOTING.md#api-errors](./docs/TROUBLESHOOTING.md#api-errors)

For detailed troubleshooting, see [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Contributing

Contributions are welcome! Please:

1. Write tests for new features (TDD approach)
2. Follow existing code style and patterns
3. Update documentation
4. Ensure TypeScript strict mode compliance
5. Zero `as any` violations

## License

MIT - See LICENSE file for details

## Related Satellites

- **@gravito/satellite-catalog** - Product management
- **@gravito/satellite-analytics** - Metrics and reporting
- **@gravito/satellite-commerce** - Order management
- **@gravito/satellite-membership** - User authentication

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issues](https://github.com/gravito-core/issues)
- 💬 [Discussions](https://github.com/gravito-core/discussions)
