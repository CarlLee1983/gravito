import { cp, rm } from 'node:fs/promises'
import { build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

// Clean dist
await rm('dist', { recursive: true, force: true })

// Parallel build: JS/TS and type declarations can run simultaneously
// since they output to different directories
async function buildInParallel() {
  if (isDtsOnly) {
    console.log('📝 Generating type declarations only...')
  } else {
    console.log('🔨 Building JS and type declarations in parallel...')
  }

  const tempDir = isDtsOnly ? 'dist' : '.tsc-temp'
  if (!isDtsOnly) {
    await rm(tempDir, { recursive: true, force: true })
  }

  // Start both processes in parallel
  const tasks: Promise<number>[] = []

  // Task 1: bun build (JS/TS)
  if (!isDtsOnly) {
    const buildPromise = (async () => {
      const buildResult = await build({
        entrypoints: [
          'src/index.ts',
          'src/core/types.ts',
          'src/handlers/ElementHandler.ts',
          'src/handlers/TextHandler.ts',
          'src/handlers/DocumentHandler.ts',
          'src/middleware/index.ts',
          'src/rules/index.ts',
        ],
        outdir: 'dist',
        format: 'esm',
        target: 'node',
        splitting: false,
        minify: process.env.NODE_ENV === 'production',
        sourcemap: 'external',
        external: ['@gravito/core'],
      })

      if (!buildResult.success) {
        console.error('❌ JS/TS build failed:', buildResult.logs)
        return 1
      }
      return 0
    })()
    tasks.push(buildPromise)
  }

  // Task 2: tsc (type declarations)
  const tscPromise = (async () => {
    const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.json', '--outDir', tempDir], {
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: import.meta.dirname,
    })
    return await tsc.exited
  })()
  tasks.push(tscPromise)

  // Wait for all tasks to complete
  const results = await Promise.all(tasks)

  // Check if any task failed
  for (const result of results) {
    if (result !== 0) {
      process.exit(1)
    }
  }
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
      try {
        await import('node:fs/promises').then((m) => m.mkdir(destPath, { recursive: true }))
      } catch (_e) {
        // ignore if already exists
      }
      await copyDtsFiles(srcPath, destPath)
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      await cp(srcPath, destPath)
    }
  }
}

// Execute parallel build
await buildInParallel()

// Post-build cleanup and file reorganization
const tempDir = isDtsOnly ? 'dist' : '.tsc-temp'
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

console.log('✅ Ether build completed')
