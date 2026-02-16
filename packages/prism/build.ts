import { execSync } from 'node:child_process'
import { spawn } from 'bun'

console.log('Building @gravito/prism...')

// Clean dist
await Bun.$`rm -rf dist`

const external = [
  '@gravito/core',
  '@gravito/photon',
  'react',
  'react-dom',
  'react/jsx-dev-runtime',
  'react/jsx-runtime',
  'vue',
]

// Use tsup for multi-format build
const tsup = spawn(
  [
    'npx',
    'tsup',
    'src/index.ts',
    'src/vue.ts',
    '--format',
    'esm,cjs',
    '--external',
    external.join(','),
    '--outDir',
    'dist',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const tsupCode = await tsup.exited
if (tsupCode !== 0) {
  console.error('❌ tsup build failed')
  process.exit(1)
}

// Generate .d.ts files
console.log('Generating .d.ts files...')
const fs = await import('node:fs')

const indexDts = `/**
 * @gravito/prism - Standard View Orbit for Gravito
 * @packageDocumentation
 */

import type { GravitoOrbit } from '@gravito/core';

export interface ViewConfig {
  basePath?: string;
  cacheViews?: boolean;
  cacheDuration?: number;
}

export interface ViewRenderer {
  render(view: string, data?: Record<string, any>, options?: Record<string, any>): string;
}

export interface OrbitPrismOptions {
  viewPath?: string;
  cacheDuration?: number;
  cacheViews?: boolean;
}

export class PrismViewEngine {
  constructor(config?: ViewConfig);
  render(view: string, data?: Record<string, any>, options?: Record<string, any>): string;
  renderFile(path: string, data?: Record<string, any>): string;
}

export class OrbitPrism implements GravitoOrbit {
  constructor(options?: OrbitPrismOptions);
  register(): void;
  boot(): Promise<void>;
}

export default PrismViewEngine;
`

const vueDts = `/**
 * @gravito/prism/vue - Vue.js Support for Prism
 * @packageDocumentation
 */

export interface VueViewConfig {
  basePath?: string;
  cacheViews?: boolean;
  cacheDuration?: number;
}

export interface VueViewRenderer {
  render(view: string, data?: Record<string, any>): string;
}

export class PrismVueEngine {
  constructor(config?: VueViewConfig);
  render(view: string, data?: Record<string, any>): string;
}

export default PrismVueEngine;
`

fs.writeFileSync('dist/index.d.ts', indexDts)
fs.writeFileSync('dist/vue.d.ts', vueDts)

console.log('✅ Build complete!')
process.exit(0)
