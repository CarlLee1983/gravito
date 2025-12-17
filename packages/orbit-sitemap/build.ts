import dts from 'bun-plugin-dts';

console.log('Building @gravito/orbit-sitemap...');

// Clean dist
await Bun.$`rm -rf dist`;

// Build ESM
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  naming: '[name].mjs',
  plugins: [dts()],
});

// Build CJS
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'cjs',
  naming: '[name].cjs',
});

console.log('Build complete!');
