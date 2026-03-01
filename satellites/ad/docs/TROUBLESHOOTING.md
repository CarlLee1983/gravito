# Troubleshooting Guide

Common issues and their solutions when working with satellite-ad.

## Table of Contents

1. [API Errors](#api-errors)
2. [Database Issues](#database-issues)
3. [Cache Issues](#cache-issues)
4. [Type & Validation Errors](#type--validation-errors)
5. [Event Bus Issues](#event-bus-issues)
6. [Container Resolution Issues](#container-resolution-issues)
7. [Performance Issues](#performance-issues)
8. [Debugging Techniques](#debugging-techniques)

## API Errors

### 400: VALIDATION_ERROR

**Error Message:** `slotSlug: Invalid slot identifier`

**Causes:**
- Invalid slot slug format
- Slot doesn't exist in predefined list
- Special characters in slot name

**Solution:**

```typescript
// 1. Check valid slot list
const VALID_SLOTS = [
  'homepage-banner',
  'sidebar',
  'footer',
  'product-page',
]

// 2. Validate before API call
const validateSlotSlug = (slug: string): boolean => {
  return VALID_SLOTS.includes(slug) && /^[a-z0-9-]+$/.test(slug)
}

// 3. Use TypeScript enum
enum AdSlot {
  HOMEPAGE_BANNER = 'homepage-banner',
  SIDEBAR = 'sidebar',
  FOOTER = 'footer',
  PRODUCT_PAGE = 'product-page',
}

const response = await client.createAd({
  slotSlug: AdSlot.HOMEPAGE_BANNER,
  // ... other fields
})
```

### 400: VALIDATION_ERROR - Invalid Date Range

**Error Message:** `startsAt: Start date must be before end date`

**Causes:**
- `startsAt >= endsAt`
- Dates in the past
- Dates not in ISO 8601 format

**Solution:**

```typescript
// 1. Validate dates
function validateDateRange(startsAt: Date, endsAt: Date): void {
  if (startsAt >= endsAt) {
    throw new Error('Start date must be before end date')
  }

  const now = new Date()
  if (endsAt <= now) {
    throw new Error('End date must be in the future')
  }
}

// 2. Use date library for safe parsing
import { parseISO, isValid, isBefore } from 'date-fns'

const startsAt = parseISO('2026-03-01T00:00:00Z')
const endsAt = parseISO('2026-03-31T23:59:59Z')

if (!isValid(startsAt) || !isValid(endsAt)) {
  throw new Error('Invalid date format')
}

if (!isBefore(startsAt, endsAt)) {
  throw new Error('Start must be before end')
}
```

### 404: AD_NOT_FOUND

**Error Message:** `Advertisement not found: ad-123`

**Causes:**
- Ad ID doesn't exist
- Ad was deleted
- Ad ID is incorrect (typo)
- Wrong database/environment

**Solution:**

```typescript
// 1. Verify ad exists before operations
async function updateAdSafely(adId: string, changes: AdUpdateInput) {
  const ad = await client.getAd(adId)
  if (!ad) {
    throw new Error(`Ad not found: ${adId}`)
  }

  return client.updateAd(adId, changes)
}

// 2. Handle not found gracefully
try {
  const ad = await client.getAd(adId)
} catch (error) {
  if (error.message.includes('AD_NOT_FOUND')) {
    // Show user-friendly message
    console.log('Advertisement no longer exists')
  } else {
    throw error
  }
}

// 3. Check in database directly
// PostgreSQL
SELECT * FROM advertisements WHERE id = 'ad-123'
```

### 400: INVALID_STATUS_TRANSITION

**Error Message:** `Cannot transition from PAUSED to PAUSED`

**Causes:**
- Attempting invalid state transition
- Current status different than expected
- Concurrent updates causing race condition

**Valid Transitions:**
- DRAFT → ACTIVE
- ACTIVE ↔ PAUSED
- (any) → ARCHIVED

**Solution:**

```typescript
// 1. Check current status before transition
async function safeToggleStatus(
  adId: string,
  action: string
): Promise<void> {
  const ad = await client.getAd(adId)

  // Validate transition
  if (ad.status === 'PAUSED' && action === 'pause') {
    throw new Error('Ad is already paused')
  }

  if (ad.status === 'DRAFT' && action === 'pause') {
    throw new Error('Cannot pause draft ad')
  }

  await client.toggleAdStatus(adId, action)
}

// 2. Use state machine pattern
const validTransitions = {
  'DRAFT': ['activate', 'archive'],
  'ACTIVE': ['pause', 'archive'],
  'PAUSED': ['resume', 'archive'],
  'ARCHIVED': [],
}

function canTransition(currentStatus: string, action: string): boolean {
  return validTransitions[currentStatus]?.includes(action) ?? false
}
```

### 500: INTERNAL_ERROR

**Error Message:** `An unexpected error occurred`

**Causes:**
- Database connection error
- Server crashed
- Unexpected exception in code

**Solution:**

```typescript
// 1. Check server logs
docker logs gravito-ad-service

// 2. Verify database connection
// In your database client config
const db = createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Add retry logic
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
  retryDelayBase: 100,
  retryDelayMax: 3000,
})

// 3. Add error tracking
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

try {
  // API operation
} catch (error) {
  Sentry.captureException(error)
  throw error
}
```

## Database Issues

### Connection Pool Exhausted

**Error:** `Error: client.query is not a function` or `Pool exhausted`

**Causes:**
- Too many concurrent queries
- Connections not being returned to pool
- Connection leak in code

**Solution:**

```typescript
// 1. Verify connection pool size
const pool = new Pool({
  max: 20, // Maximum connections
  min: 5,  // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// 2. Ensure connections are released
async function withConnection<T>(
  fn: (client) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    return await fn(client)
  } finally {
    client.release() // Always release
  }
}

// 3. Monitor pool status
setInterval(() => {
  console.log('Pool status:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  })
}, 60000)
```

### Deadlock on Update

**Error:** `Deadlock detected` during concurrent updates

**Causes:**
- Multiple processes updating same record
- Long transactions holding locks
- Incorrect transaction isolation level

**Solution:**

```typescript
// 1. Use optimistic locking with version number
interface Advertisement {
  id: string
  version: number
  // ... other fields
}

async function updateAdWithVersionCheck(
  adId: string,
  changes: AdUpdateInput,
  expectedVersion: number
): Promise<Advertisement> {
  // Update only if version matches
  const updated = await db
    .table('advertisements')
    .where('id', adId)
    .where('version', expectedVersion)
    .increment('version', 1)
    .update(changes)

  if (!updated) {
    throw new Error('Concurrent update detected, please retry')
  }

  return getAd(adId)
}

// 2. Use shorter transactions
async function quickUpdate(adId: string, changes: any) {
  // Fetch in separate transaction
  const ad = await getAd(adId)

  // Quick update in separate transaction
  await updateAd(adId, changes)
}

// 3. Set appropriate isolation level
// READ COMMITTED is usually sufficient for ads
SET TRANSACTION ISOLATION LEVEL READ COMMITTED
```

### Index Not Being Used

**Error:** Queries taking 10+ seconds

**Causes:**
- Missing indexes
- Outdated statistics
- Wrong query plan

**Solution:**

```bash
# 1. Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM advertisements
WHERE slot_slug = 'homepage-banner'
AND status = 'active'

# Should show "Index Scan" not "Seq Scan"

# 2. Update statistics
ANALYZE advertisements

# 3. Create missing indexes
CREATE INDEX idx_advertisements_delivery ON advertisements(
  slot_slug,
  status,
  starts_at,
  ends_at
)

# 4. Verify index is used
EXPLAIN ANALYZE SELECT * FROM advertisements
WHERE slot_slug = 'homepage-banner'
AND status = 'active'
AND starts_at <= NOW()
AND ends_at > NOW()
```

## Cache Issues

### Stale Data After Update

**Problem:** Updated ad shows old data for 1 hour

**Causes:**
- Cache TTL too long
- Cache not invalidated on update
- Multiple cache layers out of sync

**Solution:**

```typescript
// 1. Reduce cache TTL for frequently updated data
const CACHE_TTL = 300 // 5 minutes instead of 1 hour

// 2. Invalidate cache on every update
@subscribe('ad:updated')
@subscribe('ad:status_changed')
export class CacheInvalidator {
  constructor(private readonly cache: CacheService) {}

  async handle(event: AdEvent) {
    await this.cache.invalidate(`ad:${event.id}`)
    await this.cache.invalidate(`slot:${event.slotSlug}`)
  }
}

// 3. Use cache versioning
const cacheKey = `ad:${adId}:v${adVersion}`
// When ad updates, version increments automatically

// 4. Implement cache warming
async function warmCache(slotSlug: string) {
  const ads = await adRepository.findBySlot(slotSlug)
  const selected = selectWeightedRandom(ads)

  if (selected) {
    await redis.setex(
      `slot:${slotSlug}`,
      3600,
      JSON.stringify(selected)
    )
  }
}
```

### Redis Connection Timeout

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Causes:**
- Redis not running
- Wrong host/port
- Network connectivity issue
- Redis authentication failed

**Solution:**

```bash
# 1. Check if Redis is running
redis-cli ping
# Should return PONG

# 2. Verify connection settings
echo "redis://${REDIS_HOST}:${REDIS_PORT}" | xargs redis-cli -u

# 3. Check network connectivity
telnet localhost 6379

# 4. Monitor Redis logs
tail -f /var/log/redis/redis-server.log

# 5. Restart Redis
sudo systemctl restart redis-server
```

```typescript
// 6. Add connection retry logic
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
})

redis.on('error', (error) => {
  console.error('Redis connection error:', error)
  // Fallback to database queries without cache
})

redis.on('connect', () => {
  console.log('Redis connected')
})
```

## Type & Validation Errors

### TypeScript Type Mismatch

**Error:** `Type 'string' is not assignable to type 'AdStatus'`

**Causes:**
- Using string instead of enum
- Zod validation output type mismatch
- Missing type casting

**Solution:**

```typescript
// ❌ Wrong
const status = 'ACTIVE'
const response = await client.listAds({ status })

// ✅ Correct - use enum
enum AdStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

const response = await client.listAds({ status: AdStatus.ACTIVE })

// ✅ Or use type guard
const isValidStatus = (value: string): value is AdStatus => {
  return Object.values(AdStatus).includes(value as AdStatus)
}

if (isValidStatus(statusString)) {
  const response = await client.listAds({ status: statusString })
}

// ✅ With Zod
const listAdsInputSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
})

const validated = listAdsInputSchema.parse(input)
// validated.status is now properly typed
```

### Zod Validation Error

**Error:** `zodError.issues[0]: "Expected string, received number"`

**Causes:**
- Wrong data type from API
- Type coercion needed
- Schema mismatch with API response

**Solution:**

```typescript
// 1. Use proper Zod schema
const AdWeightSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .describe('Weight must be integer between 1-100')

const AdDTOSchema = z.object({
  weight: AdWeightSchema,
})

// 2. Add coercion for common cases
const CreateAdSchema = z.object({
  weight: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(AdWeightSchema),
})

// 3. Handle validation errors
try {
  const result = AdDTOSchema.parse(data)
} catch (error) {
  if (error instanceof z.ZodError) {
    const formatted = error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    console.error('Validation failed:', formatted)
  }
}

// 4. Add default values
const ListAdsInputSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  status: z.enum([...]).optional(),
})
```

## Event Bus Issues

### Event Not Firing

**Problem:** Subscriber never receives event

**Causes:**
- Subscriber not registered
- Event name misspelled
- Subscriber disposed before event fires

**Solution:**

```typescript
// 1. Verify subscriber registration
// Check that subscriber is instantiated by container
const container = createContainer()
const subscriber = container.resolve('AdEventSubscriber')
console.log('Subscriber registered:', subscriber)

// 2. Verify event name matches
// Should be exact string match
subscribe('ad:created', handler) // ✓
subscribe('ad_created', handler)  // ✗ Wrong separator

// 3. Check subscriber setup
@subscribe('ad:created')
export class Subscriber {
  async handle(event: AdCreatedEvent) {
    console.log('Event received:', event)
  }
}

// 4. Add debug logging
subscribe('ad:created', (event) => {
  console.log('DEBUG: ad:created event:', event)
})
```

### Memory Leak with Event Subscriptions

**Problem:** Memory usage grows over time

**Causes:**
- Subscriptions not unsubscribed
- Circular references in event data
- Event queue growing unbounded

**Solution:**

```typescript
// 1. Always unsubscribe on cleanup
export class AdSubscriber {
  private unsubscribeFns: Array<() => void> = []

  onModuleInit() {
    const unsub1 = subscribe('ad:created', this.handleCreated)
    const unsub2 = subscribe('ad:updated', this.handleUpdated)
    this.unsubscribeFns = [unsub1, unsub2]
  }

  onModuleDestroy() {
    // Clean up all subscriptions
    this.unsubscribeFns.forEach(unsub => unsub())
  }
}

// 2. Avoid storing entire objects in event data
// ❌ Bad: Full ad object in event
emit('ad:created', { ad: fullAdObject })

// ✅ Good: Only ID and relevant data
emit('ad:created', {
  id: ad.id,
  slotSlug: ad.slotSlug,
  title: ad.title,
})

// 3. Monitor event queue size
import { performance } from 'perf_hooks'

const eventQueue = []
subscribe('*', (event) => {
  eventQueue.push({ event, timestamp: Date.now() })

  // Keep only recent events
  if (eventQueue.length > 10000) {
    eventQueue.shift()
  }
})
```

## Container Resolution Issues

### Service Not Found in Container

**Error:** `Error: Cannot resolve 'IAdRepository'`

**Causes:**
- Service not registered in container
- Service key misspelled
- Service registered with different key

**Solution:**

```typescript
// 1. Register all services in provider
export class AdServiceProvider {
  static of() {
    return {
      register: (container: Container) => {
        // Register repository
        container.singleton(
          'IAdRepository',
          () => new AtlasAdRepository(...)
        )

        // Register use cases
        container.singleton(
          'CreateAdUseCase',
          () => new CreateAdUseCase(
            container.resolve('PlanetCore'),
            container.resolve('IAdRepository')
          )
        )

        // Register contexts
        container.singleton(
          'AdCreationContext',
          () => new AdCreationContext(
            container.resolve('IAdRepository'),
            container.resolve('PlanetCore')
          )
        )
      }
    }
  }
}

// 2. Verify registration
const keys = container.getAllKeys()
console.log('Registered services:', keys)

// 3. Use consistent key names
const repo = container.resolve('IAdRepository')
const sameRepo = container.resolve('IAdRepository') // Should be same instance
console.log(repo === sameRepo) // true
```

### Circular Dependency

**Error:** `Cannot resolve circular dependency`

**Causes:**
- Service A depends on B, B depends on A
- Missing abstraction between services

**Solution:**

```typescript
// ❌ Circular
class AdRepository {
  constructor(private cache: CacheService) {}
}

class CacheService {
  constructor(private adRepository: AdRepository) {}
}

// ✅ Solution 1: Extract common interface
interface IDataStore {
  get(key: string): Promise<any>
  set(key: string, value: any): Promise<void>
}

class AdRepository {
  constructor(private dataStore: IDataStore) {}
}

class CacheService implements IDataStore {
  get(key: string): Promise<any> { }
  set(key: string, value: any): Promise<void> { }
}

// ✅ Solution 2: Use lazy initialization
class CacheService {
  private adRepository: AdRepository | null = null

  getRepository(): AdRepository {
    if (!this.adRepository) {
      this.adRepository = container.resolve('AdRepository')
    }
    return this.adRepository
  }
}
```

## Performance Issues

### Slow Delivery Queries (>100ms)

**Causes:**
- Missing database indexes
- Full table scan
- Too many ads per slot
- Network latency

**Solution:**
See [PERFORMANCE.md - Query Optimization](./PERFORMANCE.md#query-optimization)

### High Memory Usage

**Causes:**
- Large ad objects kept in memory
- Cache not being cleared
- Event queue growing unbounded
- Memory leak in subscribers

**Solution:**
See [PERFORMANCE.md - Memory Management](./PERFORMANCE.md#memory-management)

## Debugging Techniques

### Enable Debug Logging

```typescript
// Enable debug logging for satellite-ad
import debug from 'debug'

const log = debug('satellite-ad:*')

// Create namespaced loggers
const logRepository = debug('satellite-ad:repository')
const logController = debug('satellite-ad:controller')
const logEvent = debug('satellite-ad:event')

// Use in code
logRepository('Finding ads for slot: %s', slotSlug)
logController('Received request: %O', req.body)
logEvent('Publishing event: %s', eventName)
```

```bash
# Run with debug enabled
DEBUG=satellite-ad:* npm start

# Show only specific namespace
DEBUG=satellite-ad:repository npm start
```

### Use Node Inspector

```bash
# Start with inspector
node --inspect app.ts

# Connect to chrome://inspect in Chrome DevTools
```

### Database Query Logging

```typescript
// Log all queries
import { knex } from 'knex'

const db = knex({
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  debug: true, // Logs all queries
})

// Or use logging library
db.on('query', (query) => {
  console.log('SQL:', query.sql)
  console.log('Bindings:', query.bindings)
})
```

### Event Flow Tracing

```typescript
// Trace event flow
subscribe('ad:*', (event) => {
  console.log(`
    [EVENT TRACE] ${event.type}
    Timestamp: ${new Date().toISOString()}
    Payload: ${JSON.stringify(event, null, 2)}
  `)
})
```

---

For more information, see [PERFORMANCE.md](./PERFORMANCE.md) for optimization details and [API.md](./API.md) for endpoint specifications.
