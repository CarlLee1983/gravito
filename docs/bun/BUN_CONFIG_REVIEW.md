# Bun Configuration Review & Enhancement Report

**Branch**: `bun-runtime-alignment`
**Date**: 2026-02-23
**Bun Version**: 1.3.9
**Scope**: Full audit against Bun official documentation

---

## Executive Summary

✅ **Overall Status**: Well-aligned with Bun best practices
⚠️ **Opportunities**: Moderate - Missing File System Router integration and some runtime optimizations
🎯 **Recommendation**: Add FSR support for better routing, expand file-type handling, document plugin architecture

---

## 1. File Types & Loaders Assessment

### Current State
**bunfig.toml**:
```toml
[test]
timeout = "10000ms"
root = "."

[install]
production = false
```

✅ **Working Well**:
- Auto-detection of `.ts`, `.tsx`, `.js`, `.jsx` files (implicit)
- `.json`, `.jsonc`, `.json5`, `.toml`, `.yaml` files are parsed correctly
- CSS handling via Biome (Tailwind directives enabled)
- Bun defined as global in biome.json (line 169)

### Gaps Identified

1. **No explicit import attribute handling documented**
   - Missing guidance on `with { type: "..." }` syntax
   - No examples for:
     - `.html` files
     - `.wasm` modules
     - `.node` (NAPI bindings)
     - `.sqlite` databases

2. **Asset naming not configured**
   - No `naming.asset` in bunfig.toml
   - Assets default to `[hash].[ext]` (implicit)
   - **Action**: Consider documenting asset strategy if CDN-based

3. **Text file handling undocumented**
   - No examples for `.txt` or `.md` imports
   - Could be useful for templates, emails

### Recommendation
```toml
# Add to bunfig.toml with documentation
# Explicit file type handling for clarity
[loader]
# These are automatic, but documenting helps developers
# .html -> treats as text/static asset
# .wasm -> loads as WebAssembly module
# .node -> NAPI binding
# .sqlite -> database file (with import attributes)
```

---

## 2. File System Router Integration

### Current State
❌ **NOT IMPLEMENTED**

Gravito uses:
- Turbo for monorepo orchestration ✅
- Hono for HTTP handling (Photon package) ✅
- No explicit file-system routing layer detected

### Bun FileSystemRouter Overview
```ts
const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./pages",
  origin: "https://mydomain.com",
  assetPrefix: "_next/static/",
  fileExtensions: [".ts", ".tsx"]
});
```

### Use Cases for Gravito
1. **Astral** (static site generator)
   - Current: Manual route building
   - **Opportunity**: Use FSR for `pages/` directory convention

2. **Photon** (HTTP engine)
   - Current: Hono-based routing
   - **Integration**: FSR as optional routing layer for filesystem-based APIs

3. **Examples & Templates**
   - Current: Various patterns
   - **Opportunity**: FSR could standardize routing convention

### Recommendation
```ts
// packages/astral/src/router.ts (NEW)
import { FileSystemRouter } from "bun";

export function createAssetRouter(dir: string) {
  return new Bun.FileSystemRouter({
    style: "nextjs",
    dir,
    fileExtensions: [".ts", ".tsx", ".md"],
  });
}

// Usage in templates:
// pages/
//   ├── index.tsx -> /
//   ├── about.tsx -> /about
//   └── [slug].tsx -> /blog/:slug
```

---

## 3. JSX Configuration Assessment

### Current State
✅ **GOOD**: Comprehensive JSX support in biome.json

```json
// biome.json (lines 168-180)
{
  "javascript": {
    "globals": ["Bun"],
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "es5",
      "semicolons": "asNeeded",
      "arrowParentheses": "always",
      "bracketSameLine": false,
      "quoteStyle": "single",
      "attributePosition": "auto",
      "bracketSpacing": true
    }
  }
}
```

### Against Bun JSX Standards

| Requirement | Current | Status | Notes |
|---|---|---|---|
| JSX transpilation | Implicit (Bun default) | ✅ | Bun handles `.tsx` automatically |
| `jsxFactory` | Not set (React default) | ✅ | OK for React usage |
| `jsxImportSource` | Not set (React default) | ✅ | Matches biome config |
| `jsxFragmentFactory` | Not set (Fragment default) | ✅ | Standard |
| File-level pragmas | Not documented | ⚠️ | Could support Preact via `// @jsx` |
| Double quotes for JSX | ✅ biome.json | ✅ | Aligns with Bun recommendation |

### Gaps

