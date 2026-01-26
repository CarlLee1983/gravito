# @gravito/ripple Troubleshooting Guide

Common issues, diagnostics, and solutions for @gravito/ripple WebSocket module.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Authorization Problems](#authorization-problems)
- [Broadcasting Not Working](#broadcasting-not-working)
- [Redis Driver Issues](#redis-driver-issues)
- [Performance Problems](#performance-problems)
- [Memory Leaks](#memory-leaks)
- [TypeScript Errors](#typescript-errors)
- [Debugging Tools](#debugging-tools)

---

## Connection Issues

### Problem: WebSocket Connection Fails

**Symptoms**:
- Client receives 404 or 400 error
- Connection never establishes
- Browser console shows connection refused

**Diagnosis**:
```typescript
// Check if upgrade handler is registered
const upgraded = rippleServer.upgrade(req, server)
console.log('WebSocket upgraded:', upgraded) // Should be true
```

**Common Causes & Solutions**:

#### 1. Missing `upgrade()` call in fetch handler

```typescript
// ❌ WRONG: No upgrade check
Bun.serve({
  fetch: (req) => {
    return new Response('Hello')
  },
  websocket: ripple.getHandler()
})

// ✅ CORRECT: Check upgrade first
Bun.serve({
  fetch: (req, server) => {
    if (ripple.upgrade(req, server)) return // WebSocket upgrade
    return new Response('Hello') // HTTP response
  },
  websocket: ripple.getHandler()
})
```

#### 2. Wrong WebSocket path

```typescript
// Server configured with:
new RippleServer({ path: '/ws' })

// Client connecting to:
ws = new WebSocket('ws://localhost:3000/websocket') // ❌ WRONG PATH

// Should be:
ws = new WebSocket('ws://localhost:3000/ws') // ✅ CORRECT
```

#### 3. CORS issues (browser clients)

```typescript
// Add CORS headers for WebSocket handshake
Bun.serve({
  fetch: (req, server) => {
    if (req.headers.get('upgrade') === 'websocket') {
      return ripple.upgrade(req, server) 
        ? undefined 
        : new Response('Upgrade failed', { 
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': '*'
            }
          })
    }
    return new Response('OK')
  },
  websocket: ripple.getHandler()
})
```

### Problem: Connection Drops Immediately After Connecting

**Symptoms**:
- Client connects but disconnects within seconds
- No error message
- `close` event fired immediately after `open`

**Diagnosis**:
```typescript
// Enable debug logging
new RippleServer({
  logLevel: 'debug',
  logger: customLogger
})

// Check close handler logs
```

**Solutions**:

#### 1. Client not sending required messages

Some proxies/load balancers expect activity. Send a ping:

```typescript
// Client-side
ws.onopen = () => {
  setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping' }))
  }, 25000) // Every 25 seconds
}
```

#### 2. Server-side timeout too aggressive

```typescript
new RippleServer({
  pingInterval: 60000 // Increase from default 30s
})
```

---

## Authorization Problems

### Problem: "UNAUTHORIZED" Error on Private Channel

**Symptoms**:
```json
{
  "type": "error",
  "code": "UNAUTHORIZED",
  "message": "You are not authorized to access this channel",
  "channel": "private-orders.123"
}
```

**Diagnosis**:
```typescript
const authorizer: ChannelAuthorizer = (channel, userId, socketId) => {
  console.log('Auth check:', { channel, userId, socketId })
  // Add your auth logic
  const result = /* ... */
  console.log('Auth result:', result)
  return result
}
```

**Common Causes & Solutions**:

#### 1. `userId` is undefined (user not authenticated)

```typescript
// ❌ PROBLEM: userId not set during upgrade
rippleServer.upgrade(req, server)

// ✅ SOLUTION: Pass userId during upgrade
const token = req.headers.get('authorization')
const userId = await validateToken(token) // Your auth logic

rippleServer.upgrade(req, server, userId)
```

#### 2. Authorizer logic incorrect

```typescript
// ❌ WRONG: Always returns false
const authorizer = (channel, userId) => {
  return false // Denies all
}

// ✅ CORRECT: Check channel type and ownership
const authorizer = async (channel, userId, socketId) => {
  // Public channels
  if (!channel.startsWith('private-') && !channel.startsWith('presence-')) {
    return true
  }
  
  // Require authentication for private channels
  if (!userId) return false
  
  // Check ownership for resource channels
  if (channel.startsWith('private-orders.')) {
    const orderId = channel.split('.')[1]
    const order = await db.orders.findById(orderId)
    return order.userId === userId
  }
  
  return true
}
```

#### 3. Async authorizer not awaited

```typescript
// ❌ PROBLEM: Forgetting async/await
const authorizer = (channel, userId) => {
  db.orders.findById(orderId) // Returns Promise, not boolean!
}

// ✅ SOLUTION: Use async/await
const authorizer = async (channel, userId) => {
  const order = await db.orders.findById(orderId)
  return order.userId === userId
}
```

### Problem: Presence Channel Authorization Fails

**Symptoms**:
- Private channels work, but presence channels don't
- Getting `UNAUTHORIZED` on `presence-*` channels

**Solution**:
Presence channels require `PresenceUserInfo` return value, not just `boolean`:

```typescript
// ❌ WRONG: Returns boolean for presence channel
const authorizer = (channel, userId) => {
  if (channel.startsWith('presence-')) {
    return userId !== undefined // Returns boolean
  }
}

// ✅ CORRECT: Return PresenceUserInfo
const authorizer = async (channel, userId) => {
  if (channel.startsWith('presence-')) {
    if (!userId) return false
    
    const user = await db.users.findById(userId)
    return {
      id: user.id,
      info: {
        name: user.name,
        avatar: user.avatarUrl
      }
    }
  }
  return true
}
```

---

## Broadcasting Not Working

### Problem: Messages Not Reaching Clients

**Symptoms**:
- `broadcast()` called but clients don't receive messages
- No errors shown
- Silent failure

**Diagnosis**:
```typescript
// Check if clients are subscribed
const stats = rippleServer.getStats()
console.log('Channel stats:', stats.channels)
console.log('Total connections:', stats.connections)

// Check specific channel
const subscribers = rippleServer.channelManager.getSubscribers('news')
console.log('Subscribers to "news":', subscribers.size)
```

**Common Causes & Solutions**:

#### 1. Clients not subscribed to channel

```typescript
// Client must subscribe first:
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'news'
}))

// Wait for confirmation:
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'subscribed' && msg.channel === 'news') {
    console.log('Successfully subscribed')
  }
}
```

#### 2. Wrong channel name in broadcast

```typescript
// ❌ PROBLEM: Channel mismatch
class NewsPublished extends BroadcastEvent {
  broadcastOn() {
    return new PublicChannel('article') // Broadcasting to 'article'
  }
}

// Client subscribed to 'news', not 'article'!

// ✅ SOLUTION: Match channel names
class NewsPublished extends BroadcastEvent {
  broadcastOn() {
    return new PublicChannel('news') // Match client subscription
  }
}
```

#### 3. Broadcasting before client subscription complete

```typescript
// ❌ PROBLEM: Race condition
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'news' }))
  // Immediately broadcast (subscription not complete yet!)
  broadcast(new NewsPublished(...))
}

// ✅ SOLUTION: Wait for subscription confirmation
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'subscribed' && msg.channel === 'news') {
    // Now safe to broadcast
    broadcast(new NewsPublished(...))
  }
}
```

### Problem: Broadcast Works Locally But Not in Production (Multi-Server)

**Symptoms**:
- LocalDriver: Messages delivered ✅
- RedisDriver: Messages not delivered ❌
- Only clients on the same server receive messages

**Diagnosis**:
```typescript
const health = await fetch('http://server-a/health').then(r => r.json())
console.log('Driver status:', health.driver)
// Should show: { name: 'redis', initialized: true, connected: true }
```

**Solutions**:

#### 1. RedisDriver not initialized

```typescript
// Make sure driver is 'redis', not 'local'
new RippleServer({
  driver: 'redis', // ✅ Must specify redis
  redis: {
    host: process.env.REDIS_HOST,
    port: 6379
  }
})
```

#### 2. Redis connection failed

Check logs for connection errors:
```
[ERROR] Redis connection failed: ECONNREFUSED
```

Verify Redis is accessible:
```bash
redis-cli -h <REDIS_HOST> -p 6379 ping
# Should return: PONG
```

#### 3. Redis authentication required

```typescript
new RippleServer({
  driver: 'redis',
  redis: {
    host: 'redis.example.com',
    port: 6379,
    password: process.env.REDIS_PASSWORD // ✅ Add password
  }
})
```

---

## Redis Driver Issues

### Problem: "REDIS_NOT_INSTALLED" Error

**Error Message**:
```
DRIVER_NOT_INITIALIZED: Redis driver requires 'redis' package
```

**Solution**:
```bash
# Install redis client
bun add redis

# Verify installation
bun pm ls | grep redis
```

### Problem: Redis Connection Timeouts

**Symptoms**:
- Slow message delivery (>5 seconds)
- Intermittent failures
- `REDIS_CONNECTION_FAILED` errors

**Diagnosis**:
```typescript
// Enable Redis client debug logging
import { createClient } from 'redis'

const client = createClient({
  url: 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Reconnect attempt ${retries}`)
      return Math.min(retries * 100, 3000)
    }
  }
})

client.on('error', (err) => console.error('Redis error:', err))
client.on('connect', () => console.log('Redis connected'))
client.on('ready', () => console.log('Redis ready'))
```

**Solutions**:

#### 1. Network latency

Use Redis server in same datacenter/region:
```typescript
redis: {
  host: 'redis.us-east-1.internal', // Same region
  port: 6379
}
```

#### 2. Redis server overloaded

Check Redis stats:
```bash
redis-cli INFO stats
```

Scale Redis if needed (Redis Cluster, Redis Sentinel).

---

## Performance Problems

### Problem: High Message Latency (>100ms)

**Diagnosis**:
```typescript
// Measure broadcast latency
const start = Date.now()
await broadcast(new MyEvent(...))
const latency = Date.now() - start
console.log('Broadcast latency:', latency, 'ms')

// Check connection stats
const stats = rippleServer.getStats()
console.log('Active connections:', stats.connections)
console.log('Channels:', stats.channels)
```

**Common Causes & Solutions**:

#### 1. Slow authorizer callback

```typescript
// ❌ PROBLEM: N+1 query in authorizer
const authorizer = async (channel, userId) => {
  const user = await db.users.findById(userId) // DB query on EVERY subscription!
  return user.isActive
}

// ✅ SOLUTION: Cache authorization results
const authCache = new Map()

const authorizer = async (channel, userId) => {
  const cacheKey = `${userId}:${channel}`
  if (authCache.has(cacheKey)) {
    return authCache.get(cacheKey)
  }
  
  const user = await db.users.findById(userId)
  const result = user.isActive
  authCache.set(cacheKey, result)
  
  // Invalidate cache after 5 minutes
  setTimeout(() => authCache.delete(cacheKey), 300000)
  
  return result
}
```

#### 2. Large payload serialization

```typescript
// ❌ PROBLEM: Sending huge objects
broadcast(new DataSync({
  users: await db.users.findAll(), // 10,000 users!
  orders: await db.orders.findAll() // 50,000 orders!
}))

// ✅ SOLUTION: Paginate or send only necessary data
broadcast(new DataSync({
  userCount: await db.users.count(),
  recentOrders: await db.orders.limit(10).findAll()
}))
```

#### 3. Too many subscribers on one channel

```typescript
// Instead of one massive channel:
channel: 'global-updates' // 100,000 subscribers!

// Use targeted channels:
channel: `region-${userRegion}-updates` // ~1,000 subscribers each
```

### Problem: High CPU Usage

**Diagnosis**:
```bash
# Check CPU usage
top -p $(pgrep -f bun)

# Profile with Bun
bun --inspect server.ts
```

**Solutions**:

#### 1. Too many broadcasts per second

Batch updates:
```typescript
// ❌ PROBLEM: Broadcasting on every DB change
db.on('change', (record) => {
  broadcast(new RecordUpdated(record)) // 1000 broadcasts/sec!
})

// ✅ SOLUTION: Batch updates
let pendingUpdates = []
setInterval(() => {
  if (pendingUpdates.length > 0) {
    broadcast(new BatchUpdate(pendingUpdates))
    pendingUpdates = []
  }
}, 1000) // Broadcast once per second
```

#### 2. Message serialization overhead

Use `MessageSerializer` caching (already built-in):
```typescript
// Ripple automatically caches serialized messages
// No action needed - it's optimized by default
```

---

## Memory Leaks

### Problem: Memory Usage Grows Over Time

**Diagnosis**:
```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage()
  console.log('Memory:', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB'
  })
  
  const stats = rippleServer.getStats()
  console.log('Connections:', stats.connections)
  console.log('Channels:', stats.channels)
}, 10000)
```

**Common Causes & Solutions**:

#### 1. Clients not unsubscribing on disconnect

This is handled automatically by Ripple, but verify:
```typescript
// Check close handler
rippleServer.on('close', (ws) => {
  console.log('Client disconnected:', ws.data.id)
  console.log('Remaining channels:', ws.data.channels.size) // Should be 0
})
```

If channels remain, there's a bug. Report it!

#### 2. Authorization cache never cleared

```typescript
// ❌ PROBLEM: Cache grows indefinitely
const authCache = new Map()
const authorizer = (channel, userId) => {
  authCache.set(`${userId}:${channel}`, result) // Never deleted!
}

