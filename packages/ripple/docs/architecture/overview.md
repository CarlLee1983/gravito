# @gravito/ripple Architecture Overview

## System Architecture

@gravito/ripple is a high-performance, Bun-native WebSocket broadcasting module designed for real-time communication in the Gravito framework. The architecture follows clean separation of concerns with clear boundaries between layers.

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (User Code, Event Classes, Authorization Logic)            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Public API Layer                          │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ RippleServer │  │ BroadcastMgr  │  │ broadcast()     │  │
│  │              │  │               │  │ Broadcaster     │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Services Layer                       │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ ChannelManager │  │ MessageHandler │  │ Serializer   │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ Logger         │  │ HealthChecker  │  │ ConnTracker  │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Driver Abstraction Layer                   │
│  ┌────────────────┐           ┌────────────────┐            │
│  │  LocalDriver   │           │  RedisDriver   │            │
│  │  (In-Memory)   │           │  (Pub/Sub)     │            │
│  └────────────────┘           └────────────────┘            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Bun WebSocket Runtime                      │
│  (Native WebSocket, High Performance, Low Latency)          │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. RippleServer
**Responsibility**: WebSocket lifecycle management and orchestration

- Handles WebSocket upgrade requests
- Manages client connections (open, message, close, drain)
- Coordinates between ChannelManager, MessageHandler, and Driver
- Provides health check and statistics endpoints
- Implements graceful shutdown

**Key Dependencies**:
- ChannelManager (channel subscriptions)
- MessageHandler (protocol parsing)
- Driver (message distribution)
- Logger (observability)
- ConnectionTracker (metrics)

### 2. ChannelManager
**Responsibility**: Channel subscription and presence tracking

- Manages channel subscriptions (subscribe/unsubscribe)
- Tracks presence channel members
- Handles authorization via ChannelAuthorizer callback
- Maintains client-to-channel and channel-to-client mappings
- Provides stats on channel usage

**Data Structures**:
- `channels: Map<string, Set<RippleWebSocket>>` - Channel → Clients
- `clients: Map<string, RippleWebSocket>` - ClientID → WebSocket
- `presenceData: Map<string, Map<string, PresenceUserInfo>>` - Channel → Members

### 3. BroadcastManager
**Responsibility**: High-level broadcasting API

- Fluent API for channel targeting (`.to()`, `.toPrivate()`, `.toPresence()`)
- Event serialization and distribution
- Integration with BroadcastEvent pattern
- Client exclusion support (`.except()`)
- Delegates to ChannelManager for actual message delivery

### 4. Driver Abstraction
**Responsibility**: Message distribution across server instances

**LocalDriver** (Single Server):
- In-memory message distribution
- Direct WebSocket writes
- No external dependencies
- Suitable for development and single-server deployments

**RedisDriver** (Multi-Server):
- Redis Pub/Sub for cross-server messaging
- Horizontal scaling support
- Connection health monitoring
- Automatic reconnection

### 5. MessageHandler
**Responsibility**: WebSocket protocol implementation

- Parses client messages (`subscribe`, `unsubscribe`, `whisper`, `ping`)
- Enforces authorization for private/presence channels
- Constructs server messages (`subscribed`, `event`, `presence`, `error`, `pong`)
- Handles message validation and error responses

### 6. Observability Layer

**Logger**:
- Structured logging with context
- Configurable log levels (debug, info, warn, error)
- Performance metrics logging

**HealthChecker**:
- Driver health monitoring
- Connection stats
- Memory usage tracking
- Heartbeat mechanism

**ConnectionTracker**:
- Connection lifecycle tracking
- Active connection count
- Connection duration metrics
- Client metadata tracking

## Message Flow

### Broadcasting Flow (Server → Clients)

```
Application Code
    │
    ├─ broadcast(new OrderShipped(...))
    │     │
    │     ▼
    │  BroadcastManager.broadcast(event)
    │     │
    │     ├─ event.broadcastOn() → Channel(s)
    │     ├─ event.broadcastAs() → Event Name
    │     ├─ event.broadcastExcept() → Excluded Socket IDs
    │     │
    │     ▼
    │  MessageSerializer.serialize(event)
    │     │
    │     ▼
    │  Driver.publish(channel, event, data)
    │     │
    │     ├─ LocalDriver: Direct WebSocket writes
    │     └─ RedisDriver: Redis Pub/Sub
    │           │
    │           ▼
    │        Redis Pub/Sub
    │           │
    │           ▼
    │        All Server Instances subscribe
    │           │
    │           ▼
    ▼
ChannelManager.getSubscribers(channel)
    │
    ▼
WebSocket.send(message) → Client(s)
```

### Subscription Flow (Client → Server)

