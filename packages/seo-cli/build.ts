import { writeFile } from 'node:fs/promises'
import { build } from 'bun'

// Build main entry
await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['@gravito/seo-core', 'commander', 'picocolors'],
})

// Build CLI binary (without banner, we'll add shebang manually)
const cliBuild = await build({
  entrypoints: ['bin/gravito-seo.ts'],
  outdir: 'dist/bin',
  format: 'esm',
  target: 'node',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['@gravito/seo-core', 'commander', 'picocolors'],
})

// Add shebang to CLI binary if not already present
if (cliBuild.outputs && cliBuild.outputs.length > 0) {
  const cliFile = cliBuild.outputs[0].path
  const content = await Bun.file(cliFile).text()
  // Only add shebang if not already present
  const withShebang = content.startsWith('#!/usr/bin/env node')
    ? content
    : `#!/usr/bin/env node\n${content}`
  await writeFile(cliFile, withShebang)
  // Make executable
  await Bun.spawn(['chmod', '+x', cliFile]).exited
}

console.log('📝 Generating type declarations...')
const tsc = Bun.spawn(['bunx', 'tsc', '--emitDeclarationOnly', '--skipLibCheck'], {
  stdout: 'inherit',
  stderr: 'inherit',
})
const exitCode = await tsc.exited
if (exitCode !== 0) {
  console.warn('⚠️  Type generation had warnings, but continuing...')
}

console.log('✅ Build completed')
process.exit(0)