// ✅ SOLUTION: Use LRU cache or TTL
import { LRUCache } from 'lru-cache'

const authCache = new LRUCache({
  max: 10000, // Max entries
  ttl: 1000 * 60 * 5 // 5 minute TTL
})
```

#### 3. Presence data not cleaned up

Presence members should be removed on disconnect (handled automatically).

Verify:
```typescript
const presenceMembers = rippleServer.channelManager.getPresenceMembers('presence-chat')
console.log('Presence members:', presenceMembers.size)
// Should match actual online users
```

---

## TypeScript Errors

### Problem: Type Error on `ws.data`

**Error**:
```
Property 'id' does not exist on type 'unknown'
```

**Solution**:
Use `RippleWebSocket` type:
```typescript
import { RippleWebSocket } from '@gravito/ripple'

const handleMessage = (ws: RippleWebSocket, message: string) => {
  console.log(ws.data.id) // ✅ Type-safe
  console.log(ws.data.userId) // ✅ Type-safe
}
```

### Problem: Authorizer Return Type Error

**Error**:
```
Type 'Promise<User>' is not assignable to type 'boolean | PresenceUserInfo | Promise<boolean | PresenceUserInfo | false>'
```

**Solution**:
Return correct type for channel type:
```typescript
// ✅ CORRECT: Return types match channel types
const authorizer: ChannelAuthorizer = async (channel, userId) => {
  if (channel.startsWith('presence-')) {
    return {
      id: userId!,
      info: { name: '...' }
    } // PresenceUserInfo
  }
  
  return userId !== undefined // boolean
}
```

---

## Debugging Tools

### Enable Debug Logging

```typescript
import { RippleLogger, LogLevel } from '@gravito/ripple'

