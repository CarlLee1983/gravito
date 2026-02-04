# @gravito/ripple

> 🌊 High-performance WebSocket broadcasting for real-time applications. Built for Bun.

[![Test Coverage](https://img.shields.io/badge/coverage-95.24%25-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-198%20passing-success)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)]()
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0-orange)]()

## Features

- ⚡ **Bun Native WebSocket** - Zero external dependencies, 3x faster than ws library
- 📡 **Channel-based Broadcasting** - Public, Private, and Presence channels
- 🔒 **Secure Authorization** - Flexible callback-based authorization system
- 📊 **Production Ready** - 95.24% test coverage, battle-tested architecture
- 🚀 **Horizontal Scaling** - Redis driver for multi-server deployments
- 🔍 **Full Observability** - Built-in logging, health checks, and connection tracking
- 💪 **Type-Safe** - Comprehensive TypeScript support with JSDoc
- 🎯 **Laravel Echo Compatible** - Familiar API for Laravel developers

## Why Ripple?

### Performance First
- **Sub-millisecond latency**: Bun native WebSocket delivers messages in <1ms
- **Low memory footprint**: 25MB for 10,000 concurrent connections
- **Efficient serialization**: Message caching reduces CPU overhead by 60%

### Production Ready
- **198 comprehensive tests** with 95.24% line coverage
- **Graceful shutdown** with connection cleanup
- **Health monitoring** built-in
- **Error tracking** and observability

### Scalable Architecture
- **LocalDriver**: Zero-dependency single-server deployment
- **RedisDriver**: Horizontal scaling across multiple servers
- **Custom drivers**: Implement RippleDriver interface for NATS, RabbitMQ, etc.

## Installation

```bash
bun add @gravito/ripple
```

## Quick Start

### Server Setup

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitRipple, RippleServer } from '@gravito/ripple'

const core = new PlanetCore()

// Install Ripple WebSocket module
core.install(new OrbitRipple({
  path: '/ws',
  authorizer: async (channel, userId, socketId) => {
    // Return true for authorized, false for denied
    // For presence channels, return { id: userId, info: { name: '...' } }
    if (channel.startsWith('private-orders.')) {
      return userId !== undefined
    }
    return true
  }
}))

// Get the Ripple module
const ripple = core.container.make<OrbitRipple>('ripple')

// Start server with WebSocket support
Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    // Let Ripple handle WebSocket upgrades
    if (ripple.getServer().upgrade(req, server)) return

    // Regular HTTP handling
    return core.adapter.fetch(req, server)
  },
  websocket: ripple.getHandler()
})
```

### Broadcasting Events

```typescript
import { broadcast, PrivateChannel, BroadcastEvent } from '@gravito/ripple'

// Define a broadcast event
class OrderShipped extends BroadcastEvent {
  constructor(public order: { id: number; userId: number }) {
    super()
  }

  broadcastOn() {
    return new PrivateChannel(`orders.${this.order.userId}`)
  }

  broadcastAs() {
    return 'OrderShipped' // Event name
  }
}

// Broadcast from anywhere in your app
broadcast(new OrderShipped({ id: 123, userId: 456 }))
```

### Fluent API

```typescript
import { Broadcaster } from '@gravito/ripple'

// Broadcast to a public channel
Broadcaster.to('news')
  .emit('ArticlePublished', { title: 'Hello World' })

// Broadcast to a private channel
Broadcaster.toPrivate('orders.123')
  .emit('OrderUpdated', { status: 'shipped' })

// Broadcast to a presence channel
Broadcaster.toPresence('chat.lobby')
  .emit('NewMessage', { message: 'Hi!' })
```

## Channel Types

### Public Channel

No authentication required. Anyone can subscribe.

```typescript
import { PublicChannel } from '@gravito/ripple'

const channel = new PublicChannel('news')
// fullName: 'news'
```

### Private Channel

Requires authentication. Only authorized users can subscribe.

```typescript
import { PrivateChannel } from '@gravito/ripple'

const channel = new PrivateChannel('orders.123')
// fullName: 'private-orders.123'
```

### Presence Channel

Requires authentication. Tracks online users in the channel.

```typescript
import { PresenceChannel } from '@gravito/ripple'

const channel = new PresenceChannel('chat.lobby')
// fullName: 'presence-chat.lobby'
```

## Client SDK

For frontend integration, use `@gravito/ripple-client` (coming soon):

```typescript
import { createRippleClient } from '@gravito/ripple-client'

const ripple = createRippleClient({
  host: 'ws://localhost:3000/ws',
  authEndpoint: '/broadcasting/auth',
})

// Subscribe to public channel
ripple.channel('news')
  .listen('ArticlePublished', (event) => {
    console.log('New article:', event.title)
  })

// Subscribe to private channel
ripple.private(`orders.${userId}`)
  .listen('OrderShipped', (event) => {
    toast.success('Your order has shipped!')
  })

// Join presence channel
ripple.join(`chat.${roomId}`)
  .here((users) => console.log('Online:', users))
  .joining((user) => console.log(`${user.name} joined`))
  .leaving((user) => console.log(`${user.name} left`))
```

## Configuration

```typescript
interface RippleConfig {
  /** WebSocket endpoint path (default: '/ws') */
  path?: string

  /** Authentication endpoint for private/presence channels */
  authEndpoint?: string

  /** Driver to use ('local' | 'redis') */
  driver?: 'local' | 'redis'

  /** Redis configuration (if using redis driver) */
  redis?: {
    host?: string
    port?: number
    password?: string
    db?: number
  }

  /** Channel authorizer function */
  authorizer?: ChannelAuthorizer

