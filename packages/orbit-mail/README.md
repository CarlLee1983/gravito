
# Orbit Mail

A powerful, multi-driver email framework for Gravito applications. Supports HTML, Template, React, and Vue renderers, with built-in development tools.

## Features

- **Multi-Driver Transport**: SMTP, AWS SES, Log, Memory.
- **Content Renderers**:
  - Raw HTML
  - OrbitView Templates
  - React Components (lazy-loaded)
  - Vue Components (lazy-loaded)
- **Development Mode**: Intercept emails and view them in a built-in UI (`/__mail`).
- **Flexible API**: Fluent interface for building emails.
- **Queue Support**: Built-in `Queueable` interface for async sending.

## Installation

```bash
bun add @gravito/orbit-mail
```

For AWS SES support:
```bash
bun add @aws-sdk/client-ses
```

## Basic Usage

### Configuration

Configure OrbitMail in your generic startup or creation logic:

```typescript
import { OrbitMail, SmtpTransport } from '@gravito/orbit-mail';

const mail = OrbitMail.configure({
  from: { name: 'My App', address: 'noreply@myapp.com' },
  transport: new SmtpTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: { user: '...', pass: '...' }
  }),
  devMode: process.env.NODE_ENV === 'development',
});

// Install into PlanetCore
mail.install(core);
```

### Creating Mailables

Extend the `Mailable` class to create email definitions.

```typescript
import { Mailable } from '@gravito/orbit-mail';

export class WelcomeEmail extends Mailable {
  constructor(private user: User) {
    super();
  }

  build() {
    return this
      .to(this.user.email)
      .subject('Welcome to Gravito!')
      .view('emails/welcome', { name: this.user.name });
  }
}
```

### Sending Email

```typescript
import { WelcomeEmail } from './mail/WelcomeEmail';

// In a controller/handler
await new WelcomeEmail(user).renderContent(); // Validate content
await context.get('mail').send(new WelcomeEmail(user));
```

### Queueing Email

OrbitMail supports queuing mail for background processing.

```typescript
const email = new WelcomeEmail(user)
  .onQueue('high-priority')
  .delay(60);

// Queue the email
await email.queue();
```

## Transports

### SMTP
Standard SMTP transport using `nodemailer`.

### AWS SES
Send via Amazon SES API.

```typescript
import { SesTransport } from '@gravito/orbit-mail';

const transport = new SesTransport({
  region: 'us-east-1',
  accessKeyId: '...', // Optional if using environment variables
  secretAccessKey: '...'
});
```

### Log
Logs email content to the console (useful for debugging).

### Memory
Stores emails in memory (used by Dev Mode).

## Renderers

- **html(string)**: Raw HTML string.
- **view(template, data)**: Uses generic template engine.
- **react(Component, props)**: Renders a React component to HTML.
- **vue(Component, props)**: Renders a Vue component to HTML.

## License

MIT
