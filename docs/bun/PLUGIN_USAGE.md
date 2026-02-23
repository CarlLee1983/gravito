# Bun Plugin Usage Guide for Gravito

Learn how to use and create Bun plugins for Gravito development.

Reference: [Bun Plugins Documentation](https://bun.sh/docs/runtime/plugins)

---

## Overview

Bun plugins enable custom file loading, source transformation, and build-time processing. Gravito provides a plugin architecture for common use cases.

### Key Concepts

- **Lifecycle Hooks**: `onStart`, `onResolve`, `onLoad`, `onBeforeParse`
- **Filters**: RegExp patterns to match files
- **Namespaces**: Organize module resolution (e.g., `file`, `http`, `gravito`)
- **Loaders**: Determine how content is processed (`js`, `ts`, `json`, `wasm`, etc.)

---

## Quick Start

### Using Default Gravito Plugins

```typescript
// bunfig.toml or Bun build config
import { gravitoPlugins } from '@gravito/luminosity-cli/plugins';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  plugins: gravitoPlugins,  // Includes config + schema loaders
});
```

### Available Default Plugins

1. **Gravito Config Loader** - Loads `.gravito.config.ts` files
2. **Schema Validator** - Validates `.schema.ts` files

---

## Configuration Plugin

### What It Does

Loads and processes Gravito configuration files (`.gravito.config.ts`).

### Usage

```typescript
import { createGravitoConfigPlugin } from '@gravito/luminosity-cli/plugins';

const plugin = createGravitoConfigPlugin({
  debug: true,
  validateSchemas: true,
});

await Bun.build({
  entrypoints: ['./src/index.ts'],
  plugins: [plugin],
});
```

### Configuration File Example

```typescript
// gravito.config.ts
export default {
  framework: 'gravito',
  database: {
    driver: 'postgresql',
    host: 'localhost',
    port: 5432,
  },
  features: {
    authentication: true,
    authorization: true,
    caching: true,
  },
};
```

### In Your Application

```typescript
// src/index.ts
import config from './gravito.config.ts';

console.log(`Using ${config.framework}`);
console.log(`Database: ${config.database.driver}`);
```

---

## Schema Validation Plugin

### What It Does

Validates schema files at build time, catching inconsistencies early.

### Usage

```typescript
import { createSchemaValidationPlugin } from '@gravito/luminosity-cli/plugins';

const plugin = createSchemaValidationPlugin({
  debug: true,
});

await Bun.build({
  entrypoints: ['./src/index.ts'],
  plugins: [plugin],
});
```

### Schema File Example

```typescript
// database.schema.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
```

---

## Custom File Loaders

### Create a YAML Loader

Load YAML files as JavaScript objects:

```typescript
import { createCustomLoaderPlugin } from '@gravito/luminosity-cli/plugins';
import { parse as parseYaml } from 'yaml';

const yamlLoaderPlugin = createCustomLoaderPlugin(
  '.yml',
  async (content) => {
    const data = parseYaml(content);
    return `export default ${JSON.stringify(data)};`;
  }
);
```

### Usage

```typescript
// config.yml
database:
  host: localhost
  port: 5432

// src/index.ts
import config from './config.yml';
console.log(config.database.host);  // "localhost"
```

### Create a Markdown Loader

Transform Markdown into HTML:

```typescript
import { createCustomLoaderPlugin } from '@gravito/luminosity-cli/plugins';
import { marked } from 'marked';

const markdownLoaderPlugin = createCustomLoaderPlugin(
  '.md',
  async (content) => {
    const html = await marked(content);
    return `export default ${JSON.stringify(html)};`;
  }
);
```

### Usage

```typescript
// docs/guide.md
# Getting Started

Welcome to Gravito!

// src/index.ts
import guide from './docs/guide.md';
console.log(guide);  // HTML string
```

---

## Namespace Resolvers

### Create a Virtual Module Namespace

Resolve custom import protocols:

```typescript
import { createNamespaceResolverPlugin } from '@gravito/luminosity-cli/plugins';

const gravitoNamespacePlugin = createNamespaceResolverPlugin(
  'gravito:',
  async (specifier) => {
    // Resolve gravito:config -> path/to/gravito/config
    return `${process.cwd()}/gravito/${specifier}`;
  }
);
```

### Usage

```typescript
// Import using custom namespace
import config from 'gravito:config.ts';
import models from 'gravito:models/user.ts';
```

### Create an HTTP Module Namespace

Load modules from HTTP URLs:

```typescript
import { createNamespaceResolverPlugin } from '@gravito/luminosity-cli/plugins';

const httpNamespacePlugin = createNamespaceResolverPlugin(
  'http://',
  async (specifier) => {
    const response = await fetch(`http://${specifier}`);
    const module = await response.text();
    // Cache and return module path
    return module;
  }
);
```

---

## Source Transformers

### Add Global Imports

Automatically inject imports into specific files:

```typescript
import { createSourceTransformerPlugin } from '@gravito/luminosity-cli/plugins';

