---
title: Plugin Marketplace Standard (GPS-001)
---

# Plugin Marketplace Standard (GPS-001)

To foster a healthy ecosystem, Gravito establishes the **Gravito Plugin Standard (GPS)**. This document outlines how to package, name, and distribute your Kinetic Modules and Satellites so they can be discovered by the CLI and future marketplace.

## 1. Naming Conventions

To ensure discoverability on npm, please follow these naming patterns:

### Kinetic Modules (Infrastructure)
*   Format: `gravito-orbit-<name>`
*   Scoped: `@<scope>/gravito-orbit-<name>`
*   Example: `gravito-orbit-redis`, `@my-org/gravito-orbit-payment`

### Satellites (Features)
*   Format: `gravito-plugin-<name>`
*   Scoped: `@<scope>/gravito-plugin-<name>`
*   Example: `gravito-plugin-blog`, `@my-org/gravito-plugin-seo`

## 2. Package.json Metadata

Your `package.json` acts as the manifest for the Gravito system.

### Keywords
You **MUST** include one of the following keywords:
*   `gravito-plugin` (for Satellites)
*   `gravito-orbit` (for Kinetic Modules)
*   `gravito-ecosystem` (general)

This allows the CLI to find your package via `npm search keywords:gravito-plugin`.

### The `gravito` Object
You **SHOULD** include a `gravito` property in your `package.json` to define integration details.

```json
{
  "name": "gravito-plugin-blog",
  "version": "1.0.0",
  "keywords": ["gravito-plugin", "blog"],
  "peerDependencies": {
    "@gravito/core": "^0.3.0"
  },
  "gravito": {
    "type": "satellite",
    "icon": "blog",
    "requires": ["db", "auth"],
    "configuration": {
      "BLOG_TITLE": {
        "type": "string",
        "default": "My Awesome Blog",
        "required": true
      }
    }
  }
}
```

*   **type**: `'satellite' | 'orbit'`
*   **requires**: Array of module keys (e.g., `['db', 'auth']`) that this plugin depends on. The CLI will warn the user if these are missing.
*   **configuration**: Schema for environment variables or options the plugin needs.

## 3. Entry Point Standard

Your main entry point must export a default function matching the Gravito signature.

```typescript
import { PlanetCore } from '@gravito/core';

export default function myPlugin(core: PlanetCore, options?: any) {
  // Implementation
}
```

## 4. Publishing

1.  Ensure your package is public.
2.  Run `npm publish`.
3.  Your plugin will automatically appear in Gravito searches once indexed by npm.
