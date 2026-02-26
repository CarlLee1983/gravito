# Distributed Theming Guide

In a **Galaxy Architecture**, branding and visual style must be consistent across all user touchpoints. `@gravito/chromatic` provides the infrastructure to manage themes centrally.

## 1. Defining the Core Spectrum

The main application (Galaxy Host) should define the primary theme during bootstrap.

```typescript
import { Chromatic } from '@gravito/chromatic'

Chromatic.registerTheme({
  name: 'corporate-blue',
  colors: {
    primary: '#0055ff',
    background: '#ffffff',
    text: '#1a1a1a',
    success: '#00cc66'
  }
})
```

## 2. Consuming Styles in Satellites

Satellites should use **Semantic Methods** instead of hardcoded hex values.

```typescript
// Inside a Satellite logic or View Helper
const successMsg = Chromatic.success('Operation Complete')
```

## 3. Real-time Theme Updates

When a theme is changed (e.g., user toggles Dark Mode), Chromatic can broadcast the change via `@gravito/radiance`.

```typescript
// Broadcast the spectrum change
core.on('theme:changed', (newTheme) => {
  Chromatic.setTheme(newTheme)
  // Radiance will sync this to all connected clients
})
```

## 4. Theme Inheritance

Satellites can extend the core theme with domain-specific colors.

```typescript
Chromatic.registerTheme({
  name: 'billing-extension',
  parent: 'corporate-blue',
  colors: {
    invoiceDue: '#ff0000',
    invoicePaid: '#00ff00'
  }
})
```

## 5. CLI Consistency

Ensure your Satellite's custom CLI commands match the Galaxy's aesthetic spectrum.

```typescript
// MySatelliteCommand.ts
import { Chromatic } from '@gravito/chromatic'

export default class MyCommand {
  async handle() {
    console.log(Chromatic.primary('--- Running Satellite Task ---'))
  }
}
```

## 6. CSS Generation (with Prism)

Chromatic can generate CSS Variables (`:root`) that `Prism` automatically injects into your HTML templates.

```handlebars
{{-- Prism Template --}}
<style>
  :root {
    --color-primary: {{ theme.colors.primary }};
  }
</style>
```
