const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/core DTS...' : 'Building @gravito/core in parallel...')

// Clean dist
await Bun.$`rm -rf dist`

// Build main and engine in parallel (independent builds)
async function buildInParallel() {
  const format = isDtsOnly ? 'esm' : 'esm,cjs'

  // Task 1: Build main entry point (src/index.ts + src/compat.ts)
  const mainBuildPromise = (async () => {
    const args = ['bunx', 'tsup', 'src/index.ts', 'src/compat.ts', '--format', format]

    if (isDtsOnly) {
      args.push('--dts', '--dts-only')
    } else {
      args.push('--dts')
    }

    args.push(
      '--shims',
      '--external',
      '@gravito/photon',
      '--external',
      'bun:test',
      '--external',
      'bun:sqlite',
      '--outDir',
      'dist'
    )

    try {
      await Bun.$`${args}`
      return 0
    } catch (_error) {
      console.error('❌ tsup main build failed')
      return 1
    }
  })()

  // Task 2: Build engine entry point (src/engine/index.ts)
  const engineBuildPromise = (async () => {
    const engineFormat = isDtsOnly ? 'esm' : 'esm,cjs'
    const engineArgs = ['bunx', 'tsup', 'src/engine/index.ts', '--format', engineFormat]

    if (isDtsOnly) {
      engineArgs.push('--dts', '--dts-only')
    } else {
      engineArgs.push('--dts')
    }

    engineArgs.push(
      '--shims',
      '--external',
      '@gravito/photon',
      '--external',
      'bun:test',
      '--outDir',
      'dist/engine'
    )

    try {
      await Bun.$`${engineArgs}`
      return 0
    } catch (_error) {
      console.error('❌ tsup engine build failed')
      return 1
    }
  })()

  // Task 3: Build FFI entry point (src/ffi/index.ts)
  const ffiBuildPromise = (async () => {
    const ffiFormat = isDtsOnly ? 'esm' : 'esm,cjs'
    const ffiArgs = ['bunx', 'tsup', 'src/ffi/index.ts', '--format', ffiFormat]

    if (isDtsOnly) {
      ffiArgs.push('--dts', '--dts-only')
    } else {
      ffiArgs.push('--dts')
    }

    ffiArgs.push('--shims', '--external', 'bun:ffi', '--minify', '--outDir', 'dist/ffi')

    try {
      await Bun.$`${ffiArgs}`
      return 0
    } catch (_error) {
      console.error('❌ tsup ffi build failed')
      return 1
    }
  })()

  // Wait for all builds
  const [mainResult, engineResult, ffiResult] = await Promise.all([
    mainBuildPromise,
    engineBuildPromise,
    ffiBuildPromise,
  ])

  if (mainResult !== 0 || engineResult !== 0 || ffiResult !== 0) {
    process.exit(1)
  }
}

// Execute parallel build
await buildInParallel()

console.log('✅ Build complete!')
process.exit(0)
