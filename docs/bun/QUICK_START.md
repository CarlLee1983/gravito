# Bun Quick Start for Gravito Developers

Learn the most useful Bun features for developing with Gravito Core.

---

## Running Scripts

Bun auto-installs dependencies, so you can run scripts immediately:

```bash
# No need to npm install first!
bun run scripts/check-versions.ts

bun run scripts/validate-docs.ts

bun run packages/scaffold/src/index.ts
```

---

## Importing Configuration Files

### TOML (Recommended for Config)

```typescript
// my-script.ts
import config from "./gravito.config.toml" with { type: "toml" };

console.log(config.framework);
console.log(config.database);
```

```toml
# gravito.config.toml
framework = "gravito"
database = "postgresql"

[paths]
src = "src"
dist = "dist"
```

### YAML

```typescript
// my-script.ts
import settings from "./settings.yaml" with { type: "yaml" };

console.log(settings.apiUrl);
```

```yaml
# settings.yaml
apiUrl: https://api.example.com
debug: false
```

### JSON

```typescript
// Automatic with .json extension
import pkg from "./package.json";

console.log(pkg.name);  // "gravito-monorepo"
```

---

## Using JSX in Different Frameworks

### React (Default)

```tsx
// components/Button.tsx - Uses React automatically
export const Button = ({ label }) => (
  <button className="btn">{label}</button>
);
```

### Preact (Alternative)

```tsx
// @jsx h
// @jsxImportSource preact
import { h } from "preact";

export const Button = ({ label }) => (
  <button className="btn">{label}</button>
);
```

### When to Use Per-File Pragmas

Use pragmas when you need to:
- Mix multiple frameworks in one project
- Use a different rendering library (Preact, Solid, etc.)
- Override global JSX settings for specific files

---

## Auto-Install Examples

No `bun.lock` or `package.json` required for scripts:

### Simple Script

```typescript
// validate-schema.ts
import { z } from "zod";

const Schema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const result = Schema.parse({
  name: "Alice",
  email: "alice@example.com",
});

console.log("✅ Valid:", result);
```

Run it:
```bash
bun validate-schema.ts
```

### With Version Specification

```typescript
// Use specific versions to avoid surprises
import { z } from "zod@3.0.0";
import { redis } from "redis@^4.6.0";
```

### Version Resolution Order

1. `bun.lock` (if version pinned)
2. `package.json` (in parent directories)
3. Latest from npm (checked every 24h)

---

## File Types Supported

### Always Works

```typescript
// TypeScript/JavaScript
import { helper } from "./util.ts";
import { Component } from "./comp.tsx";

// Configuration
import env from "./config.json";
import settings from "./config.yaml";

// Static files (returns content as string)
import html from "./template.html";
```

### With Import Attributes

```typescript
// Explicit type specification
import wasm from "./module.wasm" with { type: "wasm" };
import db from "./data.sqlite" with { type: "sqlite" };
import data from "./file" with { type: "json" };
```

---

## Writing Bun-Native Code

### File System Operations

```typescript
// Read file as string
const content = await Bun.file("./README.md").text();

// Read file as bytes
const buffer = await Bun.file("./image.png").arrayBuffer();

// Write file
await Bun.write("./output.txt", "Hello, Bun!");

// File metadata
const file = Bun.file("./package.json");
console.log(file.size);
console.log(file.type);
```

### Running Shell Commands

```typescript
// Execute command
const proc = Bun.spawn(["echo", "Hello"]);
console.log(await new Response(proc.stdout).text());

// Alternative: Using the spawnSync for immediate results
const result = Bun.spawnSync({
  cmd: ["ls", "-la"],
});
console.log(result.stdout.toString());
```

### Using Environment Variables

```typescript
// Access env vars
const apiKey = process.env.API_KEY;
const debug = process.env.DEBUG === "true";

// Required env var with fallback
const port = process.env.PORT || "3000";
```

---

## Common Development Tasks

