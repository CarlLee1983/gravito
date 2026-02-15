import { execSync } from 'node:child_process'

console.log('Building @gravito/impulse...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT full DTS to avoid memory exhaustion
  execSync(
    'npx tsup src/index.ts --format esm,cjs --external @gravito/photon,zod,@gravito/core --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate d.ts files manually
  console.log('Generating .d.ts files...')
  const fs = await import('node:fs')

  // Generate index.d.ts with proper type exports
  const indexDts = `/**
 * @gravito/impulse - Form Request Validation & Middleware
 * @packageDocumentation
 */

// Main Classes
export declare class FormRequest<T = any> {
  constructor();
  validate(ctx: any, options?: any): Promise<any>;
  authorized(ctx: any): Promise<boolean>;
  failing(errors: any): any;
  failed(errors: any): any;
  passesAuthorization(): Promise<boolean>;
  failsAuthorization(): Promise<boolean>;
  failsValidation(data: any): Promise<boolean>;
  passesValidation(data: any): Promise<boolean>;
  getErrorMessages(): Record<string, string[]>;
  hasErrors(): boolean;
  errors(): Record<string, string[]>;
  all(): T;
  only(...keys: string[]): Partial<T>;
  except(...keys: string[]): Partial<T>;
  input(key: string, defaultValue?: any): any;
  has(key: string): boolean;
  filled(key: string): boolean;
  isArray(key: string): boolean;
  isNotEmpty(key: string): boolean;
}

// Types & Interfaces
export type {
  FormRequestConstructor,
  FormRequestOptions,
  MiddlewareHandler,
  ValidateFunction,
  ValidationResult,
  AuthorizationResult,
} from './types';

// Middleware Factory
export declare function validateRequest<T>(
  RequestClass: new () => FormRequest<T>,
  options?: { partial?: boolean }
): MiddlewareHandler;

// Decorators
export declare function Validate(): any;

// Exceptions
export declare class FormRequestException extends Error {
  constructor(message: string);
}

export declare class ValidationException extends Error {
  errors: Record<string, string[]>;
  constructor(message: string, errors?: Record<string, string[]>);
}

export declare class AuthorizationException extends Error {
  constructor(message: string);
}
`

  fs.writeFileSync('dist/index.d.ts', indexDts)

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}

process.exit(0)