const logger: RippleLogger = {
  debug: (msg, ctx) => console.log('[DEBUG]', msg, ctx),
  info: (msg, ctx) => console.log('[INFO]', msg, ctx),
  warn: (msg, ctx) => console.warn('[WARN]', msg, ctx),
  error: (msg, ctx) => console.error('[ERROR]', msg, ctx)
}

new RippleServer({
  logger,
  logLevel: 'debug' // Log everything
})
```

### Health Check Endpoint

```typescript
// Add health check
new RippleServer({
  healthCheck: {
    enabled: true,
    path: '/health'
  }
})

// Query health status
const health = await fetch('http://localhost:3000/health').then(r => r.json())
console.log(health)
/*
{
  "status": "healthy",
  "driver": {
    "name": "redis",
    "initialized": true,
    "connected": true
  },
  "stats": {
    "totalConnections": 1234,
    "activeConnections": 890,
    "totalChannels": 45
  }
}
*/
```

### Connection Tracker

```typescript
import { ConnectionTracker } from '@gravito/ripple'

const tracker = new ConnectionTracker()

new RippleServer({
  connectionTracker: tracker
})

// Query connection stats
setInterval(() => {
  const stats = tracker.getStats()
  console.log('Connection stats:', stats)
}, 10000)
```

### WebSocket Network Inspector (Browser)

1. Open Chrome DevTools
2. Go to **Network** tab
3. Filter by **WS** (WebSocket)
4. Click on WebSocket connection
5. View **Messages** tab to see all traffic

### Bun Debugger

```bash
# Start with inspector
bun --inspect server.ts

# Open chrome://inspect in Chrome
# Click "inspect" next to your Bun process

# Set breakpoints in your code
```

---

## Getting Help

If you're still stuck after trying these solutions:

1. **Check the logs**: Enable debug logging first
2. **Check GitHub Issues**: https://github.com/your-repo/gravito/issues
3. **Minimal Reproduction**: Create a minimal example that reproduces the issue
4. **Include details**:
   - Ripple version
   - Bun version
   - Driver (local/redis)
   - Error messages
   - Code snippets

**Good Issue Example**:
```
Title: WebSocket connection fails with "Upgrade failed" error

Ripple Version: 3.0.0
Bun Version: 1.0.25
Driver: local

Description:
When I try to connect via WebSocket, I get "Upgrade failed". 
HTTP endpoint works fine.

Code:
```typescript
// ... minimal reproduction code ...
```

Error:
```
Upgrade failed
```

What I tried:
- Checked path matches client URL
- Verified upgrade() is called before Response
- Enabled debug logging (see attached)
```

---

**Still having issues? Open an issue on GitHub with details above!**