const globalImportPlugin = createSourceTransformerPlugin(
  /\.page\.ts$/,
  async (source) => {
    return `import { useRouter } from '@gravito/photon';\n${source}`;
  }
);
```

### Instrument Code

Add instrumentation for logging or tracing:

```typescript
const instrumentationPlugin = createSourceTransformerPlugin(
  /\.instrumented\.ts$/,
  async (source) => {
    return `
import { trace } from '@gravito/tracing';
const __trace = trace('${filename}');

${source}
    `.trim();
  }
);
```

---

## Plugin Factory

### Use the Plugin Factory

The `PluginFactory` provides convenient factory methods:

```typescript
import { PluginFactory } from '@gravito/luminosity-cli/plugins';

// Create individual plugins
const configPlugin = PluginFactory.config({ debug: true });
const schemaPlugin = PluginFactory.schema();
const yamlPlugin = PluginFactory.customLoader('.yml', transformer);

// Get default plugins
const defaultPlugins = PluginFactory.default();

// Use in Bun build
await Bun.build({
  entrypoints: ['./src/index.ts'],
  plugins: [configPlugin, schemaPlugin, yamlPlugin],
});
```

---

## Advanced Usage

### Combining Multiple Plugins

```typescript
import {
  createGravitoConfigPlugin,
  createSchemaValidationPlugin,
  createCustomLoaderPlugin,
} from '@gravito/luminosity-cli/plugins';
import { parse as parseYaml } from 'yaml';

const plugins = [
  // Load config files
  createGravitoConfigPlugin({ debug: true }),

  // Validate schemas
  createSchemaValidationPlugin({ debug: true }),

  // Load YAML files
  createCustomLoaderPlugin('.yml', async (content) => {
    const data = parseYaml(content);
    return `export default ${JSON.stringify(data)};`;
  }),

  // Load environment configs
  createCustomLoaderPlugin('.env.json', async (content) => {
    const data = JSON.parse(content);
    return `export default ${JSON.stringify(data)};`;
  }),
];

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  plugins,
});
```

### Plugin Development Best Practices

```typescript
import type { Plugin } from 'bun';

// ✅ DO: Use clear naming
const myCustomPlugin: Plugin = {
  name: 'my-namespace-my-feature',  // Hierarchical
  setup(build) {
    // Implementation
  },
};

// ✅ DO: Document what the plugin does
/**
 * Loads .custom files and transforms them
 */
const customFilePlugin: Plugin = {
  name: 'custom-loader',
  setup(build) {
    build.onLoad({ filter: /\.custom$/ }, async (args) => {
      // Process file
      return { contents: '', loader: 'js' };
    });
  },
};

// ✅ DO: Handle errors gracefully
build.onLoad({ filter: /\.risky$/ }, async (args) => {
  try {
    const file = Bun.file(args.path);
    const content = await file.text();
    return { contents: process(content), loader: 'js' };
  } catch (error) {
    console.error(`Failed to load ${args.path}:`, error);
    throw error;
  }
});

// ❌ DON'T: Ignore errors silently
build.onLoad({ filter: /\.data$/ }, async (args) => {
  const file = Bun.file(args.path);  // Could throw
  const content = await file.text();  // Could throw
  return { contents: content, loader: 'js' };
});
```

---

## Troubleshooting

### Plugin Not Triggering

**Problem**: Your plugin's `onLoad` is never called.

```typescript
// ❌ Wrong: Filter too specific
build.onLoad({ filter: /\.config\.toml\.ts$/ }, ...);
// Only matches files ending exactly with .config.toml.ts

// ✅ Correct: Match the intended pattern
build.onLoad({ filter: /\.config\.ts$/ }, ...);
// Matches any .config.ts file
```

### Content Not Transformed

**Problem**: Plugin loads but content isn't transformed.

```typescript
// ❌ Wrong: Forgot to return contents
build.onLoad({ filter: /\.custom$/ }, async (args) => {
  const file = Bun.file(args.path);
  const content = await file.text();
  // Missing return!
});

