# Inter-Satellite Communication Guide

In a microservices-inspired **Galaxy Architecture**, Satellites must remain decoupled. `@gravito/beam` provides the "Portal" to allow Satellites to communicate with each other securely and with 100% type safety.

## 1. Why use Beam for Inter-Satellite Calls?

- **Decoupling**: Satellite A doesn't need to know Satellite B's implementation details, only its `AppRoutes` type.
- **Type Safety**: Any change in Satellite B's API will cause a compilation error in Satellite A.
- **Security**: Beam handles service-to-service authentication (M2M) automatically.

## 2. Setting Up a Service Client

When Satellite A needs to call Satellite B, it should create a **Service Client** using Satellite B's exported types.

```typescript
// satellites/order/src/services/CatalogClient.ts
import { createBeam } from '@gravito/beam'
import type { CatalogRoutes } from '@satellites/catalog' // Import Type Only!

export const catalogClient = createBeam<CatalogRoutes>(
  process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3000',
  {
    // Internal Service Authentication
    headers: {
      'X-Internal-Service-ID': 'order-satellite',
      'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET
    }
  }
)
```

## 3. Usage in a Handler or Service

```typescript
// satellites/order/src/handlers/createOrder.ts
import { catalogClient } from '../services/CatalogClient'

export const createOrder = async (c) => {
  const { productId, quantity } = await c.req.json()

  // 1. Call Catalog Satellite to check stock (Type-Safe!)
  const res = await catalogClient.products[':id'].$get({
    param: { id: productId }
  })

  if (!res.ok) throw new Error('Product not found')
  
  const product = await res.json()
  // ... process order
}
```

## 4. Secure Machine-to-Machine (M2M) Auth

For internal calls, we recommend using a dedicated interceptor to sign requests:

```typescript
const client = createBeam<CatalogRoutes>(url, {
  onRequest: async (config) => {
    config.headers['Authorization'] = `Bearer ${generateServiceToken()}`
    return config
  }
})
```

## 5. Circuit Breaking Inter-Satellite Calls

Always combine Beam calls with `@gravito/resilience` to prevent one failing satellite from taking down others.

```typescript
import { CircuitBreaker } from '@gravito/resilience'

const cb = new CircuitBreaker()

const product = await cb.execute(() => 
  catalogClient.products[':id'].$get({ param: { id: productId } }).then(r => r.json())
)
```

## 6. Performance: Connection Pooling

For high-traffic inter-satellite communication, **Connection Pooling** is mandatory. Enable it in your client configuration to reuse HTTP/2 connections and reduce latency.

```typescript
const client = createBeam<CatalogRoutes>(url, {
  pool: true // Enable default high-performance pooling
})
```
