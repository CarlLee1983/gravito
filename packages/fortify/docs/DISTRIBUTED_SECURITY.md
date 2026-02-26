# Distributed Security Guide

In the **Galaxy Architecture**, security must be enforced consistently across all Satellites while maintaining their isolation. `@gravito/fortify` provides the infrastructure for distributed authentication and authorization.

## 1. Zero-Trust Identity

Satellites should be **stateless**. They shouldn't manage sessions themselves. Instead, they rely on `Fortify` to provide a verified identity for every request.

- **Frontend Requests**: Use JWT or Session-based authentication. Photon's sensing layer intercepts the request, and Fortify validates the identity before it reaches the Satellite handler.
- **Identity Context**: The user's ID, roles, and permissions are injected into the `GravitoContext`, available via `c.get('user')`.

## 2. Service-to-Service (M2M) Authentication

When Satellite A calls Satellite B via `Beam`, it must identify itself as a trusted service.

### Generating a Service Token
`Fortify` provides utilities to sign internal service tokens:

```typescript
import { Fortify } from '@gravito/fortify'

const serviceToken = await Fortify.generateServiceToken({
  serviceId: 'order-satellite',
  audience: 'catalog-satellite',
  scopes: ['read:products']
})
```

### Validating in the Target Satellite
Satellite B uses the `serviceAuth` middleware to verify the incoming Beam request:

```typescript
import { serviceAuth } from '@gravito/fortify'

app.get('/products', serviceAuth(['read:products']), (c) => {
  // Only trusted services with the 'read:products' scope can reach here
})
```

## 3. Distributed RBAC (Role-Based Access Control)

Managing permissions in a distributed system can be complex. Fortify supports two patterns:

### Pattern A: Shared Identity Database
All satellites connect to the same `atlas` database instance where the `permissions` table resides. This is the simplest approach for smaller galaxies.

### Pattern B: Scoped Claims (Recommended)
User roles and permissions are encoded into the JWT (Claims). This allows Satellites to verify permissions offline without hitting the database on every request.

```typescript
// Define permissions in Satellite
import { can } from '@gravito/fortify'

app.post('/products', can('create:product'), (c) => {
  // Business logic
})
```

## 4. Rate Limiting as a Service

`Fortify` provides a distributed rate limiter backed by **Redis**. This protects your Galaxy from DDoS attacks or runaway satellite requests.

```typescript
import { rateLimit } from '@gravito/fortify'

// 100 requests per minute across all instances
app.use('/api/*', rateLimit({
  max: 100,
  window: '1m',
  keyPrefix: 'global-auth'
}))
```

## 5. Security Auditing (Signal Integration)

Every security event (login, unauthorized access attempt, M2M call) is dispatched as a `@gravito/signal` event. You can listen to these events to build a centralized audit log.

```typescript
core.on('auth:unauthorized', (event) => {
  core.logger.warn(`Potential security breach attempt from ${event.ip}`)
})
```
