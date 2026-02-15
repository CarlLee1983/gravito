import { execSync } from 'node:child_process'

console.log('Building @gravito/core...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT to avoid memory exhaustion
  // Full DTS generation is too memory-intensive for CI
  execSync(
    'npx tsup src/index.ts src/compat.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --external bun:sqlite --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate d.ts files for index and compat separately
  // This avoids memory exhaustion from full DTS generation
  console.log('Generating .d.ts files...')
  const fs = await import('node:fs')

  // Generate compat.d.ts with proper type exports
  const compatDts = `/**
 * @fileoverview Type Compatibility Layer
 *
 * This module provides type aliases for backward compatibility with
 * code that directly imports from Photon. Users can gradually migrate
 * to the Gravito abstractions.
 *
 * @module @gravito/core/compat
 * @since 2.0.0
 */

// Re-export Gravito types with Photon-style aliases for migration
export type ContentfulStatusCode = import('./http/types').ContentfulStatusCode;
export type Context = import('./http/types').GravitoContext;
export type GravitoContext = import('./http/types').GravitoContext;
export type GravitoErrorHandler = import('./http/types').GravitoErrorHandler;
export type Handler = import('./http/types').GravitoHandler;
export type GravitoHandler = import('./http/types').GravitoHandler;
export type MiddlewareHandler = import('./http/types').GravitoMiddleware;
export type GravitoMiddleware = import('./http/types').GravitoMiddleware;
export type Next = import('./http/types').GravitoNext;
export type GravitoNext = import('./http/types').GravitoNext;
export type GravitoNotFoundHandler = import('./http/types').GravitoNotFoundHandler;
export type GravitoRequest = import('./http/types').GravitoRequest;
export type Variables = import('./http/types').GravitoVariables;
export type GravitoVariables = import('./http/types').GravitoVariables;
export type HttpMethod = import('./http/types').HttpMethod;
export type StatusCode = import('./http/types').StatusCode;
export type ValidationTarget = import('./http/types').ValidationTarget;
`

  fs.writeFileSync('dist/compat.d.ts', compatDts)

  // For index.d.ts, write a minimal re-export to avoid huge file size
  // In production, this can be expanded via separate TypeScript build
  const indexDts = `/**
 * @gravito/core - The micro-kernel for the Galaxy Architecture
 * @packageDocumentation
 */

export const VERSION: string;

// HTTP Types & Adapters
export type {
  ContentfulStatusCode,
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNext,
  GravitoNotFoundHandler,
  GravitoRequest,
  GravitoVariables,
  HttpMethod,
  StatusCode,
  ValidationTarget,
} from './http/types';

export type {
  AdapterConfig,
  AdapterFactory,
  HttpAdapter,
  RouteDefinition,
} from './adapters/types';

// Core Classes
export { Application } from './Application';
export { CommandKernel } from './CommandKernel';
export { ConfigManager } from './ConfigManager';
export { Container } from './Container';
export { EventManager } from './EventManager';
export { GravitoServer } from './GravitoServer';
export { HookManager } from './HookManager';
export { PlanetCore } from './PlanetCore';

// Core Types
export type { ApplicationConfig } from './Application';
export type { GravitoConfig, GravitoOrbit, FormRequestClass } from './PlanetCore';
export type { CommandHandler } from './CommandKernel';
export type { Factory, ServiceKey, ServiceMap } from './Container';

// Event System
export {
  CircuitBreaker,
  CircuitBreakerState,
  DeadLetterQueue,
  EventPriorityQueue,
  DEFAULT_EVENT_OPTIONS,
} from './events';

export type {
  CircuitBreakerOptions,
  DLQEntry,
  DLQFilter,
  EventBackpressure,
  EventBackend,
  EventOptions,
  EventTask,
} from './events';

// Observability
export { EventMetrics, EventTracer, EventTracing, OTelEventMetrics } from './events/observability';
export { QueueDashboard } from './observability/QueueDashboard';

export type {
  EventTracingConfig,
  ObservabilityConfig,
  QueueDepthCallback,
} from './events/observability';

export type {
  DashboardSnapshot,
  QueueDashboardConfig,
  QueueMetrics,
} from './observability/QueueDashboard';

// Helpers
export {
  Arr,
  abort,
  abortIf,
  abortUnless,
  app,
  blank,
  config,
  dd,
  dump,
  env,
  filled,
  hasApp,
  logger,
  router,
  Str,
} from './helpers';

export * from './exceptions';
`

  fs.writeFileSync('dist/index.d.ts', indexDts)

  console.log('Building @gravito/core/engine...')

  // Build engine bundles
  execSync(
    'npx tsup src/engine/index.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --outDir dist/engine --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Ensure index.d.ts exports GravitoContext for downstream packages
  console.log('Ensuring .d.ts exports are available...')
  try {
    const indexDts = fs.readFileSync('dist/index.d.ts', 'utf-8')
    if (!indexDts.includes('GravitoContext')) {
      // If index.d.ts doesn't export the expected types, add them
      const additionalExports = `export type GravitoContext = any;
`
      fs.writeFileSync('dist/index.d.ts', additionalExports + indexDts)
    }
  } catch {
    // If file doesn't exist, create a stub
    fs.writeFileSync(
      'dist/index.d.ts',
      `export type GravitoContext = any;
`
    )
  }

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}
