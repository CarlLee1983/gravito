/**
 * Type-only exports.
 *
 * Important: this file exports types only and must not import any runtime dependencies.
 * This prevents frontend bundlers from failing when importing types (since the frontend runtime
 * does not include Bun/Node APIs).
 *
 * Use `import type` to ensure only type information is imported.
 */
import type { AppRoutes } from './app'

/**
 * Application routes type.
 * Inferred from `app.ts`, containing full type information for all API endpoints.
 */
export type { AppRoutes }
