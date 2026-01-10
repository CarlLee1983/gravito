/**
 * @fileoverview Gravito Core Engine - Public API
 *
 * The High-Performance Web Engine for Bun
 *
 * @module @gravito/core/engine
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { Gravito } from '@gravito/core/engine'
 *
 * const app = new Gravito()
 *
 * app.get('/', (c) => c.json({ message: 'Hello, World!' }))
 *
 * export default app
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// Main Engine Class
// ─────────────────────────────────────────────────────────────────────────────

export { Gravito } from './Gravito'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type {
  EngineOptions,
  ErrorHandler,
  FastContext,
  FastRequest,
  Handler,
  Middleware,
  NotFoundHandler,
  RouteMatch,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Advanced Exports (for power users)
// ─────────────────────────────────────────────────────────────────────────────

export { AOTRouter } from './AOTRouter'
export { FastContext as FastContextImpl } from './FastContext'
export { MinimalContext } from './MinimalContext'
export { extractPath } from './path'
export { ObjectPool } from './pool'
