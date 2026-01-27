# ADR-002: Channel Authorization Model

**Status**: Accepted  
**Date**: 2025-01-24  
**Decision Makers**: Gravito Core Team  
**Stakeholders**: Framework users, Security team  

## Context and Problem Statement

WebSocket broadcasting requires a secure authorization mechanism to control which clients can subscribe to which channels. Different use cases demand different authorization patterns:

- **Public channels**: No auth needed (e.g., `news`, `system-status`)
- **Private channels**: User-specific data (e.g., `private-orders.{userId}`)
- **Presence channels**: Online user tracking with metadata (e.g., `presence-chat.{roomId}`)

Key requirements:
1. **Security**: Prevent unauthorized channel access
2. **Flexibility**: Support diverse authorization logic (DB lookups, RBAC, ownership checks)
3. **Performance**: Minimal authorization overhead
4. **Developer Experience**: Simple, intuitive API
5. **Type Safety**: Clear types, compile-time guarantees

## Decision Drivers

- **Security First**: Channels may contain sensitive data (user orders, private messages)
- **Zero Trust**: Never assume client-provided data is trustworthy
- **Flexibility**: Every app has different auth requirements
- **Performance**: Auth check on every subscription attempt
- **Simplicity**: Avoid complex auth protocols when possible
- **Familiarity**: Leverage patterns developers already know (Laravel Echo influence)

## Considered Options

### Option 1: Signature-Based Authentication (Laravel Echo style)
**Approach**: Client requests signature from HTTP endpoint, includes in subscription request

```typescript
// Client-side
const signature = await fetch('/broadcasting/auth', {
  method: 'POST',
  body: JSON.stringify({ socket_id: socketId, channel_name: channel })
})

ws.send({
  type: 'subscribe',
  channel: 'private-orders.123',
  auth: { socket_id: socketId, signature: signature.auth }
})

// Server-side: Verify signature matches expected HMAC
```

**Pros**:
- ✅ Stateless (no server-side session)
- ✅ Time-limited signatures possible
- ✅ Industry-standard pattern (Laravel, Pusher)

**Cons**:
- ❌ Requires separate HTTP endpoint
- ❌ Additional network round-trip
- ❌ HMAC key management complexity
- ❌ Client must implement signature request flow
- ❌ Harder to debug signature mismatches

### Option 2: JWT Token-Based Authentication
**Approach**: Client includes JWT in WebSocket handshake or subscription message

```typescript
// Client-side
ws.send({
  type: 'subscribe',
  channel: 'private-orders.123',
  token: jwtToken
})

// Server-side: Verify JWT, extract userId, check ownership
```

**Pros**:
- ✅ Industry-standard (OAuth 2.0 / JWT)
- ✅ Stateless authentication
- ✅ Can include user metadata in token

**Cons**:
- ❌ JWT verification overhead on every subscription
- ❌ Token expiration management
- ❌ Requires JWT library dependency
- ❌ Overkill for simple authorization

### Option 3: Server-Side Callback (CHOSEN)
**Approach**: Application provides a callback function for authorization logic

```typescript
// Server-side configuration
const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
  // Public channel
  if (!channel.startsWith('private-') && !channel.startsWith('presence-')) {
    return true
  }
  
  // Private channel - check ownership
  if (channel.startsWith('private-orders.')) {
    const orderId = channel.split('.')[1]
    const order = await db.orders.findById(orderId)
    return order.userId === userId
  }
  
  // Presence channel - return user info
  if (channel.startsWith('presence-')) {
    const user = await db.users.findById(userId)
    return {
      id: user.id,
      info: { name: user.name, avatar: user.avatarUrl }
    }
  }
  
  return false
}
```

**Pros**:
- ✅ Maximum flexibility (any logic possible)
- ✅ No external HTTP calls needed
- ✅ Direct database access
- ✅ Type-safe with TypeScript
- ✅ Easy to debug (inline code)
- ✅ Async-friendly (database lookups)
- ✅ Simple API surface

**Cons**:
- ⚠️ Developer must implement authorization logic
- ⚠️ Performance depends on developer's implementation

### Option 4: Access Control List (ACL) Configuration
**Approach**: Declarative ACL rules in configuration

```typescript
const acl = {
  'news': { public: true },
  'private-orders.*': { requireOwnership: true, ownerField: 'userId' },
  'presence-chat.*': { requireAuth: true, includeUserInfo: true }
}
```

**Pros**:
- ✅ Declarative, configuration-driven
- ✅ No code needed for common patterns

**Cons**:
- ❌ Limited to predefined patterns
- ❌ Complex ACL syntax for edge cases
- ❌ Hard to extend for custom logic
- ❌ Less flexibility than callback approach

## Decision Outcome

**Chosen Option**: **Server-Side Callback** (Option 3)

### Rationale

1. **Flexibility Without Complexity**:
   - Developers write standard TypeScript/JavaScript
   - Any authorization logic possible (DB, Redis, API calls)
   - No need to learn custom DSL or ACL syntax
   - Easy to test (standard function testing)

