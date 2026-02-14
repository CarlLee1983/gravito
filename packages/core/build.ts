import { execSync } from 'child_process'

console.log('Building @gravito/core...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles
  execSync(
    'npx tsup src/index.ts src/compat.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --external bun:sqlite --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  console.log('Building @gravito/core/engine...')

  // Build engine bundles
  execSync(
    'npx tsup src/engine/index.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --outDir dist/engine --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate type declaration files
  // These are minimal - full types come from source during type checking
  const indexStub = `declare module '@gravito/core' {
  export * from '../../src/index';
}`

  const compatStub = `declare module '@gravito/core/compat' {
  export * from '../../src/compat';
}`

  const engineStub = `declare module '@gravito/core/engine' {
  export * from '../../../src/engine/index';
}`

  await Bun.write('dist/index.d.ts', indexStub)
  await Bun.write('dist/compat.d.ts', compatStub)
  await Bun.write('dist/engine/index.d.ts', engineStub)

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}
