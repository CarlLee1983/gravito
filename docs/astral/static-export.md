# Astral Static OpenAPI Export

Gravito's `@gravito/astral` module natively supports exporting your API specifications and Swagger UI into entirely static HTML/JSON files. This provides immense benefits for API documentation:

- **Zero Runtime Overhead**: No need to dynamically compile schemas or API routes on each request.
- **Offline Capability**: Optionally bundle Swagger UI's CSS and JS files instead of relying on external CDNs.
- **Cheap & Scalable Hosting**: Deploy documentation directly to GitHub Pages, Cloudflare Pages, Amazon S3, or any static file host.

## How It Works

Astral provides a `generateStaticSite` utility that can be configured to produce `openapi.json` and a fully functioning styled `index.html` referencing that JSON.

## Step-by-Step Guide

### 1. Create a Build Script

Create a script file (e.g. `scripts/build-docs.ts`) to boot up your framework and trigger the static export.

```typescript
import { OrbitAstral, astral } from '@gravito/astral'
import { defineConfig, PlanetCore } from '@gravito/core'
import { join } from 'node:path'
import { z } from 'zod'

const exampleContract = astral.resource('/api/hello', {
  operations: {
    index: {
      summary: 'Hello world endpoint',
      status: 200,
      output: z.object({
        message: z.string()
      }),
    },
  },
})

const astralOrbit = OrbitAstral.configure({
  title: 'CI/CD Static Documentation API',
  version: '1.0.0',
  contracts: [exampleContract],
  // Optional: Set to true if deploying to an offline/air-gapped environment
  bundleOfflineAssets: true, 
})

async function runStaticExport() {
  const config = defineConfig({
    config: { APP_NAME: 'Docs Builder' },
    orbits: [astralOrbit],
  })

  const core = await PlanetCore.boot(config)
  const outputDir = join(process.cwd(), 'dist', 'docs')
  
  await astralOrbit.exportStatic(core, outputDir)
  
  console.log('Static export complete.')
  process.exit(0)
}

runStaticExport().catch(console.error)
```

### 2. Add to package.json

Add a script entry to easily trigger this step.

```json
{
  "scripts": {
    "build:docs": "bun run scripts/build-docs.ts"
  }
}
```

### 3. CI/CD Integration

In your CI pipeline, simply run this build step and publish the `dist/docs` directory.

#### Pre-bake For Production Servers

If you still want to serve your documentation from a live API server without generating it dynamically at runtime, use the `specFilePath` configuration variable.

```typescript
const astralOrbit = OrbitAstral.configure({
  title: 'My Live API Docs',
  contracts: [...],
  specFilePath: './dist/docs/openapi.json'
})
```

When `specFilePath` is defined, the OpenAPI runtime generation is skipped, significantly reducing application memory usage and startup time.