2. **Performance Control**:
   - Developers optimize their own auth logic
   - Can cache authorization results
   - Can batch database queries
   - No framework-imposed overhead

3. **Type Safety**:
   - TypeScript enforces callback signature
   - Return type drives behavior (boolean vs PresenceUserInfo)
   - Compile-time errors for incorrect usage

4. **Developer Experience**:
   - Familiar pattern (callback-based)
   - Inline with application code (no separate config)
   - Easy to debug (step through code)
   - Clear error messages

5. **Security**:
   - Authorization happens server-side (trusted code)
   - No client involvement in auth logic
   - No token/signature leakage risk
   - Full access to application context

### Type Signature

```typescript
type ChannelAuthorizer = (
  channelName: string,
  userId: string | number | undefined,
  socketId: string
) => 
  | boolean                           // Public/Private channels
  | Promise<boolean>                  // Async auth check
  | PresenceUserInfo                  // Presence channels
  | Promise<PresenceUserInfo | false> // Async presence auth

interface PresenceUserInfo {
  id: string | number
  info: Record<string, unknown>
}
```

## Channel Type Conventions

### Public Channels
- **Name Pattern**: No prefix (e.g., `news`, `updates`)
- **Authorization**: Always `return true` or omit from authorizer
- **Use Case**: Global broadcasts, system notifications

### Private Channels
- **Name Pattern**: `private-` prefix (e.g., `private-orders.123`)
- **Authorization**: Return `boolean` (true = authorized, false = denied)
- **Use Case**: User-specific data, resource ownership

### Presence Channels
- **Name Pattern**: `presence-` prefix (e.g., `presence-chat.lobby`)
- **Authorization**: Return `PresenceUserInfo` object or `false`
- **Use Case**: Online user tracking, collaborative features
- **Events**: `join`, `leave`, `members` broadcasted to channel

## Implementation Details

### Authorization Flow

```
┌─────────────────────────────────────────────────────┐
│ Client: ws.send({ type: 'subscribe', channel: ... })│
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ MessageHandler: Parse & validate message            │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ ChannelManager: Determine channel type              │
│   - Public:   no prefix                             │
│   - Private:  'private-' prefix                     │
│   - Presence: 'presence-' prefix                    │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ Call authorizer(channelName, userId, socketId)      │
│                                                      │
│ Public Channel:                                     │
│   return true  ────────────────────┐                │
│                                     │                │
│ Private Channel:                    │                │
│   return userId !== undefined ──┐  │                │
│   return order.userId === userId │  │                │
│                                  │  │                │
│ Presence Channel:                │  │                │
│   return {                       │  │                │
│     id: user.id,                 │  │                │
│     info: { name, avatar }       │  │                │
│   } ──────────────────────────┐  │  │                │
│                               │  │  │                │
│   return false (denied) ──────┼──┼──┼──┐            │
└───────────────────────────────┼──┼──┼──┼────────────┘
                                │  │  │  │
                      ┌─────────┘  │  │  │
                      │  ┌─────────┘  │  │
                      │  │  ┌─────────┘  │
                      │  │  │  ┌─────────┘
                      ▼  ▼  ▼  ▼
         ┌──────────────────────────────────────┐
         │ Authorized?                          │
         └──┬────────────────────────┬──────────┘
            │ YES                    │ NO
            ▼                        ▼
   ┌────────────────────┐   ┌─────────────────┐
   │ Add to channel     │   │ Send error      │
   │ Send 'subscribed'  │   │ Close if needed │
   │ For presence:      │   └─────────────────┘
   │   Send 'join'      │
   └────────────────────┘
```

### Error Handling

```typescript
// Authorization denied
ws.send({
  type: 'error',
  code: 'UNAUTHORIZED',
  message: 'You are not authorized to access this channel',
  channel: 'private-orders.123'
})

// Invalid channel format
ws.send({
  type: 'error',
  code: 'INVALID_FORMAT',
  message: 'Channel name is invalid',
  channel: 'malformed%%%channel'
})
```

### Example Implementations

#### Basic Resource Ownership
```typescript
const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
  // Pattern: private-{resource}.{id}
  const match = channel.match(/^private-(\\w+)\\.(\\d+)$/)
  if (match) {
    const [, resource, id] = match
    const record = await db[resource].findById(id)
    return record?.userId === userId
  }
  return true // Public channel
}
```

#### Role-Based Access Control (RBAC)
```typescript
const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
  if (channel === 'private-admin') {
    const user = await db.users.findById(userId)
    return user?.role === 'admin'
  }
  
  if (channel.startsWith('private-team.')) {
    const teamId = channel.split('.')[1]
    return await db.teamMembers.exists({ teamId, userId })
  }
  
  return userId !== undefined
}
```