1. **No per-file JSX overrides documented**
   ```tsx
   // @jsx h
   // @jsxFrag Fragment
   // @jsxImportSource preact
   ```

2. **No support for alternative JSX libraries documented**
   - Preact not mentioned
   - Solid.js not mentioned
   - Vue not supported (but present in codebase)

3. **Vue/Svelte/Template handling**
   - `biome.json` line 54 disables linting for `.vue` and `.svelte`
   - These are present in examples/ and templates/
   - Should document Bun's limitations here

### Recommendation
```json
// Add to tsconfig.json or bunfig.toml documentation
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "React.createElement",
    "jsxFragmentFactory": "React.Fragment",
    "jsxImportSource": "react"
  }
}
```

**For alternative frameworks**, document:
```tsx
// ✅ React (default)
export const Component = () => <div>Hello</div>;

// ⚠️ Preact (requires per-file pragma)
// @jsxImportSource preact
export const Component = () => <div>Hello</div>;

// ℹ️ Vue/Svelte (not transpiled by Bun runtime - handled by bundler)
```

---

## 4. Auto-install Feature Assessment

### Current State
✅ **ENABLED**: Bun auto-install is active

Evidence:
- No explicit disabling in `bunfig.toml`
- `bun.lock` exists and is version-controlled
- Scripts use `bun` directly (e.g., `bun run scripts/...`)

### Bun Auto-install Features
1. ✅ **Version Resolution**: Checks `bun.lock` → `package.json` → Latest
2. ✅ **Global Cache**: `~/.bun/install/cache/` contains installed packages
3. ✅ **24-hour TTL**: Latest tags validated every 24h
4. ⚠️ **Semver ranges in imports**: Not currently used

### Gaps

1. **No documented explicit version imports**
   ```ts
   // Could use for test isolation
   import { z } from "zod@3.0.0";
   ```

2. **No auto-install CLI guidance**
   - Developers may not know about this feature
   - Could reduce friction for CLI scripts

3. **Production mode inconsistency**
   ```toml
   [install]
   production = false  # Installs devDependencies
   ```
   - OK for monorepo development
   - Should document: Use `production = true` in CI for size optimization

### Recommendation
```toml
# bunfig.toml - Add documentation comments
[install]
# production = false: Install devDependencies (for development)
# production = true: Skip devDependencies (for CI/deployment)
production = false

# Optional: Lock behavior
# frozen = true: Require exact versions from bun.lock
# frozen = false: Update if needed
```

---

## 5. Plugin System Assessment

### Current State
❌ **NOT IMPLEMENTED** - No custom plugins detected

Checked locations:
- `packages/*/src/*plugin*.ts` → No matches
- `scripts/*plugin*.ts` → No matches
- Build configs → No plugin definitions

### Bun Plugin Capabilities

Bun supports plugins for:
- Custom loaders (e.g., `.yml` → `import config from "./config.yml"`)
- CSS extraction and processing
- Framework-level macros (Astro, SolidStart, etc.)
- Custom file type handling

### Use Cases for Gravito

1. **Custom Loader for `.gravito.config` files**
   ```ts
   // plugins/gravito-config-loader.ts
   export default {
     name: "gravito-config",
     setup(build) {
       build.onLoad({ filter: /\.gravito\.config\.ts$/ }, (args) => {
         // Custom config processing
       });
     },
   };
   ```

2. **CSS-in-JS Processing**
   - If using CSS modules or styled-components
   - Plugin could optimize CSS extraction

3. **ORM Schema Validation**
   - Atlas (ORM) could validate schemas at build time
   - Plugin could warn about schema issues

### Recommendation
```ts
// packages/luminosity-cli/plugins/gravito-loader.ts (NEW)
import type { Plugin } from "bun";

export const gravitoPlugin: Plugin = {
  name: "gravito-config-loader",
  setup(build) {
    build.onLoad(
      { filter: /\.gravito\.config\.ts$/ },
      async (args) => {
        // Load and validate Gravito config
        console.log(`Loading config: ${args.path}`);
        return { contents: "" };
      }
    );
  },
};

// Usage in bunfig.toml:
// [build]
// plugins = ["./plugins/gravito-loader.ts"]
```

---

## 6. TSConfig & Type Handling

### Current State
✅ **GOOD**: TypeScript is well-configured

Evidence:
- `bun-types` in devDependencies
- `bun` global in biome.json
- 64 packages with `tsconfig.json`

### Against Bun Standards

