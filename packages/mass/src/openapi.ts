import type { TArray, TBoolean, TNumber, TObject, TSchema, TString } from '@sinclair/typebox'
import { Kind } from '@sinclair/typebox'

/**
 * OpenAPI Schema Object Type
 *
 * Represents a Schema Object in the OpenAPI 3.0 specification.
 */
export interface OpenApiSchema {
  type?: string
  format?: string
  description?: string
  enum?: unknown[]
  items?: OpenApiSchema
  properties?: Record<string, OpenApiSchema>
  required?: string[]
  additionalProperties?: boolean | OpenApiSchema
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  pattern?: string
  default?: unknown
  example?: unknown
  nullable?: boolean
  readOnly?: boolean
  writeOnly?: boolean
  deprecated?: boolean
  [key: string]: unknown
}

/**
 * Astral Resource Definition Type
 *
 * Represents the resource definition for Gravito Astral automatic API documentation.
 */
export interface AstralResource {
  path: string
  method: string
  summary?: string
  description?: string
  tags?: string[]
  requestBody?: {
    description?: string
    required?: boolean
    content: {
      'application/json': {
        schema: OpenApiSchema
      }
    }
  }
  responses: {
    [statusCode: string]: {
      description: string
      content?: {
        'application/json': {
          schema: OpenApiSchema
        }
      }
    }
  }
}

/**
 * Converts a TypeBox Schema to an OpenAPI Schema.
 *
 * This function transforms TypeBox schema definitions into OpenAPI 3.0 compliant schema objects,
 * suitable for automatic API documentation generation or integration with third-party tools.
 *
 * @param schema - The TypeBox schema object
 * @returns An OpenAPI Schema object
 *
 * @example Basic Type Conversion
 * ```typescript
 * import { Type } from '@sinclair/typebox'
 *
 * const schema = Type.String({ minLength: 3, maxLength: 50 })
 * const openapi = typeboxToOpenApi(schema)
 * // {
 * //   type: 'string',
 * //   minLength: 3,
 * //   maxLength: 50
 * // }
 * ```
 *
 * @example Object Type Conversion
 * ```typescript
 * const userSchema = Type.Object({
 *   name: Type.String(),
 *   email: Type.String({ format: 'email' }),
 *   age: Type.Optional(Type.Number({ minimum: 0 }))
 * })
 *
 * const openapi = typeboxToOpenApi(userSchema)
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     name: { type: 'string' },
 * //     email: { type: 'string', format: 'email' },
 * //     age: { type: 'number', minimum: 0 }
 * //   },
 * //   required: ['name', 'email']
 * // }
 * ```
 */
