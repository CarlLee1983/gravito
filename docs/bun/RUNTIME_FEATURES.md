# Bun Runtime Features Guide

Reference: [Bun Official Docs](https://bun.sh/docs/runtime/file-types)

This guide explains the runtime features of Bun that developers at Gravito can leverage.

---

## File Type Support

Bun's runtime natively supports these file types without configuration:

### TypeScript & JavaScript

```typescript
// Automatically transpiled
import { Component } from "./component.tsx";  // TSX component
import { helper } from "./util.ts";            // TypeScript
import { lib } from "./lib.js";                // CommonJS
import { mod } from "./mod.mjs";               // ES modules
```

**Features**:
- Tree-shaking and dead-code elimination
- Direct `.ts` execution without compilation step
- JSX transpilation to `React.createElement`

### Data Formats

```typescript
// JSON formats (all parsed as JavaScript objects)
import config from "./config.json";
import data from "./data.jsonc";              // JSON with comments
import extended from "./config.json5";        // JSON5 (trailing commas, etc.)

// Configuration formats
import env from "./.env.toml";                 // TOML configuration
import settings from "./settings.yaml";       // YAML format
```

**Usage**:
- Parsed as JavaScript objects at import time
- No runtime parsing overhead
- Full type support with TypeScript

### Static Assets

```typescript
// HTML files
import template from "./template.html";       // Returns string content

// CSS stylesheets
import styles from "./app.css";               // CSS module

// Images & SVG
import logo from "./logo.svg";                // Asset reference
import image from "./photo.png";              // Asset reference
```

### Binary & Native Files

```typescript
// WebAssembly
import wasmModule from "./lib.wasm" with { type: "wasm" };
const instance = new WebAssembly.Instance(wasmModule);

// Native Node.js addons (N-API)
import nativeModule from "./binding.node";    // NAPI binding

// SQLite databases
import db from "./data.sqlite" with { type: "sqlite" };
```

---

## Import Attributes

Use import attributes to explicitly specify file type handling:

```typescript
// Syntax: import ... with { type: "..." }

// TOML configuration
import config from "./app.config.toml" with { type: "toml" };

// WebAssembly module
import wasm from "./math.wasm" with { type: "wasm" };

// SQLite database
import database from "./app.db" with { type: "sqlite" };

// JSON format (ensures it's treated as JSON, not text)
import data from "./data" with { type: "json" };
```

**Benefits**:
- Explicit intent for code readers
- Type safety with TypeScript
- Compiler optimization hints

---

## JSX Configuration

### Default: React

Bun defaults to React JSX transpilation:

```tsx
// Uses React.createElement automatically
export const Component = () => (
  <div className="container">
    <h1>Hello Bun</h1>
  </div>
);
```

**Configuration** (in `tsconfig.json`):
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

### Per-File Overrides

Override JSX settings for specific files using pragmas:

```tsx
// @jsx h
// @jsxFrag Fragment
// @jsxImportSource preact
import { h, Fragment } from "preact";

export const Component = () => (
  <div>Using Preact instead of React</div>
);
```

**Available Pragmas**:
- `// @jsx functionName` - JSX factory function
- `// @jsxFrag fragmentName` - Fragment component
- `// @jsxImportSource moduleName` - JSX runtime module

### Multi-Framework Setup

```tsx
// React component (default)
export const ReactComponent = () => <div>React</div>;

// Preact component (explicit pragma)
// @jsxImportSource preact
export const PreactComponent = () => <div>Preact</div>;

// Vue component (note: Bun doesn't transpile Vue, but accepts .vue files)
// For Vue, use a bundler or build step
```

---

## Auto-Install Feature

Bun automatically downloads and caches dependencies on first use:

### Basic Usage

```typescript
// First run: Downloads from npm and caches
// Subsequent runs: Uses cached version
import { z } from "zod";
import { redis } from "redis";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});
```

### Version Specification

```typescript
// Exact version
import { z } from "zod@3.0.0";

// Semver range
import { z } from "zod@^3.20.0";
import { redis } from "redis@^4.6.0";

// Latest (checked every 24 hours)
import { z } from "zod";
```

### How It Works

1. Checks `bun.lock` for specified version
2. Falls back to `package.json` in parent directories
3. Downloads latest from npm if no constraints found
4. Caches in `~/.bun/install/cache/<pkg>@<version>/`
5. Validates "latest" tags every 24 hours

### Configuration

```toml
# bunfig.toml
[install]
# production = false: Include devDependencies (default for dev)
# production = true: Skip devDependencies (use for CI)
production = false
```

**No additional configuration needed** - works out of the box!

---

## Plugin System

Plugins intercept imports and enable custom processing:

### Plugin Structure

```typescript
import type { Plugin } from "bun";

const customPlugin: Plugin = {
  name: "my-plugin",
  setup(build) {
    // Register callbacks for different lifecycle events
    build.onLoad(
      { filter: /\.custom$/ },
      async (args) => {
        return {
          contents: "export default {};",
          loader: "js",
        };
      }
    );
  },
};
```

### Lifecycle Hooks

```typescript
// Called when bundling starts (can be async)
build.onStart(async () => {
  console.log("Build started");
});

// Determines how modules are located
build.onResolve(
  { filter: /^custom:/ },
  (args) => {
    return { path: args.path, namespace: "custom" };
  }
);

// Modifies module contents before parsing
build.onLoad(
  { filter: /\.custom$/ },
  (args) => {
    return {
      contents: processContent(args.path),
      loader: "js",
    };
  }
);
```

### Namespace System

Organize module resolution with namespaces:

```typescript
build.onResolve(
  { filter: /.*/, namespace: "http" },
  (args) => {
    return {
      path: args.path,
      namespace: "http-file",
    };
  }
);

build.onLoad(
  { filter: /.*/, namespace: "http-file" },
  async (args) => {
    const response = await fetch(args.path);
    return {
      contents: await response.text(),
      loader: "js",
    };
  }
);
```

### Using Plugins

Pass plugins to `Bun.build()`:

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  plugins: [customPlugin, anotherPlugin],
});
```

---

## File System Router

The FileSystemRouter enables filesystem-based routing:

### Setup

```typescript
import { FileSystemRouter } from "bun";

