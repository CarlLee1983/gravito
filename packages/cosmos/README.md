# @gravito/cosmos

> Lightweight Internationalization (i18n) Orbit for Gravito.

Provides simple JSON-based localization support for your Gravito application, with seamless integration into Photon context.

## 📦 Installation

```bash
bun add @gravito/cosmos
```

## 🚀 Quick Start

1.  **Register the Orbit**:
    ```typescript
    import { PlanetCore } from 'gravito-core';
    import { OrbitI18n } from '@gravito/cosmos';

    const core = new PlanetCore();

    core.boot({
      orbits: [OrbitI18n],
      config: {
        i18n: {
          defaultLocale: 'en',
          fallbackLocale: 'en',
          path: './lang' // Path to your locale JSON files
        }
      }
    });
    ```

2.  **Create Locale Files**:
    Create `./lang/en.json` and `./lang/zh-TW.json`:
    ```json
    // en.json
    {
      "welcome": "Welcome, {name}!"
    }
    ```

3.  **Use in Routes**:
    ```typescript
    app.get('/', (c) => {
      const t = c.get('t');
      return c.text(t('welcome', { name: 'Carl' }));
    });
    ```

## ✨ Features

-   **Context Injection**: Automatically injects `t()` helper into Photon context.
-   **Parameter Replacement**: Supports `{key}` style parameter replacement.
-   **Locale Detection**: Automatically detects locale from `Accept-Language` header or query parameter `?lang=`.
-   **Fallback**: gracefully falls back to default locale if key is missing.

## 📚 API

### `t(key: string, params?: Record<string, any>): string`

Main translation helper function.

## License

MIT
