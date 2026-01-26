# @gravito/luminosity-adapter-photon

> Photon adapter for Gravito SmartMap (Luminosity) Engine.

Seamlessly integrate automatic Sitemap and Robots.txt generation into your Photon applications. This adapter provides a lightweight middleware that handles SEO-related requests by leveraging the powerful Luminosity engine.

## ✨ Features

- 🪐 **Seamless Integration** - Simple middleware for any Photon application.
- 🤖 **Automatic Robots.txt** - Dynamically generated robots.txt based on your configuration.
- 🗺️ **Smart Sitemap Engine** - Full support for `sitemap.xml`, including index files and paginated sitemaps (e.g., `sitemap_page_1.xml`).
- ⚡ **Lazy Initialization** - The SEO engine initializes only upon the first relevant request, saving resources during startup.
- 🛡️ **I/O Optimized** - Sets correct `Content-Type` headers (`application/xml` or `text/plain`) automatically.
- 🧪 **Testable** - Built with dependency injection support for easier unit testing.

## 📦 Installation

```bash
bun add @gravito/luminosity-adapter-photon @gravito/luminosity
```

## 🚀 Usage

```typescript
import { Photon } from '@gravito/photon';
import { gravitoSeo } from '@gravito/luminosity-adapter-photon';

const app = new Photon();

// Middleware integration
app.use('*', gravitoSeo({
  hostname: 'https://example.com',
  // See @gravito/luminosity for full configuration options
  sitemap: true,
  robots: true
}));

app.get('/', (c) => c.text('Hello Galaxy!'));

export default app;
```

## 📖 API Reference

### `gravitoSeo(config, deps?)`

Creates a Photon middleware handler.

- **`config`**: `SeoConfig` object from `@gravito/luminosity`.
- **`deps`**: (Optional) `GravitoSeoDeps` for overriding internal implementations (mainly for testing).
    - `SeoEngine`: Custom implementation of the `SeoEngine` class.

### Handled Paths

The middleware automatically intercepts and handles the following paths:
- `/robots.txt`
- `/sitemap.xml`
- `/sitemap_page_{n}.xml`
- Any path containing `sitemap` and ending in `.xml`.

It explicitly ignores any paths under `/docs/` to avoid conflicts with documentation routing.

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/gravito-framework/gravito/issues).

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
