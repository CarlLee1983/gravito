# Bun Configuration Improvements - Implementation Plan

**Status**: Ready for Implementation
**Branch**: `bun-runtime-alignment`
**Target**: Align gravito-core with Bun 1.3.9 best practices

---

## Phase 1: Configuration Enhancement (Quick Wins)

### 1.1 Expand bunfig.toml

**File**: `bunfig.toml`

Current:
```toml
[test]
timeout = "10000ms"
root = "."

[install]
production = false
```

**Improved**:
```toml
# Bun Runtime Configuration for Gravito Core

# ============================================================================
# TEST CONFIGURATION
# ============================================================================
[test]
# Maximum time for each test before timeout
timeout = "10000ms"
# Root directory for test discovery
root = "."

# ============================================================================
# INSTALL CONFIGURATION
# ============================================================================
[install]
# production = false: Install devDependencies (for monorepo development)
# production = true: Skip devDependencies (for CI/deployment optimization)
production = false

# ============================================================================
# BUILD CONFIGURATION
# ============================================================================
# Uncomment to configure build behavior
# [build]
# # Asset naming pattern: [name], [hash], [ext]
# naming = { asset = "[name]-[hash].[ext]" }
# # Public path for static assets (adjust for CDN if needed)
# publicPath = "/"
# # Target runtime environment
# target = "bun"

# ============================================================================
# LOADER DOCUMENTATION
# ============================================================================
# Bun automatically handles these file types:
# - .ts, .tsx, .js, .jsx -> TypeScript/JavaScript transpilation
# - .json, .jsonc, .json5 -> Parsed as JavaScript objects
# - .toml, .yaml, .yml -> Configuration files (parsed as objects)
# - .css -> Stylesheet (bundled)
# - .html -> Static asset or text
# - .wasm -> WebAssembly module
# - .node -> Native addon (NAPI)
# - .sqlite -> Database file
#
# Usage with import attributes:
# import config from "./config.toml" with { type: "toml" };
# import wasmModule from "./module.wasm" with { type: "wasm" };

# ============================================================================
# DEVELOPMENT SERVER (Optional)
# ============================================================================
# [dev]
# # Enable Hot Module Replacement
# hmr = true
```

---

### 1.2 Update Root tsconfig.json (Documentation)

Add comments to clarify Bun-specific settings:

```json
{
  "compilerOptions": {
    // ========================================================================
    // LANGUAGE & RUNTIME
    // ========================================================================
    "target": "ES2024",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],

    // Bun built-in types
    "types": ["bun-types"],

    // ========================================================================
    // MODULE RESOLUTION
    // ========================================================================
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,

    // ========================================================================
    // JSX CONFIGURATION
    // ========================================================================
    // For React (default - handled by Bun)
    "jsx": "react",
    "jsxFactory": "React.createElement",
    "jsxFragmentFactory": "React.Fragment",
    "jsxImportSource": "react",
    // Note: Override per-file with pragmas:
    // // @jsx h
    // // @jsxImportSource preact

    // ========================================================================
    // TYPE CHECKING & SAFETY
    // ========================================================================
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  }
}
```

---

### 1.3 Create Bun Features Documentation

**File**: `docs/bun/RUNTIME_FEATURES.md` (NEW)

```markdown
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
```

---

## Phase 2: Plugin System Implementation

### 2.1 Create Bun Plugin Architecture

**File**: `packages/luminosity-cli/src/plugins/bun-loader.ts` (NEW)

```typescript
/**
 * Bun plugin for loading Gravito configuration and schema files
 */
import type { Plugin, PluginBuilder, OnLoadArgs } from "bun";

export interface GravitoPluginConfig {
  validateSchemas?: boolean;
  debug?: boolean;
}

/**
 * Main plugin for Gravito loaders
 */
export const createGravitoPlugin = (config: GravitoPluginConfig = {}): Plugin => {
  return {
    name: "gravito-loader",
    setup(build: PluginBuilder) {
      // Load .gravito.config.ts files
      build.onLoad({ filter: /\.gravito\.config\.ts$/ }, (args: OnLoadArgs) => {
        if (config.debug) {
          console.log(`[gravito-loader] Loading config: ${args.path}`);
        }
        // Config is loaded as normal TypeScript
        // Validation happens at runtime
        return undefined; // Use default behavior
      });

      // Optional: Schema validation
      if (config.validateSchemas) {
        build.onLoad({ filter: /\.schema\.ts$/ }, (args: OnLoadArgs) => {
          if (config.debug) {
            console.log(`[gravito-loader] Validating schema: ${args.path}`);
          }
          return undefined;
        });
      }
    },
  };
};

/**
 * Export plugins for use in build config
 */
export const gravitoPlugins = [createGravitoPlugin()];
```

---

### 2.2 Usage Documentation

**File**: `docs/bun/PLUGIN_USAGE.md` (NEW)

```markdown
# Bun Plugin Usage in Gravito

## Overview
Plugins enable custom file loading and build-time processing.

## Built-in Gravito Plugin

### Installation
```ts
// bunfig.toml
[build]
plugins = ["./packages/luminosity-cli/src/plugins/bun-loader.ts"]
```

### Usage
```ts
import { createGravitoPlugin } from "@gravito/luminosity-cli";

