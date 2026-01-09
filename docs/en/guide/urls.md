---
title: URL Generation
description: Generate URLs for Gravito routes, including signed URLs.
---

# URL Generation

Gravito provides helpers to generate links to internal routes with consistent naming and signatures.

## Base URLs

Use `c.route()` (or `Router.url()` on the backend):

```typescript
const url = c.route('home'); // "/"
```

## Named Routes

```typescript
routes.get('/user/profile', [UserController, 'show']).name('user.profile');

const url = c.route('user.profile');
```

### Route Params

```typescript
// Route: /users/:id
const url = c.route('user.show', { id: 1 }); // /users/1
```

## Signed URLs

Signed URLs generate tamper-proof links. Useful for password resets or private downloads.

> Note: Signed URLs require `APP_KEY` to be set.

### Generate a Signed URL

```typescript
const url = c.route('unsubscribe', { id: 1 }).signed();
```

### Temporary Signed URL

```typescript
const url = c.route('download', { file: 'doc.pdf' }).temporarySigned(3600);
```

### Verify Signatures

```typescript
routes.get('/unsubscribe/:id', (c) => {
  if (!c.req.hasValidSignature()) {
    return c.forbidden('This link is invalid or expired');
  }
  // ...
}).name('unsubscribe');
```

## Asset URLs

Use `asset()` to generate stable URLs for static assets:

```typescript
const url = c.asset('logo.png'); // /logo.png
```

---

## Next Steps
See [Routing](./routing.md) for defining and naming routes.
