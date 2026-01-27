# @gravito/freeze-react

> ⚛️ React adapter for @gravito/freeze SSG module

`@gravito/freeze-react` provides a seamless bridge between your React application and the Gravito Freeze SSG engine. It enables intelligent environment detection, automatic path localization, and hybrid navigation support for projects using Inertia.js or standard React.

## Key Features

- 🌍 **Automatic Localization**: Seamlessly prepends locale prefixes to paths based on context.
- 🔄 **Hybrid Navigation**: Automatically switches between native `<a>` tags for static deployments and Inertia `<Link>` for dynamic development.
- 🧩 **Context-Aware Hooks**: Access locale state and localization utilities from anywhere in your component tree.
- ⚙️ **Unified Config**: Shares the same `FreezeConfig` as the core module for consistent behavior across server and client.

## Installation

```bash
bun add @gravito/freeze-react
```

## Quick Start

### 1. Wrap Your App with `FreezeProvider`

The provider initializes the SSG detector and manages the current locale state. In dynamic mode (e.g., development), it can integrate with Inertia.js for SPA-like transitions.

```tsx
// App.tsx
import { FreezeProvider, defineConfig } from '@gravito/freeze-react'
import { Link } from '@inertiajs/react'

const config = defineConfig({
  staticDomains: ['example.com'],
  locales: ['en', 'zh-TW'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

function App({ locale }) {
  return (
    <FreezeProvider config={config} locale={locale} LinkComponent={Link}>
      <Layout>...</Layout>
    </FreezeProvider>
  )
}
```

### 2. Use `StaticLink` for Navigation

`StaticLink` is the core component for internal navigation. It intelligently handles path prefixing and chooses the correct underlying tag based on whether the site is currently running as a static export or a dynamic app.

```tsx
// Navigation.tsx
import { StaticLink } from '@gravito/freeze-react'

function Navigation() {
  return (
    <nav>
      {/* Automatically becomes /zh-TW/about if locale is zh-TW */}
      <StaticLink href="/about">About</StaticLink>
      
      {/* Skip localization for specific paths */}
      <StaticLink href="/manifest.json" skipLocalization>Manifest</StaticLink>
    </nav>
  )
}
```

### 3. Add `LocaleSwitcher`

Renders a link that switches the site's locale while preserving the current path and query parameters.

```tsx
// Header.tsx
import { LocaleSwitcher } from '@gravito/freeze-react'

function Header() {
  return (
    <header>
      <LocaleSwitcher locale="en">English</LocaleSwitcher>
      <LocaleSwitcher locale="zh-TW">繁體中文</LocaleSwitcher>
    </header>
  )
}
```

### 4. Use `useFreeze` Hook

Access SSG utilities for programmatic control or custom component logic.

```tsx
// CustomComponent.tsx
import { useFreeze } from '@gravito/freeze-react'

function CustomComponent() {
  const { isStatic, locale, getLocalizedPath, navigateToLocale } = useFreeze()

  return (
    <div>
      <p>Deployment Mode: <strong>{isStatic ? 'Static (SSG)' : 'Dynamic (SSR)'}</strong></p>
      <p>Current Locale: <strong>{locale}</strong></p>
      
      <button onClick={() => navigateToLocale('zh-TW')}>
        Switch to Traditional Chinese
      </button>
    </div>
  )
}
```

## API Reference

### Components

#### `<FreezeProvider>`

The root context provider.

| Prop | Type | Description |
|------|------|-------------|
| `config` | `FreezeConfig` | SSG configuration object. |
| `locale` | `string?` | Manually override the current locale (useful for SSR). |
| `LinkComponent` | `Component?` | React component to use for dynamic navigation (e.g., Inertia Link). |
| `children` | `ReactNode` | Your application. |

#### `<StaticLink>`

| Prop | Type | Description |
|------|------|-------------|
| `href` | `string` | Target path. Automatically localized. |
| `skipLocalization` | `boolean?` | If true, the `href` will be used as-is. |
| `className` | `string?` | CSS class for the generated element. |
| `...props` | `any` | Any other props are passed to the underlying element. |

#### `<LocaleSwitcher>`

| Prop | Type | Description |
|------|------|-------------|
| `locale` | `string` | Target locale to switch to. |
| `className` | `string?` | CSS class. |
| `children` | `ReactNode?` | Defaults to uppercase locale code. |

### Hooks

#### `useFreeze()`

Returns an object with the following properties:

- `isStatic`: `boolean` - `true` if running on a production static domain.
- `locale`: `string` - The currently active locale.
- `getLocalizedPath(path, locale?)`: Returns the path with the appropriate locale prefix.
- `switchLocale(newLocale)`: Returns the current URL path adapted for a new locale.
- `navigateToLocale(newLocale)`: Programmatically triggers a location change to the new locale.

## Static vs Dynamic Behavior

| Scenario | Mode | `<StaticLink>` Result | Navigation |
|----------|------|------------------------|------------|
| **Production (SSG)** | Static | Native `<a>` | Full Page Reload |
| **Development (SSR)** | Dynamic | Inertia `<Link>`* | SPA Transition |

*\*Only if `LinkComponent` is provided to `FreezeProvider`.*

## Re-exports

For convenience, `@gravito/freeze-react` re-exports the entire `@gravito/freeze` core API, including `defineConfig`.

## License

MIT © Gravito Framework