| Feature | Status | Details |
|---|---|---|
| ES2024 target | ✅ | Bun supports modern JS |
| `skipLibCheck` | ✅ | Not blocking |
| `strict` mode | ✅ | `noUnusedLocals` enabled (CLAUDE.md) |
| `noImplicitAny` | ✅ | Enforced |
| `.d.ts generation` | ✅ | `build:dts` task exists |

### Bun-specific TypeScript Features
1. ✅ `/// <reference types="bun" />`
2. ✅ `import * as Bun from "bun"`
3. ⚠️ Not explicitly documented in tsconfig.json comments

### Recommendation
```json
{
  "compilerOptions": {
    // Bun compatibility
    "lib": ["es2024", "dom", "dom.iterable"],
    "target": "es2024",

    // Bun built-ins
    "types": ["bun-types"],

    // Type safety
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

## 7. Build Configuration Alignment

### Current bunfig.toml
```toml
[test]
timeout = "10000ms"
root = "."

[install]
production = false
```

### Missing Sections (from Bun Docs)

#### A. `[build]` Section
```toml
[build]
# Asset naming pattern
naming = { asset = "[name]-[hash].[ext]" }
# Public path for assets
publicPath = "/"
# Target environment
target = "browser"  # or "node", "bun"
```

#### B. `[loader]` Section (Documentation)
```toml
[loader]
# Explicit documentation of supported types
# These work automatically, but good to document
# .html, .xml, .txt → "text"
# .json, .jsonc, .json5 → "json"
# .toml, .yaml, .yml → auto-parsed
# .wasm → "wasm"
# .node → "napi"
```

#### C. `[dev]` Section
```toml
[dev]
hmr = true  # Hot module replacement
reload = true  # Full reload on change
```

### Recommendation
```toml
[test]
timeout = "10000ms"
root = "."

[install]
production = false

# Build configuration
[build]
# Naming pattern for assets
naming = { asset = "[name]-[hash].[ext]" }
# Public path (usually "/" for SPAs)
publicPath = "/"
# Target runtime
target = "bun"

# Development server options
[dev]
hmr = true
```

---

## 8. Bun-specific Optimizations

### Current Optimizations
✅ In use:
- Parallel build via Turbo
- TypeScript strict mode
- Biome for linting
- Caching via Turbo Remote Cache (Phase 3B completed)

### Additional Opportunities

1. **Import Optimization**
   ```ts
   // Could use Bun's import caching
   import { expensive } from "library";
   // Bun caches parse result
   ```

2. **Native Module Loading**
   - Gravito has `.node` files in dependencies (e.g., better-sqlite3)
   - Bun handles natively - could document

3. **Hot Module Replacement (HMR)**
   - Not currently configured in bunfig.toml
   - Could improve dev server experience

---

## Summary Table: Bun Feature Coverage

| Feature | Current | Recommended | Priority |
|---|---|---|---|
| File Types Support | ✅ Implicit | 📝 Document | Low |
| File System Router | ❌ None | 🚀 Implement | Medium |
| JSX Configuration | ✅ Good | 📝 Expand pragmas | Low |
| Auto-install | ✅ Active | 📝 Document | Low |
| Plugin System | ❌ None | 🚀 Create loader | High |
| TSConfig/Types | ✅ Good | ✅ OK | - |
| Build Config | ⚠️ Minimal | 🔧 Expand | Medium |
| Dev Server | ❌ None | 📝 Document | Low |

---

## Action Items

### 🔴 High Priority
- [ ] Create Bun plugin loader architecture
- [ ] Document plugin usage in packages/luminosity-cli

### 🟡 Medium Priority
- [ ] Evaluate File System Router for Astral
- [ ] Expand bunfig.toml with build/dev sections
- [ ] Update docs with Bun file-type handling

### 🟢 Low Priority
- [ ] Document per-file JSX pragmas
- [ ] Add auto-install examples to CLI
- [ ] Create asset naming conventions

---

## Related Files
- Current: `/bunfig.toml` (7 lines)
- Current: `/biome.json` (198 lines - well-configured)
- Related: `/packages/*/tsconfig.json` (TypeScript configs)
- Related: `/CLAUDE.md` (Project guidelines)

---

## Conclusion

Gravito-core is well-positioned on Bun 1.3.9. The foundation is solid with:
- ✅ Proper TypeScript setup
- ✅ Active auto-install
- ✅ Good JSX/formatter configuration
- ✅ Type safety enforcement

**Next steps** should focus on:
1. Plugin system for custom loading
2. File System Router integration for routing standardization
3. Enhanced documentation of Bun runtime features

These changes will modernize the framework and provide developers with more Bun-native tooling.