// ✅ Correct: Return the transformed contents
build.onLoad({ filter: /\.custom$/ }, async (args) => {
  const file = Bun.file(args.path);
  const content = await file.text();
  return {
    contents: `export default ${JSON.stringify(content)};`,
    loader: 'js',
  };
});
```

### Circular Dependencies

**Problem**: Plugin creates circular imports.

```typescript
// ❌ Wrong: Plugin loads files that import the config
// gravito.config.ts → src/index.ts → plugin tries to load gravito.config.ts

// ✅ Solution: Use separate plugin files
// gravito.config.ts (static config)
// src/plugins/loader.ts (plugin definition)
// src/index.ts (application code)
```

### Build Hangs

**Problem**: Async plugin operation never completes.

```typescript
// ❌ Wrong: Unhandled promise
build.onLoad({ filter: /\.async$/ }, async (args) => {
  fetch('http://example.com/data');  // Not awaited
  return { contents: '', loader: 'js' };
});

// ✅ Correct: Await async operations
build.onLoad({ filter: /\.async$/ }, async (args) => {
  const response = await fetch('http://example.com/data');
  const data = await response.json();
  return {
    contents: `export default ${JSON.stringify(data)};`,
    loader: 'js',
  };
});
```

---

## Real-World Examples

### Example 1: GraphQL Schema Loader

```typescript
import { createCustomLoaderPlugin } from '@gravito/luminosity-cli/plugins';
import { buildSchema } from 'graphql';

const graphqlLoaderPlugin = createCustomLoaderPlugin(
  '.graphql',
  async (content) => {
    const schema = buildSchema(content);
    return `export default ${JSON.stringify(schema)};`;
  }
);
```

### Example 2: Environment Configuration Loader

```typescript
import { createCustomLoaderPlugin } from '@gravito/luminosity-cli/plugins';

const envConfigPlugin = createCustomLoaderPlugin(
  '.env.config',
  async (content) => {
    const config = {};
    content.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      config[key] = value;
    });
    return `export default ${JSON.stringify(config)};`;
  }
);
```

### Example 3: Data File Transformer

```typescript
import { createCustomLoaderPlugin } from '@gravito/luminosity-cli/plugins';

const csvLoaderPlugin = createCustomLoaderPlugin(
  '.csv',
  async (content) => {
    const [headers, ...rows] = content.split('\n');
    const keys = headers.split(',');
    const data = rows.map((row) => {
      const values = row.split(',');
      return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    });
    return `export default ${JSON.stringify(data)};`;
  }
);
```

---

## Integration with Gravito Packages

### Using Plugins in Astral

```typescript
// astral build
import { gravitoPlugins } from '@gravito/luminosity-cli/plugins';

const config = {
  input: './pages',
  output: './dist',
  plugins: gravitoPlugins,
};
```

### Using Plugins in Photon

```typescript
// photon server config
import { gravitoPlugins } from '@gravito/luminosity-cli/plugins';

const server = new Photon({
  plugins: gravitoPlugins,
});
```

### Using Plugins in Atlas

```typescript
// atlas migration system
import { gravitoPlugins } from '@gravito/luminosity-cli/plugins';

const migrations = {
  plugins: gravitoPlugins,
  // Migration files loaded with plugin support
};
```

---

## Testing Plugins

```typescript
import { describe, it, expect } from 'bun:test';
import { createGravitoConfigPlugin } from '@gravito/luminosity-cli/plugins';

describe('Gravito Config Plugin', () => {
  it('should load config files', async () => {
    const plugin = createGravitoConfigPlugin();

    // Test plugin structure
    expect(plugin.name).toBe('gravito-config-loader');
    expect(typeof plugin.setup).toBe('function');

    // Plugin loading handled by Bun.build
  });
});
```

---

## Performance Considerations

1. **Async Operations**: Use sparingly to avoid build slowdown
2. **File I/O**: Cache results when possible
3. **Complex Transforms**: Consider build-time execution trade-offs
4. **Filter Specificity**: More specific filters = faster matching

---

## Related Resources

- [Bun Plugins Documentation](https://bun.sh/docs/runtime/plugins)
- [Runtime Features Guide](./RUNTIME_FEATURES.md)
- [Quick Start](./QUICK_START.md)
- [Gravito Architecture Docs](../../docs/claude/design.md)

---

## Next Steps

- Implement custom plugins for your use case
- Integrate plugins into your build pipeline
- Share plugin implementations across teams
- Contribute plugins back to Gravito community
