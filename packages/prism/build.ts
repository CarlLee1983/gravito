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

import type { GravitoOrbit, PlanetCore } from '@gravito/core';

export interface CacheOptions {
  enabled?: boolean;
  maxSize?: number;
}

export interface SSGOptions {
  concurrency?: number;
  timeout?: number;
  incremental?: boolean;
  manifestPath?: string;
}

export interface OrbitPrismOptions {
  cache?: CacheOptions;
  ssg?: SSGOptions;
}

export interface HelperFunction {
  (context: any, ...args: any[]): any;
}

export interface RenderContext {
  [key: string]: any;
}

export class TemplateEngine {
  constructor(viewsDir: string, cacheOptions?: CacheOptions);
  render(template: string, context?: RenderContext): string;
  renderFile(filePath: string, context?: RenderContext): string;
  registerHelper(name: string, fn: HelperFunction): void;
}

export interface ExportOptions {
  routes?: string[];
  outputDir?: string;
}

export class StaticSiteGenerator {
  constructor(core: PlanetCore);
  export(options?: ExportOptions): Promise<void>;
}

export class OrbitPrism implements GravitoOrbit {
  constructor(options?: OrbitPrismOptions);
  install(core: PlanetCore): void;
}

export interface CompiledMetadata {
  source: string;
  compiled: string;
}

export interface CompilerOptions {
  minify?: boolean;
}

export class TemplateCompiler {
  static compile(template: string, options?: CompilerOptions): CompiledMetadata;
}

export class TemplateCache {
  constructor(maxSize?: number);
  get(key: string): any;
  set(key: string, value: any): void;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class Image {
  constructor(props: ImageProps);
}

export interface ImageProps {
  src: string;
  alt: string;
  [key: string]: any;
}

export interface ImageOptions {
  [key: string]: any;
}

export class ImageService {
  constructor(options?: ImageOptions);
  transform(url: string, options?: any): string;
}

export interface ImageCDNLoader {
  (url: string, options?: any): string;
}

export type TransformOptions = Record<string, any>;

export const defaultLoader: ImageCDNLoader;

export interface DynamicRoute {
  path: string;
  params: Record<string, any>;
}

export class DynamicRouteResolver {
  resolve(path: string): ResolvedRoute | null;
}

export interface ResolvedRoute {
  route: string;
  params: Record<string, any>;
}

export class IncrementalBuilder {
  build(): Promise<void>;
}

export interface ArtDirectionConfig {
  [key: string]: any;
}

export interface CDNLoaderOptions {
  [key: string]: any;
}

export interface PlaceholderOptions {
  [key: string]: any;
}

export interface BuildManifest {
  [key: string]: any;
}

export interface DynamicRouteConfig {
  [key: string]: any;
}

export interface PageEntry {
  [key: string]: any;
}

export interface ResolvedRouteConfig {
  [key: string]: any;
}

export interface SSGExportOptions {
  [key: string]: any;
}

export interface RenderOptions {
  [key: string]: any;
}

export class Sanitizer {
  constructor(options?: SanitizerOptions);
  sanitize(html: string): string;
}

export interface SanitizerOptions {
  [key: string]: any;
}

export function sanitizeHtml(html: string, options?: SanitizerOptions): string;
export function stripHtmlTags(html: string): string;

export function createImageHelper(): HelperFunction;
export function createSanitizeHelper(): HelperFunction;

export function calculateLQIPDimensions(width: number, height: number): [number, number];
export function calculateMinLQIPSize(width: number, height: number): number;
export function generateColorPlaceholder(color: string): string;
export function generatePlaceholderStyles(width: number, height: number): Record<string, string>;
export function hexToRGB(hex: string): [number, number, number];

export { TemplateEngine, StaticSiteGenerator, OrbitPrism };
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
