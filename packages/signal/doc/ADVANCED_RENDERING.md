# Advanced Email Rendering Guide

`@gravito/signal` provides a powerful rendering engine that allows you to build complex, responsive, and type-safe emails using modern frontend frameworks.

## 1. Component-Based Emails (React & Vue)

Instead of traditional HTML templates, you can use React or Vue components to design your emails. This enables component reuse and strong typing.

### React with MJML
For truly responsive emails across all clients, we recommend using **MJML** components within React:

```tsx
import { Mailable } from '@gravito/signal'
import { WelcomeTemplate } from './templates/WelcomeTemplate'

export class WelcomeEmail extends Mailable {
  build() {
    return this
      .subject('Welcome to Gravito!')
      .react(WelcomeTemplate, { name: 'User' })
  }
}

// WelcomeTemplate.tsx (using MJML style)
export const WelcomeTemplate = ({ name }: { name: string }) => (
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-size="20px">Hello {name}!</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
)
```

## 2. Localization (I18n) Integration

`OrbitSignal` integrates with Gravito's translation system to provide localized email content.

```typescript
export class OrderConfirmation extends Mailable {
  build() {
    // The subject and view will be translated based on the current locale
    return this
      .subject(this.t('emails.order_confirmed'))
      .view('emails/orders', { id: this.order.id })
  }
}
```

## 3. Dynamic Styles and Assets

Manage assets and styles dynamically to ensure your emails look great on all devices.

- **Inlining Styles**: All CSS used in your templates is automatically inlined during the rendering phase.
- **Image Assets**: Use the `asset()` helper to generate full URLs for images hosted in your public directory or a CDN.

## 4. Testing Your Renderers

Test your mailable's rendering without sending any emails:

```typescript
import { WelcomeEmail } from './mailables/WelcomeEmail'

it('should render the correct HTML', async () => {
  const mailable = new WelcomeEmail({ name: 'Carl' })
  const content = await mailable.renderContent()
  
  expect(content.html).toContain('Hello Carl!')
})
```
