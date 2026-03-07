import type { Context, Env, MiddlewareHandler } from '@gravito/photon'
import { tbValidator } from '@hono/typebox-validator'
import type { Static, TBoolean, TInteger, TNumber, TSchema } from '@sinclair/typebox'
import { Type } from '@sinclair/typebox'

/**
 * String to Number Coercion Helper.
 *
 * Converts a string value from query or params to a JavaScript Number.
 *
 * @param value - The string value to coerce
 * @returns The converted number, or NaN if conversion fails
 *
 * @example
 * ```typescript
 * coerceNumber('123') // 123
 * coerceNumber('12.34') // 12.34
 * coerceNumber('abc') // NaN
 * ```
 */
export function coerceNumber(value: string): number {
  const num = Number(value)
  return Number.isNaN(num) ? NaN : num
}

/**
 * String to Integer Coercion Helper.
 *
 * Converts a string value from query or params to a JavaScript Number (Integer).
 *
 * @param value - The string value to coerce
 * @returns The converted integer, or NaN if conversion fails
 *
 * @example
 * ```typescript
 * coerceInteger('123') // 123
 * coerceInteger('12.99') // 12
 * coerceInteger('abc') // NaN
 * ```
 */
export function coerceInteger(value: string): number {
  const num = Number.parseInt(value, 10)
  return Number.isNaN(num) ? NaN : num
}

/**
 * String to Boolean Coercion Helper.
 *
 * Converts a string value from query or params to a JavaScript Boolean.
 * Supports multiple common boolean string representations.
 *
 * @param value - The string value to coerce
 * @returns The converted boolean value
 *
 * @example
 * ```typescript
 * coerceBoolean('true') // true
 * coerceBoolean('1') // true
 * coerceBoolean('yes') // true
 * coerceBoolean('false') // false
 * coerceBoolean('0') // false
 * coerceBoolean('no') // false
 * coerceBoolean('') // false
 * ```
 */
export function coerceBoolean(value: string): boolean {
  const lowerValue = value.toLowerCase().trim()
  return ['true', '1', 'yes', 'on'].includes(lowerValue)
}

/**
 * String to Date Coercion Helper.
 *
 * Converts a string date (ISO 8601) from query or params to a JavaScript Date object.
 *
 * @param value - The string value (ISO 8601 format)
 * @returns The converted Date object, or Invalid Date if conversion fails
 *
 * @example
 * ```typescript
 * coerceDate('2024-01-15') // Date object
 * coerceDate('2024-01-15T10:30:00Z') // Date object
 * coerceDate('invalid') // Invalid Date
 * ```
 */
export function coerceDate(value: string): Date {
  return new Date(value)
}

/**
 * Creates a Number Schema with Automatic Coercion.
 *
 * Builds a TypeBox Number schema that automatically converts string input to number before validation.
 * Suitable for query and param validation where data sources are string-based.
 *
 * @param options - TypeBox Number schema options
 * @returns TypeBox Number schema (with automatic coercion)
 *
 * @example Query Parameter Coercion
 * ```typescript
 * const searchSchema = Schema.Object({
 *   page: CoercibleNumber({ minimum: 1, default: 1 }),
 *   limit: CoercibleNumber({ minimum: 1, maximum: 100, default: 20 })
 * })
 *
 * app.get('/search', validate('query', searchSchema), (c) => {
 *   const { page, limit } = c.req.valid('query')
 *   // page and limit are typed as number
 *   return c.json({ page, limit })
 * })
 * ```
 */
export function CoercibleNumber(
  options?: Partial<TNumber['properties']> & { default?: number }
): TNumber {
  return Type.Number({
    ...options,
    // Use transform to convert data before validation
    [Symbol.for('TypeBox.Transform')]: coerceNumber,
  }) as TNumber
}

/**
 * Creates an Integer Schema with Automatic Coercion.
 *
 * Builds a TypeBox Integer schema that automatically converts string input to integer before validation.
 *
 * @param options - TypeBox Integer schema options
 * @returns TypeBox Integer schema (with automatic coercion)
 *
 * @example
 * ```typescript
 * const schema = Schema.Object({
 *   userId: CoercibleInteger({ minimum: 1 })
 * })
 * ```
 */
export function CoercibleInteger(
  options?: Partial<TInteger['properties']> & { default?: number }
): TInteger {
  return Type.Integer({
    ...options,
    [Symbol.for('TypeBox.Transform')]: coerceInteger,
  }) as TInteger
}

/**
 * Creates a Boolean Schema with Automatic Coercion.
 *
 * Builds a TypeBox Boolean schema that automatically converts string input to boolean before validation.
 *
 * @param options - TypeBox Boolean schema options
 * @returns TypeBox Boolean schema (with automatic coercion)
 *
 * @example
 * ```typescript
 * const schema = Schema.Object({
 *   active: CoercibleBoolean({ default: false }),
 *   published: CoercibleBoolean()
 * })
 * ```
 */
export function CoercibleBoolean(
  options?: Partial<TBoolean['properties']> & { default?: boolean }
): TBoolean {
  return Type.Boolean({
    ...options,
    [Symbol.for('TypeBox.Transform')]: coerceBoolean,
  }) as TBoolean
}