  /** Ping interval in milliseconds (default: 30000) */
  pingInterval?: number

  /** Custom logger */
  logger?: RippleLogger

  /** Log level (default: 'info') */
  logLevel?: 'debug' | 'info' | 'warn' | 'error'

  /** Connection tracker for metrics */
  connectionTracker?: ConnectionTracker

  /** Health check configuration */
  healthCheck?: {
    enabled: boolean
    path?: string
  }
}
```

### Production Configuration Example

```typescript
import { RippleServer, ConnectionTracker } from '@gravito/ripple'

const tracker = new ConnectionTracker()

new RippleServer({
  path: '/ws',
  driver: 'redis',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD
  },
  authorizer: async (channel, userId, socketId) => {
    // Verify channel access
    if (channel.startsWith('private-')) {
      return userId !== undefined
    }
    if (channel.startsWith('presence-')) {
      const user = await db.users.findById(userId)
      return {
        id: user.id,
        info: { name: user.name, avatar: user.avatarUrl }
      }
    }
    return true
  },
  pingInterval: 30000,
  logLevel: 'info',
  connectionTracker: tracker,
  healthCheck: {
    enabled: true,
    path: '/health'
  }
})
```

## Performance

### Benchmarks (10,000 connections, 100KB message)

| Metric | LocalDriver | RedisDriver | ws library |
|--------|-------------|-------------|------------|
| **Latency (p95)** | 0.8ms | 2.1ms | 2.5ms |
| **Memory Usage** | 25MB | 35MB | 65MB |
| **CPU Usage** | 12% | 18% | 45% |
| **Throughput** | 100K msg/s | 50K msg/s | 30K msg/s |

### Optimizations in v3.0

- **Message Serialization Caching**: Serialize once, reuse for all recipients (~60% CPU reduction)
- **Efficient Channel Lookups**: O(1) subscriber lookups with Map/Set structures
- **Backpressure Handling**: Native Bun WebSocket backpressure support
- **Connection Pooling**: Reusable Redis connections for multi-server setups

## Documentation

- **[Architecture Overview](./docs/architecture/overview.md)** - System design and components
- **[ADR-001: Bun WebSocket](./docs/architecture/ADR-001-bun-websocket.md)** - Why Bun native WebSocket
- **[ADR-002: Authorization](./docs/architecture/ADR-002-channel-authorization.md)** - Channel authorization design
- **[ADR-003: Driver Abstraction](./docs/architecture/ADR-003-driver-abstraction.md)** - Multi-driver architecture
- **[Troubleshooting Guide](./docs/troubleshooting.md)** - Common issues and solutions
- **[Security Guide](./docs/security.md)** - Security best practices

## API Reference

Full API documentation available via TypeScript IntelliSense. All public APIs include comprehensive JSDoc with examples.

```typescript
// Hover over any method to see detailed documentation
const ripple = new RippleServer({ ... })
ripple.broadcast(...)  // Full JSDoc appears in your IDE
```

## Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Current coverage: 95.24% (198 tests passing)
```

## Changelog

### v4.0.0-alpha.1 (2026-02-04)

**🚀 Major Features**

- ✅ **NATS Driver**: High-performance distributed broadcasting with NATS JetStream
  - Sub-millisecond latency for million-level QPS
  - Native message persistence and replay support
  - ⚠️ Note: Presence persistence (NATS KV Store) planned for beta release
- ✅ **Message Interceptors**: Server and client-side middleware system
  - Onion model execution pattern (like Koa.js)
  - Use cases: logging, data masking, authentication, rate limiting
  - Full TypeScript support with async/await
- ✅ **Enhanced Client SDK** (`@gravito/ripple-client` v4.0.0-alpha.1)
  - Interceptor support with `.use()` API
  - Automatic reconnection with session token recovery
  - ACK confirmation for reliable message delivery
  - Binary message support

**🔧 Improvements**

- ✅ **ACK Manager**: Ensures critical messages are delivered and confirmed
- ✅ **Session Manager**: Server-assisted reconnection with state recovery
- ✅ **Metrics**: Enhanced observability with RippleMetrics
- ✅ **Redis Driver**: Presence persistence across multiple nodes

**📚 Documentation**

- ✅ Updated architecture specs to v4.0.0-alpha
- ✅ Added NATS driver configuration examples
- ✅ Documented interceptor patterns and use cases
- ✅ Added limitations and known issues section

**🧪 Testing**

- ✅ New test suites: NATS driver, interceptors, session management
- ✅ Integration tests for reconnection flows
- ✅ Redis presence persistence tests

### v3.0.0 (2025-01-24)

**Phase 1: Type Safety & Architecture**
- ✅ Migrated to standalone architecture (no Orbit dependency)
- ✅ Enhanced TypeScript types with strict null checks
- ✅ Improved error handling with typed error codes

**Phase 2: Error Handling & Observability**
- ✅ Implemented structured logging system
- ✅ Added health check endpoints
- ✅ Connection lifecycle tracking
- ✅ Performance metrics

**Phase 3: Performance Optimization**
- ✅ Message serialization caching (~60% CPU reduction)
- ✅ Efficient broadcast algorithms
- ✅ Memory optimization for large channel counts

**Phase 4: Comprehensive Testing**
- ✅ 198 test cases (79 → 198 tests)
- ✅ 95.24% line coverage
- ✅ Integration tests for all drivers
- ✅ Edge case coverage

**Phase 5: Documentation & Developer Experience**
- ✅ Comprehensive JSDoc for all public APIs
- ✅ Architecture decision records (ADRs)
- ✅ Troubleshooting guide
- ✅ Security best practices guide

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT
