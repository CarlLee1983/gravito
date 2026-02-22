/**
 * Example script demonstrating how to invoke OrbitAstral static export for CI/CD environments.
 *
 * Usage:
 * bun run scripts/build-docs.ts
 */

import { join } from 'node:path'
import { defineConfig, PlanetCore } from '@gravito/core'
import { astral, OrbitAstral } from '../src'
import { z } from 'zod'

// 1. Define typical API contracts
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

// 2. Configure Astral Orbit
const astralOrbit = OrbitAstral.configure({
  title: 'CI/CD Static Documentation API',
  version: '1.0.0',
  contracts: [exampleContract],
  bundleOfflineAssets: true,
})

async function runStaticExport() {
  console.log('Building PlanetCore environment...')

  // 3. Boot planet core with orbits
  const config = defineConfig({
    config: {
      APP_NAME: 'Docs Builder',
    },
    orbits: [astralOrbit],
  })

  const core = await PlanetCore.boot(config)

  // Register routes manually if necessary, or just rely on Astral contracts auto-generation
  core.router.get('/api/hello', (ctx) => {
    return ctx.json({ message: 'Hello World' })
  })

  // 4. Export static files to desired directory (e.g., dist/docs)
  const outputDir = join(process.cwd(), 'dist', 'docs')
  console.log(`Starting static export to ${outputDir}...`)

  await astralOrbit.exportStatic(core, outputDir)

  console.log('Done! Ready to be served or deployed to a CDN (GitHub Pages, S3, Netlify).')
  process.exit(0)
}

runStaticExport().catch((err) => {
  console.error('Failed to export static site:', err)
  process.exit(1)
})