export function typeboxToOpenApi(schema: TSchema): OpenApiSchema {
  const result: OpenApiSchema = {}

  // Handle basic properties
  if (schema.description) {
    result.description = schema.description
  }

  if (schema.default !== undefined) {
    result.default = schema.default
  }

  if (schema.examples && Array.isArray(schema.examples) && schema.examples.length > 0) {
    result.example = schema.examples[0]
  }

  // Handle different types based on TypeBox Kind
  switch (schema[Kind]) {
    case 'String': {
      const stringSchema = schema as TString
      result.type = 'string'

      if (stringSchema.format) result.format = stringSchema.format
      if (stringSchema.minLength !== undefined) result.minLength = stringSchema.minLength
      if (stringSchema.maxLength !== undefined) result.maxLength = stringSchema.maxLength
      if (stringSchema.pattern) result.pattern = stringSchema.pattern
      break
    }

    case 'Number':
    case 'Integer': {
      const numberSchema = schema as TNumber
      result.type = schema[Kind] === 'Integer' ? 'integer' : 'number'

      if (numberSchema.minimum !== undefined) result.minimum = numberSchema.minimum
      if (numberSchema.maximum !== undefined) result.maximum = numberSchema.maximum
      break
    }

    case 'Boolean': {
      result.type = 'boolean'
      break
    }

    case 'Array': {
      const arraySchema = schema as TArray
      result.type = 'array'

      if (arraySchema.items) {
        result.items = typeboxToOpenApi(arraySchema.items)
      }

      if (arraySchema.minItems !== undefined) {
        result.minItems = arraySchema.minItems
      }
      if (arraySchema.maxItems !== undefined) {
        result.maxItems = arraySchema.maxItems
      }
      break
    }

    case 'Object': {
      const objectSchema = schema as TObject
      result.type = 'object'

      if (objectSchema.properties) {
        result.properties = {}
        const required: string[] = []

        for (const [key, value] of Object.entries(objectSchema.properties)) {
          // Check if Optional (TypeBox stores Optional in [Symbol.for('TypeBox.Optional')])
          const optionalSymbol = Symbol.for('TypeBox.Optional')
          const isOptional =
            (value as unknown as Record<string | symbol, unknown>)[optionalSymbol] === 'Optional'

          if (isOptional) {
            // For Optional types, extract inner schema
            result.properties[key] = typeboxToOpenApi(value)
          } else {
            result.properties[key] = typeboxToOpenApi(value)
            required.push(key)
          }
        }

        if (required.length > 0) {
          result.required = required
        }
      }

      if (objectSchema.additionalProperties !== undefined) {
        if (typeof objectSchema.additionalProperties === 'boolean') {
          result.additionalProperties = objectSchema.additionalProperties
        } else {
          result.additionalProperties = typeboxToOpenApi(objectSchema.additionalProperties)
        }
      }
      break
    }

    case 'Union': {
      // Convert Union to anyOf
      if (schema.anyOf && Array.isArray(schema.anyOf)) {
        result.anyOf = schema.anyOf.map((s) => typeboxToOpenApi(s as TSchema))
      }
      break
    }

    case 'Intersect': {
      // Convert Intersect to allOf
      if (schema.allOf && Array.isArray(schema.allOf)) {
        result.allOf = schema.allOf.map((s) => typeboxToOpenApi(s as TSchema))
      }
      break
    }

    case 'Literal': {
      // Convert Literal to enum
      if (schema.const !== undefined) {
        result.enum = [schema.const]
        result.type = typeof schema.const as string
      }
      break
    }

    case 'Enum': {
      // Handle Enum
      if (schema.anyOf && Array.isArray(schema.anyOf)) {
        result.enum = schema.anyOf.map((s) => (s as { const: unknown }).const)
        // Use the type of the first value as the overall type
        if (result.enum.length > 0) {
          result.type = typeof result.enum[0] as string
        }
      }
      break
    }

    case 'Null': {
      result.type = 'null'
      break
    }

    case 'Optional': {
      // For Optional types, extract inner schema
      if (schema[Kind] === 'Optional' && schema.anyOf && Array.isArray(schema.anyOf)) {
        // TypeBox Optional is usually Union<T, Undefined>
        const innerSchema = schema.anyOf[0] as TSchema
        return typeboxToOpenApi(innerSchema)
      }
      break
    }

    default: {
      // Unknown type, try to use the type property of the schema directly
      if (schema.type) {
        result.type = schema.type as string
      }
    }
  }

  return result
}

/**
 * Creates an Astral Resource Definition.
 *
 * This function builds resource definitions for the Gravito Astral automatic API documentation system,
 * combining TypeBox schemas with HTTP route information to generate complete API endpoint documentation.
 *
 * @param options - Resource definition options
 * @returns Astral Resource Definition object
 *
 * @example Create POST endpoint resource
 * ```typescript
 * const createUserResource = createAstralResource({
 *   path: '/users',
 *   method: 'POST',
 *   summary: 'Create New User',
 *   description: 'Creates a new user account with the provided data',
 *   tags: ['users'],
 *   requestSchema: Type.Object({
 *     name: Type.String({ minLength: 1 }),
 *     email: Type.String({ format: 'email' }),
 *     password: Type.String({ minLength: 8 })
 *   }),
 *   responseSchema: Type.Object({
 *     id: Type.String({ format: 'uuid' }),
 *     name: Type.String(),
 *     email: Type.String(),
 *     createdAt: Type.String({ format: 'date-time' })
 *   }),
 *   responseStatusCode: 201
 * })
 * ```
 *
 * @example Create GET endpoint resource (no request body)
 * ```typescript
 * const getUsersResource = createAstralResource({
 *   path: '/users',
 *   method: 'GET',
 *   summary: 'Get User List',
 *   tags: ['users'],
 *   responseSchema: Type.Array(
 *     Type.Object({
 *       id: Type.String(),
 *       name: Type.String()
 *     })
 *   )
 * })
 * ```
 */