const plugin = createGravitoPlugin({
  validateSchemas: true,
  debug: false,
});
```

## Creating Custom Plugins

### Example: YAML Schema Loader
```ts
import type { Plugin } from "bun";

export const yamlSchemaPlugin: Plugin = {
  name: "yaml-schema",
  setup(build) {
    build.onLoad(
      { filter: /\.schema\.ya?ml$/ },
      async (args) => {
        const yaml = await import("yaml");
        const content = await Bun.file(args.path).text();
        const data = yaml.parse(content);
        return {
          contents: `export default ${JSON.stringify(data)}`,
          loader: "js",
        };
      }
    );
  },
};
```
```

---

## Phase 3: File System Router Integration

### 3.1 Astral FSR Adapter

**File**: `packages/astral/src/routing/file-system-router.ts` (NEW)

```typescript
/**
 * File System Router adapter for Astral static site generation
 */
import { FileSystemRouter } from "bun";

export interface AstralRouterConfig {
  dir: string;
  origin: string;
  assetPrefix?: string;
  fileExtensions?: string[];
}

export class AstralFileSystemRouter {
  private router: FileSystemRouter;

  constructor(config: AstralRouterConfig) {
    this.router = new Bun.FileSystemRouter({
      style: "nextjs",
      dir: config.dir,
      origin: config.origin,
      assetPrefix: config.assetPrefix || "/",
      fileExtensions: config.fileExtensions || [".ts", ".tsx", ".md"],
    });
  }

  /**
   * Match a pathname and return route metadata
   */
  match(pathname: string) {
    return this.router.match(pathname);
  }

  /**
   * Get all available routes
   */
  async getAllRoutes() {
    // Scanner would enumerate all files in configured directory
    const routes = [];
    // Implementation details...
    return routes;
  }

  /**
   * Reload routes (useful for dev server)
   */
  reload() {
    this.router.reload();
  }
}

// Usage example
export const createAstralRouter = (dir: string, origin: string) => {
  return new AstralFileSystemRouter({
    dir,
    origin,
    fileExtensions: [".ts", ".tsx", ".md"],
  });
};
```

---

## Phase 4: Documentation & Examples

### 4.1 Quick Start Guide

**File**: `docs/bun/QUICK_START.md` (NEW)

```markdown
# Bun Quick Start for Developers

## Running Scripts

```bash
# Auto-installs dependencies on first run
bun run scripts/check-versions.ts

# Specific version
bun run scripts/validate-docs.ts
```

## Using Import Attributes

```ts
// Config file
import config from "./app.toml" with { type: "toml" };

// Database
import db from "./data.sqlite" with { type: "sqlite" };
```

## JSX in Multiple Frameworks

React (default):
```tsx
export const App = () => <div>React</div>;
```

Preact (file-specific):
```tsx
// @jsxImportSource preact
export const App = () => <div>Preact</div>;
```

## File System Router

```ts
import { FileSystemRouter } from "bun";

const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./pages",
});

const match = router.match("/about");
```
```

---

### 4.2 Examples Updates

Update existing examples to demonstrate:
- [x] Auto-install in scripts
- [x] Import attributes for configs
- [x] JSX in different frameworks
- [x] Plugin usage

---

## Implementation Checklist

### Phase 1: Configuration (1-2 hours)
- [ ] Update `bunfig.toml` with comprehensive comments
- [ ] Add JSX pragma documentation to tsconfig.json
- [ ] Create `docs/bun/RUNTIME_FEATURES.md`
- [ ] Create `docs/bun/QUICK_START.md`

### Phase 2: Plugin System (3-4 hours)
- [ ] Create `packages/luminosity-cli/src/plugins/bun-loader.ts`
- [ ] Write plugin usage documentation
- [ ] Add plugin examples

### Phase 3: File System Router (2-3 hours)
- [ ] Create Astral FSR adapter
- [ ] Update routing examples
- [ ] Document FSR integration points

### Phase 4: Documentation (2-3 hours)
- [ ] Update CLAUDE.md with Bun best practices link
- [ ] Add to docs/operations/ index
- [ ] Create example scripts using new features

### Phase 5: Testing & Validation (1-2 hours)
- [ ] Test all file type handling
- [ ] Verify plugin loading works
- [ ] FSR routing validation
- [ ] CI pipeline verification

---

## Estimated Total Time: 9-15 hours

**Priority Order**:
1. Phase 1 (Quick wins, documentation)
2. Phase 2 (Plugin architecture)
3. Phase 3 (FSR - if routing needs standardization)
4. Phase 4 (Documentation & polish)

---

## Success Criteria

✅ All new Bun features documented
✅ Plugin system tested and working
✅ Examples updated to show best practices
✅ No breaking changes to existing code
✅ CI pipeline passes with new configs
✅ Developers can reference guides for Bun-specific features

---

## Related Files to Review

- `bunfig.toml` - Current minimal config
- `biome.json` - Well-configured, no changes needed
- `tsconfig.json` - Add JSX documentation
- `CLAUDE.md` - Add Bun best practices section
- `docs/` - Add new Bun-specific guides
