import type { OpenAPIV3_1 } from 'openapi-types'
import type { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { SpecCache } from './cache'
import { AstralSchemaError } from './errors'
import { getStableSchemaKey } from './hash'
import { RouteIndex } from './route-index'
import type { AstralConfig, AstralOperation, AstralResource } from './types'

/**
 * Represents a route identified during Astral's discovery process.
 *
 * @public
 * @since 3.0.0
 */
export interface AstralRoute {
  /** The HTTP method (e.g., 'GET', 'POST'). */
  method: string
  /** The raw URI path of the route. */
  path: string
  /** Optional name assigned to the route. */
  name?: string
  /** Optional domain restriction for the route. */
  domain?: string
}

/**
 * OpenApiGenerator converts Astral contract metadata and framework routes
 * into an OpenAPI Specification (OAS) object.
 *
 * It maps Domain-Driven contracts to actual registered routes, extracting
 * Zod schemas for request validation and response bodies.
 *
 * @public
 * @since 3.0.0
 */
export class OpenApiGenerator {
  private schemaCache = new Map<string, OpenAPIV3_1.SchemaObject>()
  private specCache = new SpecCache()

  constructor(private config: AstralConfig) {}

  /**
   * Generate an OpenAPI Specification object from the provided routes.
   *
   * @param routes - An array of discovered routes to be documented.
   * @returns A plain object representing the OpenAPI 3.1.0 specification.
   */
  generate(routes: AstralRoute[]): OpenAPIV3_1.Document {
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: {
        title: this.config.title || 'API Documentation',
        version: this.config.version || '1.0.0',
        description: this.config.description,
      },
      paths: {} as OpenAPIV3_1.PathsObject,
      components: {
        schemas: {} as Record<string, OpenAPIV3_1.SchemaObject>,
      },
    }

    // Add servers if configured
    if (this.config.servers && this.config.servers.length > 0) {
      spec.servers = this.config.servers as OpenAPIV3_1.ServerObject[]
    }

    // Add security schemes to components
    if (this.config.securitySchemes) {
      spec.components!.securitySchemes = this.config.securitySchemes as Record<
        string,
        OpenAPIV3_1.SecuritySchemeObject
      >
    }

    // Add global security requirements
    if (this.config.security && this.config.security.length > 0) {
      spec.security = this.config.security
    }

    // Add tags
    if (this.config.tags && this.config.tags.length > 0) {
      spec.tags = this.config.tags
    }

    // Add external documentation
    if (this.config.externalDocs) {
      spec.externalDocs = this.config.externalDocs
    }

    // Add custom components
    if (this.config.components) {
      // Merge custom components with existing components
      if (this.config.components.schemas) {
        spec.components!.schemas = {
          ...spec.components!.schemas,
          ...this.processComponentSchemas(this.config.components.schemas),
        }
      }
      if (this.config.components.responses) {
        spec.components!.responses = this.config.components.responses as any
      }
      if (this.config.components.parameters) {
        spec.components!.parameters = this.config.components.parameters as any
      }
      if (this.config.components.examples) {
        spec.components!.examples = this.config.components.examples as any
      }
      if (this.config.components.requestBodies) {
        spec.components!.requestBodies = this.config.components.requestBodies as any
      }
      if (this.config.components.headers) {
        spec.components!.headers = this.config.components.headers as any
      }
      if (this.config.components.links) {
        spec.components!.links = this.config.components.links as any
      }
      if (this.config.components.callbacks) {
        spec.components!.callbacks = this.config.components.callbacks as any
      }
    }

    // Build route index for O(1) lookup
    const routeIndex = new RouteIndex(routes)

    // Process each contract/resource
    for (const resource of this.config.contracts || []) {
      this.processResource(spec, resource, routeIndex)
    }

    return spec
  }

  /**
   * Generate an OpenAPI Specification with caching support.
   * Returns cached result if routes haven't changed, otherwise generates a new spec.
   *
   * @param routes - An array of discovered routes to be documented.
   * @returns A plain object representing the OpenAPI 3.1.0 specification.
   * @public
   */
  generateWithCache(routes: AstralRoute[]): OpenAPIV3_1.Document {
    const cached = this.specCache.get(routes)
    if (cached) {
      return cached
    }

    const spec = this.generate(routes)
    this.specCache.set(routes, spec)
    return spec
  }

  /**
   * Clear all caches (both schema cache and spec cache).
   * Useful for development mode or when forcing regeneration.
   *
   * @public
   */
  invalidateCache(): void {
    this.specCache.invalidate()
    this.schemaCache.clear()
  }

  /**
   * Process component schemas, converting Zod schemas to JSON Schema.
   *
   * @param schemas - A map of schema names to their Zod or JSON Schema definitions.
   * @returns A map of processed JSON Schemas.
   * @private
   */
  private processComponentSchemas(schemas: Record<string, any>): Record<string, any> {
    const processed: Record<string, any> = {}
    for (const [name, schema] of Object.entries(schemas)) {
      try {
        // If it's a Zod schema, convert it
        if (schema && typeof schema === 'object' && '_def' in schema) {
          processed[name] = this.zodToSchema(schema)
        } else {
          // Otherwise use it as is
          processed[name] = schema
        }
      } catch (error) {
        throw new AstralSchemaError(
          `Failed to process component schema '${name}'`,
          schema,
          error instanceof Error ? error : undefined
        )
      }
    }
    return processed
  }

  /**
   * Process a resource contract and map it to discovered routes.
   *
   * @param spec - The root OpenAPI specification object.
   * @param resource - The Astral resource contract.
   * @param routeIndex - The route index for O(1) lookup.
   * @private
   */
  private processResource(spec: any, resource: AstralResource, routeIndex: RouteIndex) {
    // Find matching routes using O(1) index lookup
    const matchingRoutes = routeIndex.findByPrefix(resource.path)

    for (const route of matchingRoutes) {
      const path = this.normalizePath(route.path)
      const method = route.method.toLowerCase()

      if (!spec.paths[path]) {
        spec.paths[path] = {}
      }

      // Find the operation metadata from contract
      const opKey = this.inferOperationKey(route, resource)
      const opMetadata = resource.operations[opKey] || {}

      spec.paths[path][method] = this.buildOperation(opMetadata, resource, method, route.path)
    }
  }

  /**
   * Check if a framework route path matches a resource base path.
   * Supports path parameter matching (e.g., /users/:id matches /users).
   *
   * @param routePath - The actual route path from the framework.
   * @param resourcePath - The base path defined in the contract.
   * @returns True if they match.
   * @private
   */
  private isRouteMatchingResource(routePath: string, resourcePath: string): boolean {
    // Exact match
    if (routePath === resourcePath) {
      return true
    }

    // Check if it's a sub-path of the resource
    if (!routePath.startsWith(resourcePath)) {
      return false
    }

    // Ensure it matches at a path separator to avoid /users matching /users2
    const remainder = routePath.slice(resourcePath.length)
    return remainder.startsWith('/')
  }

  /**
   * Extract path parameter definitions from a route path.
   *
   * @param path - The route path containing parameters (e.g., /users/:id).
   * @returns An array of parameter objects for OAS.
   * @private
   */
  private extractPathParameters(path: string): Array<{
    name: string
    in: 'path'
    required: true
    schema: { type: 'string'; description?: string }
  }> {
    const params: Array<{
      name: string
      in: 'path'
      required: true
      schema: { type: 'string'; description?: string }
    }> = []

    // Match :paramName format
    const matches = path.matchAll(/:([a-zA-Z0-9_]+)/g)

    for (const match of matches) {
      params.push({
        name: match[1],
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          description: `Path parameter: ${match[1]}`,
        },
      })
    }

    return params
  }

  /**
   * Build an OpenAPI Operation Object from Astral metadata.
   *
   * @param op - The operation metadata.
   * @param resource - The parent resource contract.
   * @param method - HTTP method.
   * @param originalPath - The original framework route path.
   * @returns An OAS-compliant Operation Object.
   * @private
   */
  private buildOperation(
    op: AstralOperation,
    resource: AstralResource,
    method: string,
    originalPath: string
  ): OpenAPIV3_1.OperationObject {
    const operation: OpenAPIV3_1.OperationObject = {
      summary: op.summary,
      description: op.description,
      tags: op.tags || resource.tags,
      operationId: op.operationId,
      deprecated: op.deprecated,
      responses: {
        [op.status || 200]: {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: op.output ? this.zodToSchema(op.output) : { type: 'object' },
            },
          },
        },
      },
    }

    // Add security if specified
    if (op.security) {
      operation.security = op.security
    }

    // Add external documentation if specified
    if (op.externalDocs) {
      operation.externalDocs = op.externalDocs
    }

    // Extract and add path parameters
    const pathParams = this.extractPathParameters(originalPath)
    if (pathParams.length > 0) {
      operation.parameters = pathParams
    }

    // Handle custom params from operation definition
    if (op.params) {
      operation.parameters = operation.parameters || []
      for (const [name, schema] of Object.entries(op.params)) {
        try {
          const jsonSchema = this.zodToSchema(schema)
          operation.parameters.push({
            name,
            in: 'path',
            required: true,
            schema: jsonSchema,
          })
        } catch (error) {
          throw new AstralSchemaError(
            `無法轉換參數 '${name}' 的 schema`,
            schema,
            error instanceof Error ? error : undefined
          )
        }
      }
    }

    // Handle Errors
    if (op.errors) {
      for (const [code, schema] of Object.entries(op.errors)) {
        try {
          operation.responses![code] = {
            description: typeof schema === 'string' ? schema : 'Error response',
            content: {
              'application/json': {
                schema: typeof schema === 'string' ? { type: 'object' } : this.zodToSchema(schema),
              },
            },
          }
        } catch (error) {
          throw new AstralSchemaError(
            `無法轉換錯誤響應 ${code} 的 schema`,
            schema,
            error instanceof Error ? error : undefined
          )
        }
      }
    }

    // Handle custom request body if provided
    if (op.requestBody) {
      operation.requestBody = {
        description: op.requestBody.description,
        required: op.requestBody.required,
        content: op.requestBody.content,
      }
    } else if (op.input) {
      // Handle Input (Body or Query)
      try {
        const inputSchema = this.extractZodSchema(op.input)
        if (['post', 'put', 'patch'].includes(method)) {
          operation.requestBody = {
            content: {
              'application/json': {
                schema: this.zodToSchema(inputSchema),
              },
            },
          }
        } else {
          // Basic Query Params Support
          const jsonSchema = zodToJsonSchema(inputSchema as ZodSchema, { target: 'openApi3' }) as {
            properties?: Record<string, OpenAPIV3_1.SchemaObject>
            required?: string[]
          }
          if (jsonSchema.properties) {
            operation.parameters = operation.parameters || []
            for (const [name, prop] of Object.entries(jsonSchema.properties)) {
              operation.parameters.push({
                name,
                in: 'query',
                required: jsonSchema.required?.includes(name),
                schema: prop as any,
              })
            }
          }
        }
      } catch (error) {
        throw new AstralSchemaError(
          '無法轉換 input schema',
          op.input,
          error instanceof Error ? error : undefined
        )
      }
    }

    // Add examples if provided
    if (op.examples) {
      if (operation.requestBody && op.examples.request && 'content' in operation.requestBody) {
        operation.requestBody.content['application/json'].examples = op.examples.request as any
      }
      if (op.examples.response && operation.responses) {
        for (const [statusCode, response] of Object.entries(operation.responses)) {
          const responseObj = response as any
          if (responseObj.content?.['application/json'] && op.examples.response[statusCode]) {
            responseObj.content['application/json'].examples = {
              [statusCode]: op.examples.response[statusCode],
            }
          }
        }
      }
    }

    return operation
  }

  /**
   * Extract a Zod schema from an input definition.
   * Supports `FormRequest` classes by instantiating them and accessing the `schema` property.
   *
   * @param input - The input definition (FormRequest class or ZodSchema).
   * @returns The extracted ZodSchema.
   * @private
   */
  private extractZodSchema(input: any): ZodSchema {
    // If it's a FormRequest class, try to instantiate and get schema
    if (typeof input === 'function') {
      try {
        const instance = new (input as any)()
        // Check if instance has a schema property
        if (instance && typeof instance === 'object' && 'schema' in instance) {
          return instance.schema as ZodSchema
        }
      } catch {
        // If instantiation fails, return input as-is
      }
    }
    return input as ZodSchema
  }

  /**
   * Convert a Zod schema (or array of schemas) to an OpenAPI JSON Schema.
   * Uses an internal cache to improve performance for recurring schemas.
   *
   * @param zod - The Zod schema to convert.
   * @returns The converted JSON Schema object.
   * @private
   */
  private zodToSchema(zod: any) {
    try {
      // Generate cache key
      const cacheKey = this.getSchemaKey(zod)

      // Check cache
      if (this.schemaCache.has(cacheKey)) {
        return this.schemaCache.get(cacheKey)
      }

      let result: any

      if (Array.isArray(zod)) {
        result = {
          type: 'array',
          items: zodToJsonSchema(zod[0] as ZodSchema, { target: 'openApi3' }),
        }
      } else {
        result = zodToJsonSchema(zod as ZodSchema, { target: 'openApi3' })
      }

      // Store in cache
      this.schemaCache.set(cacheKey, result)

      return result
    } catch (error) {
      throw new AstralSchemaError(
        'Error converting Zod schema to JSON Schema',
        zod,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Generate a unique cache key for a schema.
   * Uses stable hashing to ensure consistent keys for identical schemas.
   *
   * @param schema - The schema object.
   * @returns A string key.
   * @private
   */
  private getSchemaKey(schema: any): string {
    return getStableSchemaKey(schema)
  }

  /**
   * Normalize a route path by converting `:param` to `{param}` for OpenAPI compatibility.
   *
   * @param path - The raw route path.
   * @returns Normalized path.
   * @private
   */
  private normalizePath(path: string): string {
    return path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
  }

  /**
   * Infer the operation key (e.g., 'index', 'store', 'show') based on route method and path.
   *
   * @param route - The discovered route info.
   * @param resource - The parent resource contract.
   * @returns The inferred operation key string.
   * @private
   */
  private inferOperationKey(route: AstralRoute, resource: AstralResource): string {
    const relPath = route.path.replace(resource.path, '').replace(/^\//, '')
    const method = route.method.toLowerCase()

    if (relPath === '' && method === 'get') {
      return 'index'
    }
    if (relPath === '' && method === 'post') {
      return 'store'
    }
    if (relPath.match(/^:[^/]+$/) && method === 'get') {
      return 'show'
    }
    if (relPath.match(/^:[^/]+$/) && method === 'put') {
      return 'update'
    }
    if (relPath.match(/^:[^/]+$/) && method === 'delete') {
      return 'destroy'
    }

    return route.name || 'unknown'
  }
}
