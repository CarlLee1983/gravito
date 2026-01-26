# @gravito/freeze-vue

> 🍃 Vue 3 adapter for @gravito/freeze SSG module.

`@gravito/freeze-vue` provides a seamless bridge between your Vue 3 application and the `@gravito/freeze` static site generation (SSG) engine. It enables hybrid mode development where you can switch between a dynamic SPA (using Inertia.js) and a fully localized static site with zero code changes in your components.

## Core Features

- 🌓 **Hybrid Mode**: Automatically detects environment and switches between Static (native `<a>`) and Dynamic (Inertia `<Link>`) navigation.
- 🌍 **Locale Awareness**: Deep integration with `@gravito/freeze` for automatic path localization and locale switching.
- 🧩 **Smart Components**: Provides `<StaticLink>` and `<LocaleSwitcher>` for effortless SEO-friendly navigation.
- ⚓ **Vue 3 Composables**: Exposes `useFreeze()` for reactive access to current locale and navigation utilities.
- 🔄 **Re-exports**: Full access to `@gravito/freeze` core utilities (config, detectors, redirect generators).

## Installation

```bash
bun add @gravito/freeze-vue
```

## Quick Start

### 1. Install the Plugin

Configure the plugin in your entry file (e.g., `main.ts`).

```typescript
import { createApp } from 'vue'
import { FreezePlugin, defineConfig } from '@gravito/freeze-vue'
import { Link } from '@inertiajs/vue3' // Optional: for dynamic mode
import App from './App.vue'

const config = defineConfig({
  staticDomains: ['example.com', 'example.github.io'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

const app = createApp(App)

// LinkComponent is optional; if omitted, native <a> will always be used
app.use(FreezePlugin, { config, LinkComponent: Link })

app.mount('#app')
```

### 2. Use StaticLink for Navigation

`<StaticLink>` automatically prepends the current locale to paths and handles SPA vs. Static behavior.

```vue
<!-- Navigation.vue -->
<script setup>
import { StaticLink } from '@gravito/freeze-vue'
</script>

<template>
  <nav>
    <StaticLink href="/">Home</StaticLink>
    <StaticLink href="/about">About</StaticLink>
    <!-- skipLocalization bypasses locale prefixing -->
    <StaticLink href="/external-resource" skipLocalization>External</StaticLink>
  </nav>
</template>
```

### 3. Add Locale Switcher

`<LocaleSwitcher>` preserves the current path while changing the language.

```vue
<!-- LanguageSelector.vue -->
<script setup>
import { LocaleSwitcher } from '@gravito/freeze-vue'
</script>

<template>
  <div>
    <LocaleSwitcher locale="en">English</LocaleSwitcher>
    <LocaleSwitcher locale="zh">繁體中文</LocaleSwitcher>
  </div>
</template>
```

### 4. Custom Logic with `useFreeze`

Access the SSG state reactively in any component.

```vue
<script setup>
import { useFreeze } from '@gravito/freeze-vue'

const { 
  isStatic, 
  locale, 
  getLocalizedPath, 
  navigateToLocale 
} = useFreeze()
</script>

<template>
  <div>
    <p>Running in: {{ isStatic ? 'Static SSG Mode' : 'Dynamic SPA Mode' }}</p>
    <p>Current Language: {{ locale }}</p>
    
    <button @click="navigateToLocale('en')">Switch to English</button>
  </div>
</template>
```

## API Reference

### Plugin: `FreezePlugin`

Install via `app.use(FreezePlugin, options)`.

| Option | Type | Description |
|---|---|---|
| `config` | `FreezeConfig` | Configuration object from `defineConfig`. |
| `LinkComponent` | `Component` | (Optional) SPA Link component (e.g., Inertia Link). |

### Components

#### `<StaticLink>`
| Prop | Type | Default | Description |
|---|---|---|---|
| `href` | `string` | **Required** | The target path. |
| `skipLocalization` | `boolean` | `false` | If true, does not prepend locale. |

#### `<LocaleSwitcher>`
| Prop | Type | Default | Description |
|---|---|---|---|
| `locale` | `string` | **Required** | The target locale code. |

### Composable: `useFreeze()`

Returns the following reactive properties and methods:

- `isStatic`: `ComputedRef<boolean>` - True if running on a static domain.
- `locale`: `ComputedRef<string>` - Current active locale.
- `getLocalizedPath(path, locale?)`: Returns a localized string.
- `switchLocale(newLocale)`: Returns the current path with a new locale prefix.
- `navigateToLocale(newLocale)`: Performs a hard redirect to the new locale path.

## Static vs Dynamic Behavior

| Feature | Static Mode (Production) | Dynamic Mode (Development/SSR) |
|---------|-------------|--------------|
| **Link Rendering** | Native `<a>` | Inertia `<Link>` (or provided component) |
| **Localization** | Path-based (`/zh/about`) | Path-based (`/zh/about`) |
| **Navigation** | Browser Page Load | SPA Client-side Transition |
| **Detection** | Matches `staticDomains` or production ports | Default fallback |

## License

MIT © Gravito Framework
