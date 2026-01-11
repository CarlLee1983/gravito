import type { FormRequestClass } from '@gravito/core'
import type { ZodSchema } from 'zod'

/**
 * Operation definition for a specific route/method
 */
export interface AstralOperation {
  summary?: string
  description?: string
  tags?: string[]
  input?: FormRequestClass | ZodSchema
  output?: ZodSchema | ZodSchema[]
  errors?: Record<number, string | ZodSchema>
}

/**
 * Resource contract mapping paths to operations
 */
export interface AstralResource {
  path: string
  tags?: string[]
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
 * Global Astral configuration
 */
export interface AstralConfig {
  title?: string
  version?: string
  description?: string
  contracts?: AstralResource[]
  uiPath?: string
  jsonPath?: string
}
