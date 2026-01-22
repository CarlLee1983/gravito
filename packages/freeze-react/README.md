# @gravito/freeze-react

> ⚛️ React adapter for @gravito/freeze SSG module

## Installation

```bash
bun add @gravito/freeze-react
```

## Quick Start

### 1. Wrap Your App with FreezeProvider

```tsx
// App.tsx
import { FreezeProvider, defineConfig } from '@gravito/freeze-react'
import { Link } from '@inertiajs/react'

const config = defineConfig({
  staticDomains: ['example.com', 'example.github.io'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

function App() {
  return (
    <FreezeProvider config={config} LinkComponent={Link}>
      <Layout>...</Layout>
    </FreezeProvider>
  )
}
```

### 2. Use StaticLink for Navigation

```tsx
// Navigation.tsx
import { StaticLink } from '@gravito/freeze-react'

function Navigation() {
  return (
    <nav>
      <StaticLink href="/about">About</StaticLink>
      <StaticLink href="/docs/guide">Guide</StaticLink>
    </nav>
  )
}
```

### 3. Add Locale Switcher

```tsx
// Header.tsx
import { LocaleSwitcher } from '@gravito/freeze-react'

function Header() {
  return (
    <header>
      <LocaleSwitcher locale="en">English</LocaleSwitcher>
      <LocaleSwitcher locale="zh">Chinese</LocaleSwitcher>
    </header>
  )
}
```

### 4. Use the Hook for Custom Logic

```tsx
// CustomComponent.tsx
import { useFreeze } from '@gravito/freeze-react'

function CustomComponent() {
  const { isStatic, locale, getLocalizedPath, navigateToLocale } = useFreeze()

  return (
    <div>
      <p>Mode: {isStatic ? 'Static' : 'Dynamic'}</p>
      <p>Locale: {locale}</p>
      <a href={getLocalizedPath('/about')}>About</a>
    <button onClick={() => navigateToLocale('zh')}>Switch to Chinese</button>
    </div>
  )
}
```

## API Reference

### Components

#### `<FreezeProvider>`

Context provider for SSG functionality.

```tsx
<FreezeProvider config={config} locale="en" LinkComponent={Link}>
  {children}
</FreezeProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `config` | `FreezeConfig` | SSG configuration |
| `locale` | `string?` | Override current locale |
| `LinkComponent` | `Component?` | Optional Inertia Link component |
| `children` | `ReactNode` | Child components |

#### `<StaticLink>`

Smart link component.

```tsx
<StaticLink href="/about" className="link">About</StaticLink>
```

| Prop | Type | Description |
|------|------|-------------|
| `href` | `string` | Target path (auto-localized) |
| `className` | `string?` | CSS class |
| `skipLocalization` | `boolean?` | Skip auto-localization |
| `children` | `ReactNode` | Link content |

#### `<LocaleSwitcher>`

Locale switching link.

```tsx
<LocaleSwitcher locale="zh">Chinese</LocaleSwitcher>
```

| Prop | Type | Description |
|------|------|-------------|
| `locale` | `string` | Target locale |
| `className` | `string?` | CSS class |
| `children` | `ReactNode?` | Link content (defaults to locale code) |

### Hook

#### `useFreeze()`

Access SSG utilities in components.

```tsx
const {
  isStatic,         // boolean - static mode flag
  locale,           // string - current locale
  getLocalizedPath, // (path, locale?) => string
  switchLocale,     // (locale) => string
  getLocaleFromPath,// (path) => string
  navigateToLocale, // (locale) => void
} = useFreeze()
```

### Re-exports from @gravito/freeze

All exports from `@gravito/freeze` are available:

- `defineConfig`
- `createDetector`
- `generateRedirectHtml`
- `generateRedirects`
- `generateLocalizedRoutes`
- `inferRedirects`
- `generateSitemapEntries`

## Static vs Dynamic Mode

| Feature | Static Mode | Dynamic Mode |
|---------|-------------|--------------|
| `<StaticLink>` | Renders `<a>` | Renders Inertia `<Link>` |
| Navigation | Full page reload | SPA transition |
| Detected when | Production domains, port 4173 | localhost:3000/5173 |

## License

MIT © Gravito Framework