```
Client WebSocket
    │
    ├─ { type: 'subscribe', channel: 'private-orders.123' }
    │
    ▼
RippleServer.message(ws, message)
    │
    ▼
MessageHandler.handleMessage(ws, message)
    │
    ├─ Parse JSON
    ├─ Validate message structure
    │
    ▼
ChannelManager.subscribe(ws, channel)
    │
    ├─ Parse channel type (public/private/presence)
    ├─ Call authorizer(channel, userId, socketId)
    │     │
    │     └─ Returns: boolean | PresenceUserInfo
    │
    ├─ If authorized:
    │     ├─ Add client to channel
    │     ├─ For presence: Store user info
    │     ├─ For presence: Broadcast 'join' event
    │     │
    │     ▼
    │  ws.send({ type: 'subscribed', channel })
    │
    └─ If denied:
          │
          ▼
       ws.send({ type: 'error', code: 'UNAUTHORIZED', channel })
```

## Channel Types

### Public Channels
- **Naming**: No prefix (e.g., `news`)
- **Authorization**: None required
- **Use Case**: Public announcements, global events

### Private Channels
- **Naming**: `private-` prefix (e.g., `private-orders.123`)
- **Authorization**: Boolean (authorized or denied)
- **Use Case**: User-specific data, secure notifications

### Presence Channels
- **Naming**: `presence-` prefix (e.g., `presence-chat.lobby`)
- **Authorization**: PresenceUserInfo (user data)
- **Events**: `join`, `leave`, `members`
- **Use Case**: Online user tracking, chat rooms, collaborative editing

## Security Model

### Authentication Flow
1. Client connects → receives `socketId`
2. Client requests subscription to private/presence channel
3. Server calls `authorizer(channel, userId, socketId)`
4. Authorizer validates ownership/permission
5. Server grants or denies subscription

### Authorization Callback
```typescript
type ChannelAuthorizer = (
  channelName: string,
  userId: string | number | undefined,
  socketId: string
) => boolean | PresenceUserInfo | Promise<...>
```

**Responsibility**: Application-defined logic
- Database lookups
- Session validation
- Resource ownership checks
- Role-based access control

## Performance Characteristics

### Message Serialization Caching
- Serializes broadcast messages once
- Reuses serialized buffer for all recipients
- Reduces CPU overhead by ~60% for large broadcasts

### Connection Tracking
- O(1) client lookup
- O(1) channel subscription lookup
- Memory-efficient Set/Map structures

### Bun-Native WebSocket
- Zero-copy writes
- Native backpressure handling
- Optimized for throughput

### Horizontal Scaling (Redis Driver)
- Redis Pub/Sub for cross-server messaging
- Each server instance maintains local WebSocket connections
- Messages broadcast to all instances via Redis
- Each instance delivers to its local clients

## Configuration

### Minimal Setup (Local Driver)
```typescript
{
  path: '/ws',
  authorizer: (channel, userId) => userId !== undefined
}
```

### Production Setup (Redis Driver)
```typescript
{
  path: '/ws',
  driver: 'redis',
  redis: {
    host: process.env.REDIS_HOST,
    port: 6379,
    password: process.env.REDIS_PASSWORD
  },
  authorizer: async (channel, userId) => {
    // Database lookup
  },
  pingInterval: 30000,
  logger: customLogger,
  logLevel: 'info',
  healthCheck: { enabled: true, path: '/health' }
}
```

## Design Decisions

See Architecture Decision Records (ADRs) for detailed rationale:
- [ADR-001: Bun Native WebSocket](./ADR-001-bun-websocket.md)
- [ADR-002: Channel Authorization Model](./ADR-002-channel-authorization.md)
- [ADR-003: Driver Abstraction Layer](./ADR-003-driver-abstraction.md)

## Monitoring and Observability

### Health Check Endpoint
```
GET /health (configurable path)

Response:
{
  "status": "healthy",
  "driver": {
    "name": "redis",
    "initialized": true,
    "connected": true
  },
  "stats": {
    "totalConnections": 1523,
    "activeConnections": 1234,
    "totalChannels": 456
  }
}
```

### Logging
- Structured logs with context (clientId, channel, event)
- Performance metrics (message processing time)
- Error tracking with stack traces

### Metrics (via ConnectionTracker)
- Connection lifecycle events
- Channel subscription stats
- Message throughput
- Error rates

## Testing Strategy

### Unit Tests
- Individual component behavior
- Message serialization/deserialization
- Authorization logic
- Channel management operations

### Integration Tests
- End-to-end broadcast flow
- Channel subscription scenarios
- Driver integration
- Error handling

### Performance Tests
- Broadcast latency
- Throughput under load
- Memory usage
- Connection scalability

**Current Coverage**: 95.24% line coverage (198 tests)

## Future Enhancements

1. **Additional Drivers**: NATS, RabbitMQ, Kafka support
2. **Client SDK**: Official JavaScript/TypeScript client library
3. **Reconnection**: Automatic client reconnection with state recovery
4. **Message Persistence**: Optional message history for offline clients
5. **Rate Limiting**: Per-client message rate limiting
6. **Compression**: WebSocket compression support
7. **Monitoring Dashboard**: Real-time WebSocket metrics visualization
