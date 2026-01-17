import type { FormRequestClass } from '@gravito/core'
import type { ZodSchema } from 'zod'

/**
 * Operation definition for a specific route/method in an API contract.
 * @public
 */
export interface AstralOperation {
  /** Short summary of the operation */
  summary?: string
  /** Detailed description of the operation */
  description?: string
  /** Tags for categorization in the documentation UI */
  tags?: string[]
  /** Input validation schema (either a FormRequest class or a Zod schema) */
  input?: FormRequestClass | ZodSchema
  /** Output validation schema for successful responses */
  output?: ZodSchema | ZodSchema[]
  /** Map of error status codes to their respective descriptions or schemas */
  errors?: Record<number, string | ZodSchema>
  /** HTTP status code for a successful response (default: 200) */
  status?: number
  /** Schema for path parameters */
  params?: Record<string, ZodSchema>
}

/**
 * A resource contract that maps a base path to various operations (CRUD or custom).
 * @public
 */
export interface AstralResource {
  /** The base resource path (e.g., '/users') */
  path: string
  /** Default tags applied to all operations in this resource */
  tags?: string[]
  /** Map of operation names ('index', 'show', 'store', etc.) to their definitions */
  operations: {
    index?: AstralOperation
    show?: AstralOperation
    store?: AstralOperation
    update?: AstralOperation
    destroy?: AstralOperation
    [key: string]: AstralOperation | undefined
  }
}

/**
 * Global configuration for the Astral OpenAPI orbit.
 * @public
 */
export interface AstralConfig {
  /** The API title shown in the documentation UI */
  title?: string
  /** The API version string */
  version?: string
  /** Brief description of the entire API */
  description?: string
  /** List of predefined resource contracts */
  contracts?: AstralResource[]
  /** The URL path where the Swagger UI will be served (default: '/docs') */
  uiPath?: string
  /** The URL path where the OpenAPI JSON spec will be served (default: '/openapi.json') */
  jsonPath?: string
  /** Shorthand for uiPath */
  path?: string
}
