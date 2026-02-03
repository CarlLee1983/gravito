---
title: CSRF Protection
description: Protect your Gravito apps from cross-site request forgery.
---

# CSRF Protection

Cross-site request forgery (CSRF) forces authenticated users to perform unintended actions. Gravito's **Pulsar** module ships with built-in CSRF protection.

## How It Works

1. When a session starts, Gravito generates a CSRF token for each active user.
2. The token is stored in the session and sent to the browser as `XSRF-TOKEN`.
3. For unsafe requests (POST, PUT, PATCH, DELETE), the client must send the token in a header.

## Enable Protection

Make sure CSRF is enabled in `gravito.config.ts`:

```typescript
config: {
  session: {
    csrf: {
      enabled: true,
      headerName: 'X-CSRF-Token',
      ignore: (ctx) => {
        return ctx.req.path.startsWith('/api/webhooks')
      }
    }
  }
}
```

## Frontend Usage

### Automatic (Axios)
Axios automatically reads `XSRF-TOKEN` cookies and sends `X-XSRF-TOKEN`. Just keep the header name consistent.

### Manual (Fetch)

```javascript
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1];

fetch('/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': decodeURIComponent(csrfToken)
  },
  body: JSON.stringify({ title: 'Hello World' })
});
```

## Using Templates

If you use **Prism (Handlebars)**, you can also add a hidden field:

```html
<form method="POST" action="/profile">
  <input type="hidden" name="_token" value="{{ csrf_token }}">
  <!-- ... -->
</form>
```

## Ignore Routes

```typescript
csrf: {
  enabled: true,
  ignore: (ctx) => {
    return ctx.req.path === '/paypal/notify'
  }
}
```

---

## Next Steps
See [Session Management](./sessions.md) for storing user state securely.