const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./pages",
  origin: "https://example.com",
  assetPrefix: "/static/",
  fileExtensions: [".ts", ".tsx", ".md"],
});
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `style` | string | Currently only `"nextjs"` supported |
| `dir` | string | Pages directory path |
| `origin` | string | Domain URL for absolute paths |
| `assetPrefix` | string | Static asset path prefix (optional) |
| `fileExtensions` | string[] | Custom extensions to recognize (optional) |

### Directory Structure

```
pages/
├── index.tsx          → /
├── about.tsx          → /about
├── blog/
│   ├── index.tsx      → /blog
│   └── [slug].tsx     → /blog/:slug
├── [param].tsx        → /:param
└── [...catchall].tsx  → /* (fallback)
```

### Route Matching

```typescript
const route = router.match("/blog/my-post");

if (route) {
  console.log(route.pathname);      // "/blog/[slug]"
  console.log(route.params);        // { slug: "my-post" }
  console.log(route.query);         // {}
  console.log(route.src);           // "/path/to/pages/blog/[slug].tsx"
}

// Get all routes
router.reload();  // Rescan directory for changes
```

---

## Best Practices

### 1. Use Import Attributes for Clarity

```typescript
// ✅ Clear intent
import config from "./config.toml" with { type: "toml" };

// ⚠️ Works but less clear
import config from "./config.toml";
```

### 2. Leverage Auto-Install for Scripts

```typescript
// ✅ Simple script runner
// bun run check-dependencies.ts
import { checkDependencies } from "zod";  // Auto-installed

// ❌ Unnecessary setup
// npm install && node check-dependencies.js
```

### 3. Document JSX Framework

```tsx
// ✅ Clear which framework is used
// @jsxImportSource preact
import { Component } from "preact";

// ⚠️ Framework unclear
export const MyComponent = () => <div>Hello</div>;
```

### 4. Plugin Patterns

```typescript
// ✅ Composable plugin design
const plugin = createPluginFactory({ options });

// ✅ Clear filter and namespace
build.onLoad(
  { filter: /\.schema\.ts$/, namespace: "schema" },
  handleSchemaFile
);
```

### 5. Production Considerations

```toml
# Development (include devDependencies)
[install]
production = false

# Production CI (skip devDependencies)
[install]
production = true
```

---

## Troubleshooting

### Import Not Found

```typescript
// ❌ Error: Module not found
import { z } from "unknown-package";

// ✅ Solution: Check bun.lock or package.json
// Or specify version: import { z } from "zod@^3.0.0";
```

### Wrong JSX Library

```tsx
// ❌ Error: Mixing React and Preact
export const Component = () => <div>Hello</div>;  // Uses React by default

// ✅ Solution: Use pragma for consistency
// @jsxImportSource preact
export const Component = () => <div>Hello</div>;
```

### Stale Cache

```typescript
// If auto-install seems to cache old versions:
// 1. Check bun.lock for version constraints
// 2. Check ~/.bun/install/cache/ for stale entries
// 3. Latest versions are validated every 24h
```

---

## Related Resources

- [Bun Official Docs - File Types](https://bun.sh/docs/runtime/file-types)
- [Bun File System Router](https://bun.sh/docs/runtime/file-system-router)
- [Bun JSX Configuration](https://bun.sh/docs/runtime/jsx)
- [Bun Auto-install](https://bun.sh/docs/runtime/auto-install)
- [Bun Plugins](https://bun.sh/docs/runtime/plugins)
- [bunfig.toml Reference](../bunfig.toml)

---

## Quick Reference

| Feature | Command | Example |
|---------|---------|---------|
| Run TypeScript | `bun run file.ts` | Auto-transpiles and runs |
| Import TOML | Import with type | `with { type: "toml" }` |
| JSX Override | Pragma | `// @jsxImportSource preact` |
| Auto-install | Direct import | `import { z } from "zod@3.0.0"` |
| Reload Routes | FileSystemRouter | `router.reload()` |

