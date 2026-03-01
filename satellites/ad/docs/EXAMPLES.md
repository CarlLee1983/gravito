# Code Examples

Practical examples for integrating and using the satellite-ad API across different contexts.

## Table of Contents

1. [cURL Examples](#curl-examples)
2. [JavaScript/Node.js Examples](#javascriptnode-examples)
3. [TypeScript Examples](#typescript-examples)
4. [React Examples](#react-examples)
5. [Frontend Integration](#frontend-integration)
6. [Common Patterns](#common-patterns)

## cURL Examples

### Create Advertisement

```bash
# Create a new advertisement
curl -X POST http://localhost:3000/api/admin/v1/ads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "slotSlug": "homepage-banner",
    "title": "Summer Sale 2026",
    "imageUrl": "https://cdn.example.com/summer-banner.jpg",
    "targetUrl": "https://example.com/sale",
    "weight": 75,
    "startsAt": "2026-03-01T00:00:00Z",
    "endsAt": "2026-03-31T23:59:59Z",
    "metadata": {
      "campaign_id": "SUMMER2026",
      "utm_source": "internal"
    }
  }'

# Response (201 Created):
# {
#   "success": true,
#   "data": {
#     "id": "ad-550e8400-e29b-41d4-a716-446655440000",
#     "slotSlug": "homepage-banner",
#     "title": "Summer Sale 2026",
#     "status": "DRAFT",
#     "createdAt": "2026-03-01T10:30:00Z",
#     ...
#   }
# }
```

### List Advertisements with Filtering

```bash
# List all active ads for a specific slot with pagination
curl -X GET "http://localhost:3000/api/admin/v1/ads?slotSlug=homepage-banner&status=ACTIVE&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Response (200 OK):
# {
#   "success": true,
#   "data": [
#     {
#       "id": "ad-1234",
#       "slotSlug": "homepage-banner",
#       "title": "Summer Sale",
#       "status": "ACTIVE",
#       ...
#     },
#     {
#       "id": "ad-5678",
#       "slotSlug": "homepage-banner",
#       "title": "New Product Launch",
#       "status": "ACTIVE",
#       ...
#     }
#   ],
#   "meta": {
#     "total": 2,
#     "page": 1,
#     "limit": 20
#   }
# }
```

### Get Single Advertisement

```bash
curl -X GET http://localhost:3000/api/admin/v1/ads/ad-550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Response (200 OK):
# {
#   "success": true,
#   "data": {
#     "id": "ad-550e8400-e29b-41d4-a716-446655440000",
#     "slotSlug": "homepage-banner",
#     "title": "Summer Sale 2026",
#     "imageUrl": "https://cdn.example.com/summer-banner.jpg",
#     "targetUrl": "https://example.com/sale",
#     "weight": 75,
#     "status": "DRAFT",
#     ...
#   }
# }
```

### Update Advertisement

```bash
# Update advertisement title and image
curl -X PUT http://localhost:3000/api/admin/v1/ads/ad-550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "title": "Summer Sale 2026 - Extended!",
    "imageUrl": "https://cdn.example.com/summer-banner-v2.jpg"
  }'

# Response (200 OK):
# {
#   "success": true,
#   "data": {
#     "id": "ad-550e8400-e29b-41d4-a716-446655440000",
#     "title": "Summer Sale 2026 - Extended!",
#     "imageUrl": "https://cdn.example.com/summer-banner-v2.jpg",
#     "updatedAt": "2026-03-15T14:22:00Z",
#     ...
#   }
# }
```

### Toggle Advertisement Status

```bash
# Activate advertisement from DRAFT to ACTIVE
curl -X PATCH http://localhost:3000/api/admin/v1/ads/ad-550e8400-e29b-41d4-a716-446655440000/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"action": "activate"}'

# Pause active advertisement
curl -X PATCH http://localhost:3000/api/admin/v1/ads/ad-550e8400-e29b-41d4-a716-446655440000/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"action": "pause"}'

# Resume paused advertisement
curl -X PATCH http://localhost:3000/api/admin/v1/ads/ad-550e8400-e29b-41d4-a716-446655440000/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"action": "resume"}'
```

### Delete Advertisement

```bash
# Delete advertisement (only works for DRAFT status)
curl -X DELETE http://localhost:3000/api/admin/v1/ads/ad-550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Response (200 OK):
# {
#   "success": true,
#   "data": {
#     "message": "Advertisement deleted successfully"
#   }
# }
```

### Delivery - Request Ads for Multiple Slots

```bash
# Request ads for multiple slots
curl -X POST http://localhost:3000/api/v1/ads/delivery \
  -H "Content-Type: application/json" \
  -d '{
    "slots": ["homepage-banner", "sidebar", "footer"]
  }'

# Response (200 OK):
# {
#   "success": true,
#   "data": {
#     "homepage-banner": {
#       "id": "ad-1234",
#       "title": "Summer Sale",
#       "imageUrl": "https://cdn.example.com/summer-banner.jpg",
#       "targetUrl": "https://example.com/sale"
#     },
#     "sidebar": {
#       "id": "ad-5678",
#       "title": "New Product",
#       "imageUrl": "https://cdn.example.com/product.jpg",
#       "targetUrl": "https://example.com/product"
#     },
#     "footer": null
#   }
# }
```

### Delivery - Request Single Slot Ad

```bash
# Get weighted random ad for specific slot
curl -X GET http://localhost:3000/api/v1/ads/slots/homepage-banner

# Response (200 OK):
# {
#   "success": true,
#   "data": {
#     "id": "ad-1234",
#     "title": "Summer Sale",
#     "imageUrl": "https://cdn.example.com/summer-banner.jpg",
#     "targetUrl": "https://example.com/sale"
#   }
# }

# Response when no ads available (404):
# {
#   "success": false,
#   "error": {
#     "code": "NO_ADS_FOR_SLOT",
#     "message": "No active advertisements found for slot: homepage-banner"
#   }
# }
```

## JavaScript/Node Examples

### Basic Node.js Client

```javascript
// src/ad-client.js
const BASE_URL = 'http://localhost:3000/api'
const API_TOKEN = process.env.API_TOKEN

class AdClient {
  constructor(baseUrl = BASE_URL, token = API_TOKEN) {
    this.baseUrl = baseUrl
    this.token = token
  }

  async request(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        `API Error: ${data.error?.code} - ${data.error?.message}`
      )
    }

    return data.data
  }

  // Admin operations
  async createAd(input) {
    return this.request('POST', '/admin/v1/ads', input)
  }

  async listAds(filters = {}) {
    const query = new URLSearchParams(filters)
    return this.request('GET', `/admin/v1/ads?${query}`)
  }

  async getAd(id) {
    return this.request('GET', `/admin/v1/ads/${id}`)
  }

  async updateAd(id, changes) {
    return this.request('PUT', `/admin/v1/ads/${id}`, changes)
  }

  async toggleAdStatus(id, action) {
    return this.request('PATCH', `/admin/v1/ads/${id}/status`, { action })
  }

  async deleteAd(id) {
    return this.request('DELETE', `/admin/v1/ads/${id}`)
  }

  // Public delivery
  async deliveryAds(slots) {
    return this.request('POST', '/v1/ads/delivery', { slots })
  }

  async getSlotAd(slotSlug) {
    return this.request('GET', `/v1/ads/slots/${slotSlug}`)
  }
}

module.exports = AdClient
```

### Using the Client

```javascript
// src/examples/create-and-manage-ad.js
const AdClient = require('./ad-client')

async function example() {
  const client = new AdClient()

  try {
    // 1. Create an advertisement
    console.log('Creating advertisement...')
    const ad = await client.createAd({
      slotSlug: 'homepage-banner',
      title: 'Summer Sale 2026',
      imageUrl: 'https://cdn.example.com/summer.jpg',
      targetUrl: 'https://example.com/sale',
      weight: 75,
      startsAt: '2026-03-01T00:00:00Z',
      endsAt: '2026-03-31T23:59:59Z',
      metadata: {
        campaign_id: 'SUMMER2026',
      },
    })

    console.log('Created ad:', ad.id)

    // 2. List ads for the slot
    const ads = await client.listAds({ slotSlug: 'homepage-banner' })
    console.log(`Found ${ads.length} ads in slot`)

    // 3. Update the ad
    await client.updateAd(ad.id, {
      title: 'Summer Sale 2026 - Extra 20% Off',
    })
    console.log('Updated ad title')

    // 4. Activate the ad
    await client.toggleAdStatus(ad.id, 'activate')
    console.log('Activated ad')

    // 5. Get single ad
    const updated = await client.getAd(ad.id)
    console.log('Current status:', updated.status)

    // 6. Pause the ad
    await client.toggleAdStatus(ad.id, 'pause')
    console.log('Paused ad')

    // 7. Resume the ad
    await client.toggleAdStatus(ad.id, 'resume')
    console.log('Resumed ad')

    // 8. Get ads for delivery
    const delivery = await client.deliveryAds(['homepage-banner', 'sidebar'])
    console.log('Delivery ads:', delivery)

    // 9. Delete ad (only works if DRAFT)
    // await client.deleteAd(ad.id)
  } catch (error) {
    console.error('Error:', error.message)
  }
}

example()
```

### Event Subscription Pattern

```javascript
// src/subscribers/ad-event-handler.js
const EventEmitter = require('events')

class AdEventHandler extends EventEmitter {
  constructor(adClient) {
    super()
    this.client = adClient
  }

  // Simulate event subscription
  async watchAdStatus(adId, intervalMs = 5000) {
    let previousStatus = null

    const timer = setInterval(async () => {
      try {
        const ad = await this.client.getAd(adId)

        if (ad.status !== previousStatus) {
          console.log(`Status changed: ${previousStatus} → ${ad.status}`)
          this.emit('status-changed', {
            adId,
            previousStatus,
            newStatus: ad.status,
          })
          previousStatus = ad.status
        }
      } catch (error) {
        console.error('Error watching ad:', error.message)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }

  async trackAdDelivery(slotSlug, intervalMs = 10000) {
    let previousCount = 0

    const timer = setInterval(async () => {
      try {
        const ad = await this.client.getSlotAd(slotSlug)
        if (ad) {
          console.log(`Ad delivered for ${slotSlug}:`, ad.title)
          this.emit('ad-delivered', { slotSlug, ad })
        }
      } catch (error) {
        if (error.message.includes('NO_ADS_FOR_SLOT')) {
          console.log(`No ads available for ${slotSlug}`)
        } else {
          console.error('Error tracking delivery:', error.message)
        }
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }
}

module.exports = AdEventHandler
```

## TypeScript Examples

### Typed Client with Zod Validation

```typescript
// src/ad-client.ts
import { z } from 'zod'

// Define types matching API spec
const AdDTOSchema = z.object({
  id: z.string().uuid(),
  slotSlug: z.string(),
  title: z.string(),
  imageUrl: z.string().url(),
  targetUrl: z.string().url(),
  weight: z.number().min(1).max(100),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
})

type AdDTO = z.infer<typeof AdDTOSchema>

const CreateAdInputSchema = z.object({
  slotSlug: z.string(),
  title: z.string().min(1).max(255),
  imageUrl: z.string().url(),
  targetUrl: z.string().url(),
  weight: z.number().min(1).max(100),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  activateImmediately: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

type CreateAdInput = z.infer<typeof CreateAdInputSchema>

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
})

export class TypedAdClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiToken: string
  ) {}

  async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const json = await response.json()
    const parsed = ApiResponseSchema.parse(json)

    if (!parsed.success) {
      throw new Error(
        `${parsed.error?.code}: ${parsed.error?.message}`
      )
    }

    if (schema) {
      return schema.parse(parsed.data)
    }

    return parsed.data as T
  }

  async createAd(input: CreateAdInput): Promise<AdDTO> {
    return this.request(
      'POST',
      '/admin/v1/ads',
      input,
      AdDTOSchema
    )
  }

  async listAds(
    filters?: Partial<{ slotSlug: string; status: string; page: number; limit: number }>
  ): Promise<AdDTO[]> {
    const query = new URLSearchParams(
      Object.entries(filters || {}).map(([k, v]) => [k, String(v)])
    )
    return this.request(
      'GET',
      `/admin/v1/ads?${query}`,
      undefined,
      z.array(AdDTOSchema)
    )
  }

  async getAd(id: string): Promise<AdDTO> {
    return this.request(
      'GET',
      `/admin/v1/ads/${id}`,
      undefined,
      AdDTOSchema
    )
  }

  async updateAd(
    id: string,
    changes: Partial<CreateAdInput>
  ): Promise<AdDTO> {
    return this.request(
      'PUT',
      `/admin/v1/ads/${id}`,
      changes,
      AdDTOSchema
    )
  }

  async toggleAdStatus(
    id: string,
    action: 'activate' | 'pause' | 'resume' | 'archive'
  ): Promise<AdDTO> {
    return this.request(
      'PATCH',
      `/admin/v1/ads/${id}/status`,
      { action },
      AdDTOSchema
    )
  }

  async deleteAd(id: string): Promise<{ message: string }> {
    return this.request(
      'DELETE',
      `/admin/v1/ads/${id}`,
      undefined,
      z.object({ message: z.string() })
    )
  }

  async deliveryAds(slots: string[]): Promise<Record<string, AdDTO | null>> {
    return this.request(
      'POST',
      '/v1/ads/delivery',
      { slots },
      z.record(AdDTOSchema.nullable())
    )
  }

  async getSlotAd(slotSlug: string): Promise<AdDTO> {
    return this.request(
      'GET',
      `/v1/ads/slots/${slotSlug}`,
      undefined,
      AdDTOSchema
    )
  }
}
```

### Gravito Integration Example

```typescript
// src/services/SalesPromotionService.ts
import type { PlanetCore } from '@gravito/core'
import { AdCreationContext } from '@gravito/satellite-ad'
import type { IAdRepository } from '@gravito/satellite-ad'

interface SalesPromotion {
  id: string
  name: string
  imageUrl: string
  landingPageUrl: string
  weight: number
  startsAt: Date
  endsAt: Date
  slotSlug: string
}

export class SalesPromotionService {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly core: PlanetCore
  ) {}

  async createPromotionWithAd(
    promotion: SalesPromotion
  ): Promise<{ promotionId: string; adId: string }> {
    try {
      // Create ad through DCI context
      const context = new AdCreationContext(
        this.adRepository,
        this.core
      )

      const ad = await context.execute({
        slotSlug: promotion.slotSlug,
        title: promotion.name,
        imageUrl: promotion.imageUrl,
        targetUrl: promotion.landingPageUrl,
        weight: promotion.weight,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
        activateImmediately: true,
      })

      // Publish event
      await this.core.emit('promotion:created_with_ad', {
        promotionId: promotion.id,
        adId: ad.id,
        name: promotion.name,
        timestamp: new Date(),
      })

      return {
        promotionId: promotion.id,
        adId: ad.id,
      }
    } catch (error) {
      console.error('Failed to create promotion ad:', error)
      throw error
    }
  }
}
```

## React Examples

### Hook for Ad Delivery

```typescript
// src/hooks/useAdDelivery.ts
import { useState, useEffect } from 'react'

interface UseAdDeliveryOptions {
  slotSlug: string
  apiBaseUrl?: string
}

interface DeliveredAd {
  id: string
  title: string
  imageUrl: string
  targetUrl: string
}

export function useAdDelivery({
  slotSlug,
  apiBaseUrl = process.env.REACT_APP_API_URL,
}: UseAdDeliveryOptions) {
  const [ad, setAd] = useState<DeliveredAd | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAd = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `${apiBaseUrl}/api/v1/ads/slots/${slotSlug}`
        )

        if (!response.ok) {
          if (response.status === 404) {
            setAd(null)
            return
          }
          throw new Error(`Failed to fetch ad: ${response.statusText}`)
        }

        const data = await response.json()
        if (data.success) {
          setAd(data.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAd()
  }, [slotSlug, apiBaseUrl])

  return { ad, loading, error }
}
```

### Ad Banner Component

```typescript
// src/components/AdBanner.tsx
import React from 'react'
import { useAdDelivery } from '../hooks/useAdDelivery'

interface AdBannerProps {
  slotSlug: string
  fallback?: React.ReactNode
  onAdClick?: (adId: string) => void
}

export function AdBanner({
  slotSlug,
  fallback,
  onAdClick,
}: AdBannerProps) {
  const { ad, loading, error } = useAdDelivery({ slotSlug })

  if (loading) {
    return (
      <div className="ad-banner loading">
        <div className="skeleton" />
      </div>
    )
  }

  if (error || !ad) {
    return fallback ? <>{fallback}</> : null
  }

  const handleClick = () => {
    // Track click
    navigator.sendBeacon(`/api/v1/ads/${ad.id}/click`)

    // Call callback
    onAdClick?.(ad.id)

    // Navigate
    window.location.href = ad.targetUrl
  }

  return (
    <div className="ad-banner">
      <a href={ad.targetUrl} onClick={handleClick}>
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="ad-image"
        />
        <div className="ad-title">{ad.title}</div>
      </a>
    </div>
  )
}
```

### Multiple Slots Component

```typescript
// src/components/AdGrid.tsx
import React from 'react'
import { useState, useEffect } from 'react'

interface AdGridProps {
  slots: string[]
}

interface DeliveryResponse {
  [slotSlug: string]: {
    id: string
    title: string
    imageUrl: string
    targetUrl: string
  } | null
}

export function AdGrid({ slots }: AdGridProps) {
  const [ads, setAds] = useState<DeliveryResponse>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/v1/ads/delivery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slots }),
          }
        )

        const data = await response.json()
        if (data.success) {
          setAds(data.data)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAds()
  }, [slots])

  if (loading) {
    return <div>Loading ads...</div>
  }

  return (
    <div className="ad-grid">
      {slots.map((slot) => {
        const ad = ads[slot]
        return (
          <div key={slot} className="ad-slot">
            {ad ? (
              <a href={ad.targetUrl}>
                <img src={ad.imageUrl} alt={ad.title} />
              </a>
            ) : (
              <div className="ad-placeholder">No ad available</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

## Frontend Integration

### HTML+JavaScript Integration

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ad Integration Example</title>
  <style>
    .ad-banner {
      max-width: 728px;
      margin: 20px auto;
      border: 1px solid #ddd;
    }

    .ad-banner img {
      width: 100%;
      height: auto;
      display: block;
    }

    .ad-placeholder {
      width: 100%;
      height: 90px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
    }
  </style>
</head>
<body>
  <h1>Ad Integration Example</h1>

  <!-- Ad slot -->
  <div id="ad-container"></div>

  <script>
    const API_URL = 'http://localhost:3000/api'

    async function loadAd(slotSlug) {
      try {
        const response = await fetch(`${API_URL}/v1/ads/slots/${slotSlug}`)
        const data = await response.json()

        const container = document.getElementById('ad-container')

        if (data.success && data.data) {
          const ad = data.data
          container.innerHTML = `
            <div class="ad-banner">
              <a href="${ad.targetUrl}">
                <img src="${ad.imageUrl}" alt="${ad.title}" />
                <p>${ad.title}</p>
              </a>
            </div>
          `
        } else {
          container.innerHTML = '<div class="ad-placeholder">No ads available</div>'
        }
      } catch (error) {
        console.error('Failed to load ad:', error)
      }
    }

    // Load ad when page loads
    loadAd('homepage-banner')
  </script>
</body>
</html>
```

## Common Patterns

### Error Handling Pattern

```typescript
// src/utils/ad-error-handler.ts
export async function handleAdError(error: unknown): Promise<string> {
  if (error instanceof Error) {
    // Parse API error codes
    if (error.message.includes('VALIDATION_ERROR')) {
      return 'Please check your input and try again'
    }
    if (error.message.includes('AD_NOT_FOUND')) {
      return 'Advertisement not found'
    }
    if (error.message.includes('INVALID_STATUS_TRANSITION')) {
      return 'Cannot perform this action in current ad status'
    }
    if (error.message.includes('INVALID_SCHEDULE')) {
      return 'Invalid date range for advertisement'
    }
  }

  return 'An unexpected error occurred'
}
```

### Retry Logic Pattern

```typescript
// src/utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error

      console.warn(
        `Attempt ${attempt} failed, retrying in ${delayMs}ms...`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw new Error('Retry failed')
}

// Usage
const ad = await withRetry(() => client.getSlotAd('homepage-banner'))
```

### Caching Pattern

```typescript
// src/utils/ad-cache.ts
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export class AdCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()

  set(key: string, data: T, ttlMs = 3600000): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    })
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }
}

// Usage
const cache = new AdCache<DeliveredAd>()
```

### Request Deduplication Pattern

```typescript
// src/utils/dedup.ts
export class RequestDeduplicator {
  private pending: Map<string, Promise<unknown>> = new Map()

  async execute<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Return pending request if exists
    const pending = this.pending.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    // Execute function and cache promise
    const promise = fn()
    this.pending.set(key, promise)

    try {
      return await promise
    } finally {
      this.pending.delete(key)
    }
  }
}

// Usage - prevents duplicate ad requests
const dedup = new RequestDeduplicator()
const ad = await dedup.execute('homepage-banner', () =>
  client.getSlotAd('homepage-banner')
)
```

---

For more information, see [API.md](./API.md) for endpoint details and [INTEGRATION.md](./INTEGRATION.md) for integration patterns.
