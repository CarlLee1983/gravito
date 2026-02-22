import { cp, rm } from 'node:fs/promises'
import { build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

// Clean dist
await rm('dist', { recursive: true, force: true })

// Build JS/TS using bun's build (skip if dts-only)
if (!isDtsOnly) {
  const buildResult = await build({
    entrypoints: [
      'src/index.ts',
      'src/client.ts',
      'src/logger.ts',
      'src/bun.ts',
      'src/jwt.ts',
      'src/http-exception.ts',
      'src/openapi.ts',
      'src/middleware/binary.ts',
      'src/middleware/circuit-breaker.ts',
      'src/middleware/htmx.ts',
      'src/middleware/otel.ts',
      'src/middleware/ratelimit-redis.ts',
      'src/middleware/ratelimit.ts',
      'src/middleware/sse.ts',
      'src/middleware/streaming.ts',
      'src/middleware/websocket.ts',
      'src/adapter/cloudflare.ts',
      'src/adapter/vercel.ts',
      'src/adapter/deno.ts',
      'src/router/reg-exp-router.ts',
      'src/router/trie-router.ts',
    ],
    outdir: 'dist',
    format: 'esm',
    target: 'node',
    splitting: false,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: 'external',
    external: ['hono', '@hono/zod-openapi', 'zod', 'cborg'],
  })

  if (!buildResult.success) {
    console.error('❌ Build failed:', buildResult.logs)
    process.exit(1)
  }
}

if (isDtsOnly) {
  console.log('📝 Generating type declarations...')
} else {
  console.log('📝 Generating type declarations...')
}

// Use temporary directory for tsc to avoid overwriting .js files
const tempDir = isDtsOnly ? 'dist' : '.tsc-temp'
if (!isDtsOnly) {
  await rm(tempDir, { recursive: true, force: true })
}

const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json', '--outDir', tempDir], {
  stdout: 'inherit',
  stderr: 'inherit',
  cwd: import.meta.dirname,
})

const exitCode = await tsc.exited
if (exitCode !== 0) {
  process.exit(1)
}

// Recursively copy .d.ts files from temp to dist, preserving directory structure
async function copyDtsFiles(src: string, dest: string) {
  const entries = await import('node:fs/promises').then((m) =>
    m.readdir(src, { withFileTypes: true })
  )

  for (const entry of entries) {
    const srcPath = `${src}/${entry.name}`
    const destPath = `${dest}/${entry.name}`

    if (entry.isDirectory()) {
      // Create directory in dest if it doesn't exist
      try {
        await import('node:fs/promises').then((m) => m.mkdir(destPath, { recursive: true }))
      } catch (_e) {
        // ignore if already exists
      }
      // Recursively copy files from subdirectory
      await copyDtsFiles(srcPath, destPath)
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      // Copy .d.ts files
      await cp(srcPath, destPath)
    }
  }
}

if (!isDtsOnly) {
  try {
    await copyDtsFiles(tempDir, 'dist')
    await rm(tempDir, { recursive: true, force: true })
  } catch (e) {
    console.warn('⚠️  Warning: Failed to copy type declarations:', e)
  }
}

// Move .js or .d.ts files from dist/src to dist root
async function moveFilesToRoot() {
  const srcDir = 'dist/src'
  try {
    const entries = await import('node:fs/promises').then((m) =>
      m.readdir(srcDir, { withFileTypes: true })
    )

    for (const entry of entries) {
      const srcPath = `${srcDir}/${entry.name}`
      const destPath = `dist/${entry.name}`

      if (entry.isDirectory()) {
        // Create subdirectory in dist if it doesn't exist
        try {
          await import('node:fs/promises').then((m) =>
            m.mkdir(`dist/${entry.name}`, { recursive: true })
          )
        } catch (_e) {
          // ignore
        }

        // Move files from subdirectory
        const subEntries = await import('node:fs/promises').then((m) =>
          m.readdir(srcPath, { withFileTypes: true })
        )
        for (const subEntry of subEntries) {
          const subSrcPath = `${srcPath}/${subEntry.name}`
          const subDestPath = `dist/${entry.name}/${subEntry.name}`

          if (subEntry.isFile()) {
            await import('node:fs/promises').then((m) => m.rename(subSrcPath, subDestPath))
          }
        }
      } else if (entry.isFile()) {
        await import('node:fs/promises').then((m) => m.rename(srcPath, destPath))
      }
    }

    // Remove src directory
    await rm(srcDir, { recursive: true, force: true })
  } catch (_e) {
    // If src doesn't exist, that's fine
  }
}

await moveFilesToRoot()

// Remove src directory completely from dist if it still exists
try {
  await rm('dist/src', { recursive: true, force: true })
} catch (_e) {
  // ignore
}

console.log('✅ Photon build completed')
