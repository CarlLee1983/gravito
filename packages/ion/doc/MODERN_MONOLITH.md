# Modern Monolith Guide

`@gravito/ion` implements the **Neural Bridge** pattern, allowing you to build feature-rich Single Page Applications (SPAs) with the simplicity of a classic monolith.

## 1. Zero-API Philosophy

Instead of writing a REST/GraphQL endpoint and then consuming it in the frontend, you pass data directly from your Satellite's controller to the UI component.

```typescript
// satellites/dashboard/src/controllers/ProfileController.ts
export class ProfileController {
  async show(c) {
    const inertia = c.get('inertia');
    const user = c.get('user');
    
    // Direct teleportation of data to React/Vue
    return inertia.render('Profile/Show', { user });
  }
}
```

## 2. Shared Props (Galaxy State)

Global data like the authenticated user or active Satellite configuration should be shared across every response.

```typescript
// Bootstrapping the Orbit
OrbitIon.configure({
  shared: (c) => ({
    user: c.get('user'),
    flash: c.get('session').getFlash('status'),
    galaxy: { version: '2.0.0' }
  })
})
```

## 3. Distributed Navigation

Navigating between pages in an Inertia-powered Galaxy is fast and feels like a native app. Use the `<Link>` component to trigger "Partial Reloads".

```tsx
import { Link } from '@gravito/ion-react'

<Link href="/api/v1/shop" method="get">Shop Now</Link>
```

## 4. Deferred Loading (Inertia v2)

For heavy data fetching (e.g., reports), use **Deferred Props**. This lets the page render immediately while the data loads in the background.

```typescript
return inertia.render('Dashboard', {
  summary: getSummary(),
  heavyReport: InertiaService.defer(() => generateReport(), 'report')
});
```

## 5. Security: CSRF & Auth

Ion is fully integrated with `@gravito/fortify` and `@gravito/pulsar`.

- **CSRF**: The `X-XSRF-TOKEN` header is automatically added to all XHR requests.
- **Auth**: Redirects to the login page (via `Inertia::location`) are handled gracefully, preventing the "HTML inside a Modal" error.

## 6. Performance: Versioning

To ensure clients always use the latest frontend assets, use the `version()` helper.

```typescript
OrbitIon.configure({
  version: () => assetHash('./public/assets/app.js')
})
```
When the version changes, Inertia will perform a full-page reload on the next request.
