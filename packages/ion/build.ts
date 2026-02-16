import { spawn } from 'bun'

console.log('Building @gravito/ion...')

// Clean dist
await Bun.$`rm -rf dist`

// Use tsup for multi-format build
const tsup = spawn(
  [
    'npx',
    'tsup',
    'src/index.ts',
    '--format',
    'esm,cjs',
    '--external',
    '@gravito/core,@gravito/photon,@gravito/prism',
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

// Generate .d.ts file
console.log('Generating .d.ts file...')
const fs = await import('node:fs')

const indexDts = `/**
 * @gravito/ion - Forms & Validation Orbit for Gravito
 * @packageDocumentation
 */

import type { GravitoOrbit } from '@gravito/core';

export interface FormField {
  name: string;
  type: string;
  value?: any;
  rules?: string[];
  messages?: Record<string, string>;
}

export interface FormConfig {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  action: string;
  fields: FormField[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class IonForm {
  constructor(config: FormConfig);
  validate(): ValidationResult;
  render(): string;
}

export function createForm(config: FormConfig): IonForm;

// Inertia Service for React/Vue integration
export interface InertiaProps {
  [key: string]: any;
}

export interface InertiaOptions {
  layout?: string;
  headers?: Record<string, string>;
}

export class InertiaService {
  render(component: string, props?: InertiaProps, options?: InertiaOptions): string;
}

export class InertiaError extends Error {
  readonly code?: string;
}

export class InertiaConfigError extends InertiaError {}

// Orbit registration
export interface OrbitIonOptions {
  layout?: string;
  viewPath?: string;
}

export class OrbitIon implements GravitoOrbit {
  constructor(options?: OrbitIonOptions);
  register(): void;
  boot(): Promise<void>;
}
`

fs.writeFileSync('dist/index.d.ts', indexDts)

console.log('✅ Build complete!')
process.exit(0)
