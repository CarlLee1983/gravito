# Distributed Sessions Guide

Statelessness is a goal, but state is often a requirement. `@gravito/pulsar` provides the infrastructure to manage user state reliably in a distributed **Galaxy Architecture**.

## 1. Choosing the Right Storage Driver

The choice of driver determines how your Galaxy scales.

- **Redis (via Plasma)**: **Recommended for production.** Allows all Satellite instances to share the same session pool with sub-millisecond latency.
- **SQLite**: Good for single-node deployments or edge environments where a central Redis isn't available.
- **File**: Only suitable for legacy environments or simple local tools.
- **Memory**: For testing only. Data disappears when the process restarts.

## 2. Shared Sessions across Satellites

In a Galaxy, a user might login via the `Membership` Satellite but their session data must be accessible to the `Shop` Satellite.

- **Standard SID Cookie**: Ensure all your Satellites are under the same root domain or use a shared cookie domain configuration.
- **Global Data**: Store non-sensitive preferences in the session.
- **Scoped Data**: Use naming conventions (e.g., `shop:last_viewed_id`) to avoid key collisions between satellites.

## 3. Distributed CSRF Protection

CSRF tokens must be verifiable across nodes.

- **Persistent Tokens**: Pulsar stores the CSRF secret within the persistent session (e.g., in Redis).
- **Stateless Verification**: Optionally, Pulsar can be configured to use signed HMAC tokens that don't require a database lookup, though persistent sessions are the standard for Gravito.

## 4. Flash Data Propagation

Flash data is designed to survive for exactly one more request. This is useful for "Redirect with Success Message" patterns common in Satellites.

```typescript
// Satellite A (Action)
session.flash('status', 'Settings Saved')
return c.redirect('/settings')

// Satellite B (View)
const msg = session.getFlash('status') // 'Settings Saved'
// The key 'status' is now deleted from storage.
```

## 5. Session Security Best Practices

- **ID Rotation**: Always call `session.regenerate()` after a user logs in to prevent session fixation attacks.
- **Secure Cookies**: In production, ensure `cookie.secure` is `true` and `cookie.httpOnly` is `true`.
- **Idle Timeout**: Set a reasonable `idleTimeoutSeconds` (e.g., 3600 for 1 hour) to auto-expire inactive sessions.
