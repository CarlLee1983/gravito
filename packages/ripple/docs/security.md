# @gravito/ripple Security Guide

Best practices and security considerations for deploying WebSocket broadcasting securely.

## Table of Contents

- [Security Model Overview](#security-model-overview)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Channel Security](#channel-security)
- [Input Validation](#input-validation)
- [Rate Limiting](#rate-limiting)
- [CORS and Origin Validation](#cors-and-origin-validation)
- [Transport Security](#transport-security)
- [Data Sanitization](#data-sanitization)
- [Monitoring and Auditing](#monitoring-and-auditing)
- [Security Checklist](#security-checklist)

---

## Security Model Overview

@gravito/ripple implements a **defense-in-depth** security model:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Transport Security (TLS)                       │
│   - Encrypted WebSocket (wss://)                        │
│   - Certificate validation                              │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Layer 2: Connection Authentication                      │
│   - User identity verification                          │
│   - Session validation                                  │
│   - Token-based auth                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Layer 3: Channel Authorization                          │
│   - Per-channel access control                          │
│   - Resource ownership verification                     │
│   - Role-based permissions                              │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Layer 4: Input Validation                               │
│   - Message format validation                           │
│   - Channel name sanitization                           │
│   - Payload size limits                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Layer 5: Rate Limiting                                  │
│   - Connection limits                                   │
│   - Subscription limits                                 │
│   - Message rate limits                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Authentication

### ✅ Secure: Authenticate Users Before WebSocket Upgrade

**Always validate user identity before upgrading to WebSocket:**

```typescript
import { verifyJWT } from '@gravito/sentinel' // Or your auth library

Bun.serve({
  fetch: async (req, server) => {
    if (req.headers.get('upgrade') === 'websocket') {
      // ✅ SECURE: Verify authentication
      const token = req.headers.get('authorization')?.replace('Bearer ', '')
      
      if (!token) {
        return new Response('Unauthorized', { status: 401 })
      }
      
      try {
        const payload = await verifyJWT(token)
        const userId = payload.sub
        
        // Pass authenticated userId to WebSocket
        rippleServer.upgrade(req, server, userId)
        return
      } catch (error) {
        return new Response('Invalid token', { status: 401 })
      }
    }
    
    return new Response('Not found', { status: 404 })
  },
  websocket: rippleServer.getHandler()
})
```

### ❌ Insecure: Trusting Client-Provided User IDs

```typescript
// ❌ NEVER DO THIS: Client can claim to be any user
const message = JSON.parse(data)
const userId = message.userId // Client can fake this!
```

### Session-Based Authentication Example

```typescript
import { getSession } from './session'

Bun.serve({
  fetch: async (req, server) => {
    if (req.headers.get('upgrade') === 'websocket') {
      // Get session from cookie
      const sessionId = req.headers.get('cookie')
        ?.split(';')
        .find(c => c.trim().startsWith('session='))
        ?.split('=')[1]
      
      if (!sessionId) {
        return new Response('No session', { status: 401 })
      }
      
      const session = await getSession(sessionId)
      
      if (!session || !session.userId) {
        return new Response('Invalid session', { status: 401 })
      }
      
      rippleServer.upgrade(req, server, session.userId)
      return
    }
    
    return new Response('OK')
  },
  websocket: rippleServer.getHandler()
})
```

---

## Authorization

### ✅ Secure: Server-Side Authorization Logic

**Never trust client-side authorization checks:**

```typescript
const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
  // ✅ SECURE: Server validates ownership
  if (channel.startsWith('private-orders.')) {
    const orderId = channel.split('.')[1]
    
    // Verify user owns this order
    const order = await db.orders.findOne({
      where: { id: orderId, userId }
    })
    
    return order !== null
  }
  
  // ✅ SECURE: Server validates team membership
  if (channel.startsWith('private-team.')) {
    const teamId = channel.split('.')[1]
    
    const membership = await db.teamMembers.findOne({
      where: { teamId, userId }
    })
    
    return membership !== null
  }
  
  return false // Deny by default
}
```

### ❌ Insecure: No Authorization Checks

```typescript
// ❌ NEVER DO THIS: Allows anyone to subscribe to any channel
const authorizer = (channel, userId) => {
  return true // Allows access to ALL channels!
}
```

### ❌ Insecure: Client-Controlled Authorization

```typescript
// ❌ NEVER DO THIS: Client can bypass checks
const authorizer = (channel, userId) => {
  // Client sends "isOwner" flag in message
  return message.isOwner // Client controls this!
}
```

### Defense-in-Depth: Multiple Authorization Checks

```typescript
const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
  // Check 1: User must be authenticated
  if (!userId) {
    logger.warn('Unauthorized subscription attempt', { channel, socketId })
    return false
  }
  
  // Check 2: User account must be active
  const user = await db.users.findById(userId)
  if (!user || user.status !== 'active') {
    logger.warn('Inactive user subscription attempt', { userId, channel })
    return false
  }
  
  // Check 3: Resource ownership verification
  if (channel.startsWith('private-orders.')) {
    const orderId = channel.split('.')[1]
    const order = await db.orders.findById(orderId)
    
    if (!order) {
      logger.warn('Non-existent order access attempt', { userId, orderId })
      return false
    }
    
    if (order.userId !== userId) {
      logger.warn('Unauthorized order access attempt', { 
        userId, 
        orderId, 
        ownerId: order.userId 
      })
      return false
    }
    
    return true
  }
  
  // Check 4: Role-based access for admin channels
  if (channel === 'private-admin') {
    return user.role === 'admin'
  }
  
  return false // Deny by default
}
```

---

## Channel Security

### Channel Naming Best Practices

#### ✅ Secure Patterns

```typescript
// Include unique identifiers
'private-orders.{orderId}'
'private-user.{userId}'
'presence-chat.{roomId}'

// Use namespacing
'private-{resource}.{id}'
'presence-{feature}.{identifier}'
```

#### ❌ Insecure Patterns

```typescript
// ❌ Generic channels leak data to wrong users
'orders' // Which orders? All orders?!

// ❌ Predictable patterns enable guessing attacks
'order-1', 'order-2', 'order-3' // Easy to guess

// ❌ No access control
'admin' // Anyone can subscribe!
```

### Prevent Channel Enumeration Attacks

```typescript
// ❌ VULNERABLE: Reveals existence of resources
const authorizer = async (channel, userId) => {
  if (channel.startsWith('private-orders.')) {
    const orderId = channel.split('.')[1]
    const order = await db.orders.findById(orderId)
    
    if (!order) {
      return false // Reveals "order doesn't exist"
    }
    
    return order.userId === userId // Reveals "order exists but not yours"
  }
}

// ✅ SECURE: Constant-time response (doesn't leak existence)
const authorizer = async (channel, userId) => {
  if (channel.startsWith('private-orders.')) {
    const orderId = channel.split('.')[1]
    
    // Single query: returns order ONLY if user owns it
    const order = await db.orders.findOne({
      where: { id: orderId, userId }
    })
    
    return order !== null // Same response whether order doesn't exist or not owned
  }
}
```

### Use UUIDs for Unpredictable Channel Names

```typescript
// ✅ SECURE: UUIDs are unguessable
'private-orders.550e8400-e29b-41d4-a716-446655440000'

// ❌ INSECURE: Sequential IDs are guessable
'private-orders.1234' // Attacker tries 1235, 1236, 1237...
```

---

## Input Validation

### Validate Channel Names

```typescript
const authorizer: ChannelAuthorizer = (channel, userId, socketId) => {
  // ✅ SECURE: Validate channel name format
  const channelRegex = /^[a-z0-9.-]+$/i
  
  if (!channelRegex.test(channel)) {
    logger.warn('Invalid channel name', { channel, userId })
    return false
  }
  
  // ✅ SECURE: Limit channel name length
  if (channel.length > 200) {
    logger.warn('Channel name too long', { channel, userId })
    return false
  }
  
  // Proceed with authorization logic...
}
```

### Prevent Injection Attacks

```typescript
// ❌ VULNERABLE: SQL injection via channel name
const authorizer = async (channel, userId) => {
  const orderId = channel.split('.')[1]
  
  // SQL injection risk!
  const result = await db.query(
    `SELECT * FROM orders WHERE id = ${orderId} AND user_id = ${userId}`
  )
  
  return result.length > 0
}

// ✅ SECURE: Use parameterized queries
const authorizer = async (channel, userId) => {
  const orderId = channel.split('.')[1]
  
  const result = await db.query(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId] // Parameterized
  )
  
  return result.length > 0
}

// ✅ EVEN BETTER: Use ORM with type safety
const authorizer = async (channel, userId) => {
  const orderId = channel.split('.')[1]
  
  const order = await db.orders.findOne({
    where: { id: orderId, userId } // Type-safe
  })
  
  return order !== null
}
```

### Limit Payload Sizes

```typescript
import { RippleServer } from '@gravito/ripple'

const rippleServer = new RippleServer({
  // ... other config
})

// Bun's WebSocket automatically limits message size
// Default: 16MB (configurable via Bun)

Bun.serve({
  websocket: {
    ...rippleServer.getHandler(),
    maxPayloadLength: 1024 * 1024, // ✅ Limit to 1MB
  }
})
```

---

## Rate Limiting

### Connection Rate Limiting

```typescript
const connectionAttempts = new Map<string, number[]>()

Bun.serve({
  fetch: (req, server) => {
    if (req.headers.get('upgrade') === 'websocket') {
      const ip = server.requestIP(req)?.address || 'unknown'
      
      // Track connection attempts
      const now = Date.now()
      const attempts = connectionAttempts.get(ip) || []
      
      // Keep only attempts in last minute
      const recentAttempts = attempts.filter(t => now - t < 60000)
      
      // ✅ SECURE: Limit to 10 connections per minute per IP
      if (recentAttempts.length >= 10) {
        return new Response('Too many connections', { status: 429 })
      }
      
      recentAttempts.push(now)
      connectionAttempts.set(ip, recentAttempts)
      
      return rippleServer.upgrade(req, server)
    }
    
    return new Response('OK')
  },
  websocket: rippleServer.getHandler()
})
```

### Subscription Rate Limiting

```typescript
const subscriptionCounts = new Map<string, number>()

const authorizer: ChannelAuthorizer = (channel, userId, socketId) => {
  const key = `${socketId}:subscriptions`
  const count = subscriptionCounts.get(key) || 0
  
  // ✅ SECURE: Limit to 50 channels per connection
  if (count >= 50) {
    logger.warn('Subscription limit exceeded', { socketId, count })
    return false
  }
  
  subscriptionCounts.set(key, count + 1)
  
  // Proceed with authorization...
  return true
}

// Clean up on disconnect
rippleServer.on('close', (ws) => {
  subscriptionCounts.delete(`${ws.data.id}:subscriptions`)
})
```

### Message Rate Limiting (Whispers)

```typescript
const messageCounts = new Map<string, number[]>()

// In message handler
const handleWhisper = (ws: RippleWebSocket, message: any) => {
  const now = Date.now()
  const messages = messageCounts.get(ws.data.id) || []
  
  // Keep only messages in last 10 seconds
  const recentMessages = messages.filter(t => now - t < 10000)
  
  // ✅ SECURE: Limit to 20 messages per 10 seconds
  if (recentMessages.length >= 20) {
    ws.send(JSON.stringify({
      type: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many messages'
    }))
    return
  }
  
  recentMessages.push(now)
  messageCounts.set(ws.data.id, recentMessages)
  
  // Process whisper...
}
```

---

## CORS and Origin Validation

### Validate WebSocket Origin

```typescript
Bun.serve({
  fetch: (req, server) => {
    if (req.headers.get('upgrade') === 'websocket') {
      const origin = req.headers.get('origin')
      
      // ✅ SECURE: Whitelist allowed origins
      const allowedOrigins = [
        'https://yourdomain.com',
        'https://app.yourdomain.com'
      ]
      
      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push('http://localhost:3000')
      }
      
      if (!origin || !allowedOrigins.includes(origin)) {
        logger.warn('Rejected WebSocket from unauthorized origin', { origin })
        return new Response('Forbidden', { status: 403 })
      }
      
      return rippleServer.upgrade(req, server)
    }
    
    return new Response('OK')
  },
  websocket: rippleServer.getHandler()
})
```

### CORS Headers for HTTP Endpoints

```typescript
Bun.serve({
  fetch: (req, server) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://yourdomain.com',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Authorization',
          'Access-Control-Max-Age': '86400'
        }
      })
    }
    
    // WebSocket upgrade with origin check...
  },
  websocket: rippleServer.getHandler()
})
```

---

## Transport Security

### ✅ Always Use WSS (WebSocket Secure) in Production

```typescript
// ✅ PRODUCTION: Always use wss://
const ws = new WebSocket('wss://api.yourdomain.com/ws')

// ❌ DEVELOPMENT ONLY: Never use ws:// in production
const ws = new WebSocket('ws://localhost:3000/ws')
```

### TLS Configuration

```typescript
import { readFileSync } from 'fs'

Bun.serve({
  port: 443,
  // ✅ SECURE: TLS certificates
  tls: {
    key: readFileSync('./certs/private-key.pem'),
    cert: readFileSync('./certs/certificate.pem')
  },
  fetch: (req, server) => {
    // Your handlers...
  },
  websocket: rippleServer.getHandler()
})
```

### Redirect HTTP to HTTPS

```typescript
// HTTP server (port 80)
Bun.serve({
  port: 80,
  fetch: (req) => {
    const url = new URL(req.url)
    return Response.redirect(`https://${url.host}${url.pathname}`, 301)
  }
})

// HTTPS server (port 443)
Bun.serve({
  port: 443,
  tls: { /* ... */ },
  fetch: (req, server) => {
    // Your handlers...
  },
  websocket: rippleServer.getHandler()
})
```

---

## Data Sanitization

### Sanitize Broadcast Payloads

```typescript
// ❌ DANGEROUS: Broadcasting raw user input
class CommentPosted extends BroadcastEvent {
  constructor(public comment: any) { // Unsanitized!
    super()
  }
  
  broadcastWith() {
    return this.comment // May contain malicious scripts
  }
}

// ✅ SECURE: Sanitize user input
import DOMPurify from 'isomorphic-dompurify'

class CommentPosted extends BroadcastEvent {
  constructor(public comment: { text: string; userId: number }) {
    super()
  }
  
  broadcastWith() {
    return {
      text: DOMPurify.sanitize(this.comment.text), // Remove XSS
      userId: this.comment.userId
    }
  }
}
```

### Avoid Leaking Sensitive Data

```typescript
// ❌ DANGEROUS: Broadcasting entire user object
class UserUpdated extends BroadcastEvent {
  constructor(public user: User) {
    super()
  }
  
  broadcastWith() {
    return this.user // Includes password hash, email, etc.!
  }
}

// ✅ SECURE: Only broadcast safe fields
class UserUpdated extends BroadcastEvent {
  constructor(public user: User) {
    super()
  }
  
  broadcastWith() {
    return {
      id: this.user.id,
      name: this.user.name,
      avatar: this.user.avatarUrl
      // No password, email, phone, etc.
    }
  }
}
```

---

## Monitoring and Auditing

### Audit Logging

```typescript
const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
  const authorized = /* ... authorization logic ... */
  
  // ✅ SECURE: Log authorization attempts
  logger.info('Channel authorization attempt', {
    channel,
    userId,
    socketId,
    authorized,
    timestamp: new Date().toISOString()
  })
  
  // Alert on suspicious patterns
  if (!authorized && channel.startsWith('private-admin')) {
    logger.warn('SECURITY: Unauthorized admin access attempt', {
      userId,
      socketId,
      ip: /* ... */
    })
    
    // Optional: Alert security team
    await alertSecurityTeam({ userId, channel, socketId })
  }
  
  return authorized
}
```

### Monitor Anomalies

```typescript
// Detect rapid subscription attempts (potential attack)
const rapidSubscriptions = new Map<string, number>()

setInterval(() => {
  for (const [socketId, count] of rapidSubscriptions.entries()) {
    if (count > 100) {
      logger.warn('SECURITY: Rapid subscription attempts detected', {
        socketId,
        count
      })
      
      // Optional: Disconnect abusive client
      const ws = rippleServer.channelManager.getClient(socketId)
      ws?.close(1008, 'Policy violation')
    }
  }
  rapidSubscriptions.clear()
}, 60000) // Check every minute
```

---

## Security Checklist

### Pre-Deployment Checklist

- [ ] **Authentication**: Users authenticated before WebSocket upgrade
- [ ] **Authorization**: Channel access verified server-side
- [ ] **TLS/SSL**: Using `wss://` in production
- [ ] **Origin Validation**: WebSocket origin whitelist configured
- [ ] **Input Validation**: Channel names and payloads validated
- [ ] **Rate Limiting**: Connection and message rate limits in place
- [ ] **Audit Logging**: Authorization attempts logged
- [ ] **Error Handling**: No sensitive data in error messages
- [ ] **Data Sanitization**: User input sanitized before broadcasting
- [ ] **CORS**: Proper CORS headers for HTTP endpoints

### Code Review Checklist

- [ ] No client-provided user IDs trusted
- [ ] No authorization logic on client side
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities in broadcasts
- [ ] No sensitive data leaked in payloads
- [ ] No predictable channel names
- [ ] Proper error messages (no information leakage)
- [ ] Rate limiting implemented
- [ ] Audit logging for security events

### Testing Checklist

- [ ] Test unauthorized access attempts
- [ ] Test channel enumeration protection
- [ ] Test rate limiting effectiveness
- [ ] Test origin validation
- [ ] Test input validation edge cases
- [ ] Test TLS configuration
- [ ] Penetration testing performed

---

## Security Resources

- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [WebSocket Protocol Security Considerations (RFC 6455 Section 10)](https://datatracker.ietf.org/doc/html/rfc6455#section-10)
- [Bun Security Documentation](https://bun.sh/docs/runtime/security)

---

**Security is a continuous process. Review and update security measures regularly.**

If you discover a security vulnerability, please report it responsibly to the Gravito security team.