### Checking Dependencies

```bash
# Use auto-install to run scripts without setup
bun run scripts/check-versions.ts

# Or create a script that uses bun.lock
bun run check  # Uses turbo to run check across packages
```

### Validating Configuration

```typescript
// validate-config.ts
import config from "./gravito.config.toml" with { type: "toml" };
import { z } from "zod";

const ConfigSchema = z.object({
  framework: z.enum(["gravito", "express", "hono"]),
  database: z.enum(["postgresql", "mysql", "sqlite"]),
});

ConfigSchema.parse(config);
console.log("✅ Config is valid");
```

### Building a Package

```bash
# Turbo handles build orchestration
bun run build

# Build one package
cd packages/core
bun run build

# Watch mode (if available)
bun run build --watch
```

---

## IDE Integration

### VS Code

1. Install Bun extension: `oven.bun-vscode`
2. Select Bun as default test runner (settings.json):
   ```json
   {
     "[typescript]": {
       "editor.defaultFormatter": "biomejs.biome",
       "editor.formatOnSave": true
     }
   }
   ```

### TypeScript Support

Bun provides full TypeScript support:
- Auto-transpilation of `.ts` files
- Type checking with TypeScript compiler
- JSX support with proper typing

---

## Tips & Tricks

### 1. Use Bun for One-Off Scripts

Don't create npm scripts for quick tests:

```bash
# ✅ Fast - auto-installs on first run
bun check-version.ts

# ❌ Slow - requires setup
npm install zod && node check-version.js
```

### 2. Specify Versions for Reproducibility

```typescript
// Good for CI and team consistency
import { z } from "zod@3.22.4";
```

### 3. Use Import Attributes for Clarity

```typescript
// ✅ Clear what type of file
import config from "./config.toml" with { type: "toml" };

// ⚠️ Implicit (works but less clear)
import config from "./config.toml";
```

### 4. Combine with Turbo

Bun works seamlessly with Turbo for monorepo builds:

```bash
# Turbo orchestrates builds using bun
bun run build

# Parallel execution with Turbo Remote Cache
turbo run build --cache-dir=.turbo
```

---

## Common Issues

### "Module not found" During Auto-install

**Solution**: Check that the package exists on npm, or add to `package.json`

```typescript
// ✅ This works (public npm package)
import { z } from "zod";

// ❌ This fails (private package not in npm)
import pkg from "@my-org/private-pkg";
```

### JSX Compiling Wrong Library

**Solution**: Use pragma to specify framework

```tsx
// ✅ Explicit
// @jsxImportSource preact
export const Component = () => <div>Preact</div>;

// ❌ Ambiguous
export const Component = () => <div>Unknown</div>;
```

### Slow First Run

**Expected**: First run is slower (downloading packages)

```bash
# First run: ~5-10 seconds (downloads dependencies)
bun my-script.ts

# Subsequent runs: <500ms (uses cache)
bun my-script.ts
```

---

## Next Steps

- Read [RUNTIME_FEATURES.md](./RUNTIME_FEATURES.md) for detailed feature docs
- Check [bunfig.toml](../bunfig.toml) for runtime configuration
- See [Bun Official Docs](https://bun.sh/docs) for advanced topics

---

## Cheat Sheet

```bash
# Run TypeScript directly
bun run script.ts

# Run with auto-install
bun run scripts/check.ts

# Execute test file
bun test

# Build a package
bun run build

# Type check
bun run typecheck

# Format code
bun run format

# Import config (in any TypeScript file)
import config from "./app.toml" with { type: "toml" };
```

```typescript
// JSX with Preact (per-file)
// @jsxImportSource preact

// Read/Write files
await Bun.file("./path").text();
await Bun.write("./path", content);

// Environment variables
process.env.API_KEY

// Run commands
Bun.spawn(["echo", "hello"]);
```

---

**More help?** Check the [Bun official documentation](https://bun.sh/docs)