/**
 * Performs Automatic Data Coercion.
 *
 * Traverses the object and automatically converts string data to corresponding types
 * based on the schema definition. Primarily used for pre-processing query and param data.
 *
 * @param data - The raw data object
 * @param schema - The TypeBox schema definition
 * @returns The coerced data object
 *
 * @example
 * ```typescript
 * const schema = Type.Object({
 *   page: Type.Number(),
 *   limit: Type.Number(),
 *   active: Type.Boolean()
 * })
 *
 * const raw = { page: '1', limit: '20', active: 'true' }
 * const coerced = coerceData(raw, schema)
 * // { page: 1, limit: 20, active: true }
 * ```
 */
export function coerceData<T extends TSchema>(data: unknown, schema: T): unknown {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  const dataObj = data as Record<string, unknown>
  const result: Record<string, unknown> = {}

  // Check if schema is Object type
  if (schema.type !== 'object' || !schema.properties) {
    return data
  }

  for (const [key, value] of Object.entries(dataObj)) {
    const propertySchema = schema.properties[key] as TSchema | undefined

    if (!propertySchema) {
      result[key] = value
      continue
    }

    // Coerce based on schema type
    if (typeof value === 'string') {
      if (propertySchema.type === 'number' || propertySchema.type === 'integer') {
        result[key] = propertySchema.type === 'integer' ? coerceInteger(value) : coerceNumber(value)
      } else if (propertySchema.type === 'boolean') {
        result[key] = coerceBoolean(value)
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Creates Validation Middleware with Automatic Coercion.
 *
 * Extends the standard validate middleware to automatically convert string data to appropriate
 * types before validation. Especially useful for query and param validation where data sources
 * are string-based.
 *
 * @template T - TypeBox schema type
 * @template S - Validation source type
 * @template E - Photon environment type
 * @template P - Route path type
 *
 * @param source - Validation source (recommend using 'query' or 'param')
 * @param schema - TypeBox schema definition
 * @param hook - Optional validation result hook
 * @returns Photon middleware handler
 *
 * @example Query Parameter Coercion
 * ```typescript
 * const searchSchema = Type.Object({
 *   page: Type.Number({ minimum: 1 }),
 *   limit: Type.Number({ minimum: 1, maximum: 100 }),
 *   active: Type.Optional(Type.Boolean())
 * })
 *
 * app.get('/search',
 *   validateWithCoercion('query', searchSchema),
 *   (c) => {
 *     const { page, limit, active } = c.req.valid('query')
 *     // All values are automatically coerced to correct types
 *     return c.json({ page, limit, active })
 *   }
 * )
 * ```
 *
 * @example Route Parameter Coercion
 * ```typescript
 * const paramSchema = Type.Object({
 *   id: Type.Number({ minimum: 1 })
 * })
 *
 * app.get('/users/:id',
 *   validateWithCoercion('param', paramSchema),
 *   (c) => {
 *     const { id } = c.req.valid('param')
 *     // id converted from string to number
 *     return c.json({ userId: id })
 *   }
 * )
 * ```
 *
 * @example With Custom Error Handling
 * ```typescript
 * app.get('/items',
 *   validateWithCoercion('query', querySchema, (result, c) => {
 *     if (!result.success) {
 *       return c.json({
 *         error: 'Invalid query parameters',
 *         details: result.errors
 *       }, 400)
 *     }
 *   }),
 *   handler
 * )
 * ```
 */
export function validateWithCoercion<
  T extends TSchema,
  S extends 'json' | 'query' | 'param' | 'form',
  E extends Env = Env,
  P extends string = string,
>(
  source: S,
  schema: T,
  hook?: (result: unknown, c: Context<E>) => Response | Promise<Response> | undefined
): MiddlewareHandler<
  E,
  P,
  {
    in: { [K in S]: Static<T> }
    out: { [K in S]: Static<T> }
  }
> {
  return async (c, next) => {
    // Get raw data
    let data: unknown

    switch (source) {
      case 'json':
        data = await c.req.json()
        break
      case 'query':
        data = c.req.query()
        break
      case 'param':
        data = c.req.param()
        break
      case 'form':
        data = await c.req.parseBody()
        break
      default:
        data = {}
    }

    // Execute automatic coercion for query and param
    if (source === 'query' || source === 'param') {
      data = coerceData(data, schema)
    }

    // Create new request object and inject coerced data
    // Use standard validation middleware for subsequent validation
    const validator = tbValidator(source, schema, hook) as any

    // Temporarily override request data access methods
    const originalQueryMethod = c.req.query
    const originalParamMethod = c.req.param

    if (source === 'query') {
      // @ts-expect-error - Temporary method override to inject coerced data
      c.req.query = () => data as Record<string, string>
    } else if (source === 'param') {
      // @ts-expect-error - Temporary method override to inject coerced data
      c.req.param = () => data
    }

    await (validator as any)(c, next)

    // Restore original methods
    if (source === 'query') {
      c.req.query = originalQueryMethod
    } else if (source === 'param') {
      c.req.param = originalParamMethod
    }
  }
}
