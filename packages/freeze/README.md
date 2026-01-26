# @gravito/freeze 🧊

> **High-performance Static Site Generation (SSG) core for the Gravito Framework.**

`@gravito/freeze` is the backbone of Gravito's static site capabilities. It provides the essential logic for environment detection, locale-aware routing, and build-time asset generation, enabling you to build SEO-friendly, blazing-fast static websites from your Gravito applications.

## 🌟 Features

- **⚡️ Smart Detection**: Automatically detects whether your application is running as a static site or a dynamic application.
- **🌍 Locale-Aware Routing**: First-class support for multi-language sites with automatic localized path generation and redirection.
- **🏗️ Build-Time Utilities**:
  - **Sitemap Generation**: Automatic `sitemap.xml` with `hreflang` support.
  - **Robots Management**: Programmatic `robots.txt` generation.
  - **Redirect Logic**: Generate HTML-based redirects for serverless static hosting (GitHub Pages, Vercel, etc.).
- **🔍 SEO Optimized**: Designed with search engines in mind, ensuring your static content is perfectly indexed.
- **🔌 Framework Agnostic**: The core logic is pure TypeScript, with official adapters available for React and Vue.
- **🛠️ Config Driven**: Sensible defaults with deep customization options for domains, locales, and output paths.

## 📦 Installation

```bash
bun add @gravito/freeze
```

## 🚀 Quick Start

Define your configuration and initialize the detector:

```typescript
import { defineConfig, createDetector } from '@gravito/freeze'

const config = defineConfig({
  baseUrl: 'https://gravito.dev',
  locales: ['en', 'zh-TW', 'ja'],
  defaultLocale: 'en',
  staticDomains: ['gravito.dev', 'gravito-framework.github.io'],
  redirects: [
    { from: '/docs', to: '/en/docs/introduction' }
  ]
})

const detector = createDetector(config)

// Use the detector to decide rendering behavior
if (detector.isStaticSite()) {
  // Logic for static site (e.g., direct <a> tags)
}
```

## ⚙️ Core Concepts

### 1. Environment Detection
The `FreezeDetector` uses domain matching and environment variables to determine if the application is being served as a static site. This allows your components to adjust their behavior (like navigation) automatically.

### 2. Localization (I18n)
Freeze handles the complexity of localized paths:
- `/about` → `/en/about`
- `/zh-TW/docs` → `/ja/docs` (Switching)
It also generates the necessary metadata for search engines to understand the relationship between translated pages.

### 3. Static Hosting Redirects
Since many static hosts don't support server-side redirects, Freeze can generate physical `index.html` files with `<meta http-equiv="refresh">` and JavaScript fallbacks to handle legacy paths or root-to-locale redirection.

## 🛠️ API Reference

### Configuration: `defineConfig`

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | Required | The production URL of your site. |
| `locales` | `string[]` | `['en']` | Supported language codes. |
| `defaultLocale` | `string` | `'en'` | The fallback language. |
| `outputDir` | `string` | `'dist-static'` | Target directory for generated files. |
| `staticDomains` | `string[]` | `[]` | List of domains that trigger static mode. |

### Build Utilities

- `generateSitemapXml`: Creates a valid XML sitemap with alternate links.
- `generateRobotsTxt`: Creates a standard `robots.txt`.
- `generateRedirects`: Generates a map of file paths to redirect HTML content.
- `generate404Html`: Creates a standard 404 page for static hosts.

## 🔌 Framework Adapters

For seamless integration with your favorite UI library, use our official adapters:

- **React**: `@gravito/freeze-react` (Hooks like `useLocale`, `useLocalizedPath`)
- **Vue**: `@gravito/freeze-vue` (Composables for the same functionality)

## 📄 License

MIT © Carl Lee
