import { mkdir, rename, rm } from 'node:fs/promises'

const isDtsOnly = process.argv.includes('--dts-only')

async function moveWithRetry(from: string, to: string) {
  let lastError: unknown
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await rename(from, to)
      return
    } catch (error) {
      lastError = error
      await Bun.sleep(25)
    }
  }
  throw lastError
}

if (!isDtsOnly) {
  await rm('dist', { recursive: true, force: true })
  await mkdir('dist', { recursive: true })
}

async function runBuild() {
  const tasks: Promise<number>[] = []

  if (!isDtsOnly) {
    tasks.push(
      (async () => {
        const esm = Bun.spawn(
          [
            'bun',
            'build',
            'src/index.ts',
            '--outfile',
            'dist/index.mjs',
            '--target',
            'node',
            '--format',
            'esm',
            '--external',
            '@gravito/core',
            '--external',
            '@opentelemetry/api',
            '--external',
            'ioredis',
            '--external',
            'cborg',
            '--external',
            'msgpackr',
            '--external',
            'protobufjs',
            '--external',
            'ws',
            '--sourcemap',
          ],
          {
            stdout: 'inherit',
            stderr: 'inherit',
            cwd: import.meta.dirname,
          }
        )

        if ((await esm.exited) !== 0) {
          console.error('❌ ESM build failed')
          return 1
        }

        await moveWithRetry('src/index.mjs', 'dist/index.mjs')
        await moveWithRetry('src/index.mjs.map', 'dist/index.mjs.map')

        const cjs = Bun.spawn(
          [
            'bun',
            'build',
            'src/index.ts',
            '--outfile',
            'dist/index.js',
            '--target',
            'node',
            '--format',
            'cjs',
            '--external',
            '@gravito/core',
            '--external',
            '@opentelemetry/api',
            '--external',
            'ioredis',
            '--external',
            'cborg',
            '--external',
            'msgpackr',
            '--external',
            'protobufjs',
            '--external',
            'ws',
            '--sourcemap',
          ],
          {
            stdout: 'inherit',
            stderr: 'inherit',
            cwd: import.meta.dirname,
          }
        )

        if ((await cjs.exited) !== 0) {
          console.error('❌ CJS build failed')
          return 1
        }

        await moveWithRetry('src/index.js', 'dist/index.js')
        await moveWithRetry('src/index.js.map', 'dist/index.js.map')

        return 0
      })()
    )
  }

  tasks.push(
    (async () => {
      const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json', '--outDir', 'dist'], {
        stdout: 'inherit',
        stderr: 'inherit',
        cwd: import.meta.dirname,
      })
      return await tsc.exited
    })()
  )

  const results = await Promise.all(tasks)
  for (const result of results) {
    if (result !== 0) {
      process.exit(1)
    }
  }
}

await runBuild()

console.log('✅ Quasar build completed')