export function createAstralResource(options: {
  path: string
  method: string
  summary?: string
  description?: string
  tags?: string[]
  requestSchema?: TSchema
  requestDescription?: string
  requestRequired?: boolean
  responseSchema: TSchema
  responseDescription?: string
  responseStatusCode?: number
}): AstralResource {
  const {
    path,
    method,
    summary,
    description,
    tags,
    requestSchema,
    requestDescription,
    requestRequired = true,
    responseSchema,
    responseDescription = 'Successful response',
    responseStatusCode = 200,
  } = options

  const resource: AstralResource = {
    path,
    method: method.toUpperCase(),
    responses: {
      [responseStatusCode]: {
        description: responseDescription,
        content: {
          'application/json': {
            schema: typeboxToOpenApi(responseSchema),
          },
        },
      },
    },
  }

  if (summary) {
    resource.summary = summary
  }

  if (description) {
    resource.description = description
  }

  if (tags && tags.length > 0) {
    resource.tags = tags
  }

  // Include requestBody only for methods that require it
  if (requestSchema && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    resource.requestBody = {
      description: requestDescription,
      required: requestRequired,
      content: {
        'application/json': {
          schema: typeboxToOpenApi(requestSchema),
        },
      },
    }
  }

  return resource
}

/**
 * Batch creates CRUD Resource Definitions.
 *
 * Automatically generates all relevant Astral resource definitions for standard CRUD operations.
 *
 * @param options - CRUD resource options
 * @returns CRUD Resource Definition object
 *
 * @example Create full User CRUD resources
 * ```typescript
 * const userCrudResources = createCrudResources({
 *   resourceName: 'user',
 *   basePath: '/users',
 *   tags: ['users'],
 *   schemas: {
 *     item: Type.Object({
 *       id: Type.String({ format: 'uuid' }),
 *       name: Type.String(),
 *       email: Type.String({ format: 'email' })
 *     }),
 *     create: Type.Object({
 *       name: Type.String(),
 *       email: Type.String({ format: 'email' })
 *     }),
 *     update: Type.Partial(Type.Object({
 *       name: Type.String(),
 *       email: Type.String({ format: 'email' })
 *     }))
 *   }
 * })
 *
 * // Returns: { list, get, create, update, delete }
 * ```
 */
export function createCrudResources(options: {
  resourceName: string
  basePath: string
  tags?: string[]
  schemas: {
    item: TSchema
    list?: TSchema
    create: TSchema
    update: TSchema
  }
}): {
  list: AstralResource
  get: AstralResource
  create: AstralResource
  update: AstralResource
  delete: AstralResource
} {
  const { resourceName, basePath, tags = [resourceName], schemas } = options

  const capitalizedName = resourceName.charAt(0).toUpperCase() + resourceName.slice(1)

  return {
    list: createAstralResource({
      path: basePath,
      method: 'GET',
      summary: `Get ${capitalizedName} List`,
      tags,
      responseSchema: schemas.list || schemas.item,
    }),

    get: createAstralResource({
      path: `${basePath}/:id`,
      method: 'GET',
      summary: `Get Single ${capitalizedName}`,
      tags,
      responseSchema: schemas.item,
    }),

    create: createAstralResource({
      path: basePath,
      method: 'POST',
      summary: `Create ${capitalizedName}`,
      tags,
      requestSchema: schemas.create,
      responseSchema: schemas.item,
      responseStatusCode: 201,
    }),

    update: createAstralResource({
      path: `${basePath}/:id`,
      method: 'PATCH',
      summary: `Update ${capitalizedName}`,
      tags,
      requestSchema: schemas.update,
      responseSchema: schemas.item,
    }),

    delete: createAstralResource({
      path: `${basePath}/:id`,
      method: 'DELETE',
      summary: `Delete ${capitalizedName}`,
      tags,
      responseSchema: schemas.item,
    }),
  }
}
