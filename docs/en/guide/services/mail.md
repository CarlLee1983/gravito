---
title: Mail
description: Learn how to send beautiful emails using Gravito Signal.
---

# Mail

> Gravito provides a powerful email abstraction layer, supporting SMTP, SES, and multiple rendering engines (HTML, React, Vue).

## Quick Start

### Define a Mailable

A Mailable is a class representing a specific email.

```typescript
import { Mailable } from '@gravito/signal'

export class WelcomeEmail extends Mailable {
  constructor(private user: any) {
    super()
  }

  build() {
    return this
      .to(this.user.email)
      .subject('Welcome to Gravito!')
      .view('emails/welcome', { name: this.user.name })
  }
}
```

### Sending Mail

```typescript
core.app.post('/register', async (c) => {
  const mail = c.get('mail')
  const user = { name: 'Alice', email: 'alice@example.com' }

  // Send immediately
  await mail.send(new WelcomeEmail(user))

  return c.json({ message: 'Welcome email sent' })
})
```

### Queuing Mail

To send emails asynchronously (recommended), ensure you have `@gravito/stream` installed:

```typescript
// The email will be pushed to the background queue for processing
await new WelcomeEmail(user).queue()
```

## Configuration

Configure `OrbitSignal` in your `gravito.config.ts`:

```typescript
import { OrbitSignal, SmtpTransport } from '@gravito/signal'

export default {
  orbits: [
    OrbitSignal.configure({
      from: { name: 'My App', address: 'no-reply@myapp.com' },
      transport: new SmtpTransport({
        host: 'smtp.mailtrap.io',
        port: 2525,
        auth: { user: '...', pass: '...' }
      })
    })
  ]
}
```

## Rendering Engines

- **HTML**: Pass a raw string directly.
- **Views**: Use `c.view()` to render `.hbs` or other templates.
- **React**: Use `c.react(Component, props)`.
- **Vue**: Use `c.vue(Component, props)`.

---

## Next Steps
Learn how to send multi-channel messages through the [Notification System](./notifications.md).