#### Presence with Rich User Data
```typescript
const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
  if (channel.startsWith('presence-')) {
    if (!userId) return false
    
    const user = await db.users.findById(userId)
    if (!user) return false
    
    return {
      id: user.id,
      info: {
        name: user.name,
        avatar: user.avatarUrl,
        role: user.role,
        status: user.onlineStatus,
        lastSeen: user.lastSeenAt
      }
    }
  }
  
  return true
}
```

## Trade-offs Accepted

### Callback Implementation Responsibility
**Trade-off**: Developers must write authorization logic

**Mitigation**:
- Provide comprehensive examples in docs
- Type system guides correct implementation
- Common patterns documented
- Test helpers for authorization testing

### Performance Depends on Implementation
**Trade-off**: Slow authorizer = slow subscriptions

**Mitigation**:
- Document performance best practices
- Recommend caching strategies
- Provide profiling tools
- Warn about N+1 query patterns

### No Built-in Rate Limiting
**Trade-off**: Malicious clients can spam subscription attempts

**Mitigation**:
- Recommend connection-level rate limiting
- Document rate limiting patterns
- Future: Add optional built-in rate limiter

## Security Considerations

### ✅ Secure Patterns

1. **Server-Side Only**: Auth logic runs on server (trusted environment)
2. **No Client Secrets**: No keys/tokens sent to client
3. **Granular Control**: Per-channel, per-user authorization
4. **Async-Friendly**: Supports database/API lookups
5. **Fail-Closed**: Default deny if authorizer throws error

### ⚠️ Developer Responsibilities

1. **Validate userId**: Check if user is authenticated
   ```typescript
   if (!userId) return false // ✅ Require auth
   ```

2. **Verify Ownership**: Check resource belongs to user
   ```typescript
   const order = await db.orders.findById(orderId)
   return order.userId === userId // ✅ Ownership check
   ```

3. **Sanitize Channel Names**: Prevent injection attacks
   ```typescript
   if (!/^[a-z0-9.-]+$/.test(channel)) return false // ✅ Validate format
   ```

4. **Rate Limit**: Prevent subscription spam
   ```typescript
   // Track subscription attempts per client
   ```

5. **Audit Logging**: Log authorization failures
   ```typescript
   if (!authorized) {
     logger.warn('Unauthorized subscription attempt', { userId, channel })
   }
   ```

## Performance Considerations

### Optimization Strategies

1. **Cache Authorization Results**:
   ```typescript
   const authCache = new Map<string, boolean>()
   
   const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
     const cacheKey = `${userId}:${channel}`
     if (authCache.has(cacheKey)) {
       return authCache.get(cacheKey)!
     }
     
     const result = await checkAuthorization(channel, userId)
     authCache.set(cacheKey, result)
     return result
   }
   ```

2. **Batch Database Queries**:
   ```typescript
   // Bad: N queries
   const authorized = await Promise.all(
     channels.map(ch => db.teamMembers.exists({ teamId: ch, userId }))
   )
   
   // Good: 1 query
   const memberships = await db.teamMembers.findMany({ userId })
   const teamIds = new Set(memberships.map(m => m.teamId))
   ```

3. **Early Returns**:
   ```typescript
   // Check cheap conditions first
   if (!userId) return false // ✅ Fast check
   
   // Then expensive checks
   const user = await db.users.findById(userId) // Database query
   return user.role === 'admin'
   ```

## Consequences

### Positive

- ✅ **Maximum flexibility**: Any authorization logic possible
- ✅ **Type-safe**: Compile-time guarantees
- ✅ **Simple API**: Single callback function
- ✅ **Easy debugging**: Standard TypeScript code
- ✅ **No external deps**: No signature libraries needed
- ✅ **Performance control**: Developers optimize their logic

### Negative

- ❌ **Implementation burden**: Developers write auth logic
- ⚠️ **Performance varies**: Slow callback = slow subscriptions
- ⚠️ **Security responsibility**: Developers must follow best practices

### Neutral

- 🔶 **Stateful**: Relies on userId from session (already available in Gravito)
- 🔶 **Callback-based**: Familiar to JavaScript developers

## Validation

### Security Checklist
- [x] Authorization runs server-side only
- [x] No client secrets required
- [x] Fail-closed on errors
- [x] Type-safe return values
- [x] Support for async authorization
- [x] Channel type enforcement
- [x] Presence user info validated

### Developer Experience Checklist
- [x] Simple callback signature
- [x] Type inference works
- [x] Error messages clear
- [x] Examples provided
- [x] Test helpers available
- [x] Performance guidance documented

## References

- [Laravel Broadcasting Authorization](https://laravel.com/docs/broadcasting#authorizing-channels)
- [Pusher Channel Authentication](https://pusher.com/docs/channels/server_api/authenticating-users/)
- [WebSocket Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [Gravito Authentication](../../../sentinel/README.md)

## Revision History

- **2025-01-24**: Initial decision document
- **Decision**: Server-side callback chosen over signature-based, JWT, ACL approaches
- **Status**: Implemented in @gravito/ripple v3.0.0
