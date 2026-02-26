# Bun Runtime Features Guide

## File Type Support

### Native Support
Bun automatically handles these file types:

| Extension | Handler | Usage |
|-----------|---------|-------|
| `.ts`, `.tsx` | TypeScript transpiler | import x from "./file.ts" |
| `.js`, `.jsx` | Direct execution | import x from "./file.js" |
| `.json` | JSON parser | import config from "./config.json" |
| `.toml` | TOML parser | import env from "./.env.toml" |
| `.yaml`, `.yml` | YAML parser | import data from "./data.yaml" |
| `.html` | Text/Static asset | import html from "./template.html" |
| `.wasm` | WebAssembly loader | import wasm from "./module.wasm" |
| `.node` | Native addon | import addon from "./native.node" |
| `.sqlite` | Database file | import db from "./data.sqlite" |

### Import Attributes

For explicit type specification:

```ts
// TOML config
import config from "./config.toml" with { type: "toml" };

// WebAssembly
import wasm from "./module.wasm" with { type: "wasm" };

// SQLite database
import db from "./data.sqlite" with { type: "sqlite" };
```

## Auto-install Feature

Bun auto-installs dependencies on first use:

```ts
// First time: Bun downloads and caches from npm
import { z } from "zod";

// Subsequent runs: Uses cached version
// No bun.lock required for scripts, but recommended for reproducibility
```

### Version Specification

```ts
// Explicit version
import { z } from "zod@3.0.0";

// Semver range
import { z } from "zod@^3.20.0";

// Latest (checked every 24h)
import { z } from "zod";
```

## JSX Configuration

### Default (React)
```tsx
// Uses React.createElement by default
export const Component = () => <div>Hello</div>;
```

### Per-file Override (Preact)
```tsx
// @jsx h
// @jsxImportSource preact
export const Component = () => <div>Hello</div>;
```

### Configuration
Set in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "React.createElement",
    "jsxFragmentFactory": "React.Fragment",
    "jsxImportSource": "react"
  }
}
```

## Plugin System

Bun plugins intercept imports and enable custom processing:

```ts
import type { Plugin } from "bun";

export const customPlugin: Plugin = {
  name: "custom-loader",
  setup(build) {
    build.onLoad(
      { filter: /\.custom$/ },
      async (args) => {
        return {
          contents: "// processed content",
          loader: "js"
        };
      }
    );
  }
};
```

## File System Router

The FileSystemRouter enables filesystem-based routing:

```ts
const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./pages",
  fileExtensions: [".ts", ".tsx"],
});

const route = router.match("/blog/my-post");
if (route) {
  console.log(route.pathname);  // /blog/[slug]
  console.log(route.params);    // { slug: "my-post" }
}
```

Directory structure:
```
pages/
  ├── index.tsx          -> /
  ├── about.tsx          -> /about
  ├── blog/
  │   └── [slug].tsx     -> /blog/:slug
  └── [...catchall].tsx  -> /* (fallback)
```

## Best Practices

1. **Use import attributes for explicit types**
   ```ts
   ✅ import config from "./config.toml" with { type: "toml" };
   ❌ import config from "./config.toml"; // Works but unclear intent
   ```

2. **Leverage auto-install for scripts**
   ```ts
   ✅ bun run my-script.ts  // Auto-installs deps
   ❌ npm install first, then node (more steps)
   ```

3. **Use per-file JSX pragmas for mixed frameworks**
   ```tsx
   ✅ // @jsxImportSource preact (clear intent)
   ❌ Mixing React and Preact in same file
   ```

4. **Configure plugins for build-time processing**
   - Schema validation
   - Code generation
   - Asset optimization

---

## Configuration Files

- `bunfig.toml` - Runtime & build configuration
- `tsconfig.json` - TypeScript compiler options
- `biome.json` - Linting and formatting rules
