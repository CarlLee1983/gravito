import type { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { AstralGenerationError, AstralSchemaError } from './errors'
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
  private schemaCache = new Map<string, any>()

  constructor(private config: AstralConfig) {}

  /**
   * Generate an OpenAPI Specification object from the provided routes.
   *
   * @param routes - An array of discovered routes to be documented.
   * @returns A plain object representing the OpenAPI 3.1.0 specification.
   */
  generate(routes: AstralRoute[]): any {
    const spec: any = {
      openapi: '3.1.0',
      info: {
        title: this.config.title || 'API Documentation',
        version: this.config.version || '1.0.0',
        description: this.config.description,
      },
      paths: {},
      components: {
        schemas: {},
      },
    }

    // Add servers if configured
    if (this.config.servers && this.config.servers.length > 0) {
      spec.servers = this.config.servers
    }

    // Add security schemes to components
    if (this.config.securitySchemes) {
      spec.components.securitySchemes = this.config.securitySchemes
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
        spec.components.schemas = {
          ...spec.components.schemas,
          ...this.processComponentSchemas(this.config.components.schemas),
        }
      }
      if (this.config.components.responses) {
        spec.components.responses = this.config.components.responses
      }
      if (this.config.components.parameters) {
        spec.components.parameters = this.config.components.parameters
      }
      if (this.config.components.examples) {
        spec.components.examples = this.config.components.examples
      }
      if (this.config.components.requestBodies) {
        spec.components.requestBodies = this.config.components.requestBodies
      }
      if (this.config.components.headers) {
        spec.components.headers = this.config.components.headers
      }
      if (this.config.components.links) {
        spec.components.links = this.config.components.links
      }
      if (this.config.components.callbacks) {
        spec.components.callbacks = this.config.components.callbacks
      }
    }

    // Process each contract/resource
    for (const resource of this.config.contracts || []) {
      this.processResource(spec, resource, routes)
    }

    return spec
  }

  /**
   * 處理 components.schemas，將 Zod schemas 轉換為 JSON Schema
   * @private
   */
  private processComponentSchemas(schemas: Record<string, any>): Record<string, any> {
    const processed: Record<string, any> = {}
    for (const [name, schema] of Object.entries(schemas)) {
      try {
        // 如果是 Zod schema，進行轉換
        if (schema && typeof schema === 'object' && '_def' in schema) {
          processed[name] = this.zodToSchema(schema)
        } else {
          // 否則直接使用
          processed[name] = schema
        }
      } catch (error) {
        throw new AstralSchemaError(
          `無法處理 component schema '${name}'`,
          schema,
          error instanceof Error ? error : undefined
        )
      }
    }
    return processed
  }

  private processResource(spec: any, resource: AstralResource, routes: AstralRoute[]) {
    // Find matching routes using precise path matching
    const matchingRoutes = routes.filter((route) =>
      this.isRouteMatchingResource(route.path, resource.path)
    )

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
   * 精確檢查路由是否匹配資源路徑
   * 支援路徑參數匹配（例如 /users/:id 匹配 /users）
   * @private
   */
  private isRouteMatchingResource(routePath: string, resourcePath: string): boolean {
    // 完全匹配
    if (routePath === resourcePath) {
      return true
    }

    // 檢查是否為資源的子路徑
    if (!routePath.startsWith(resourcePath)) {
      return false
    }

    // 確保是在路徑分隔符處匹配，避免 /users 匹配到 /users2
    const remainder = routePath.slice(resourcePath.length)
    return remainder.startsWith('/')
  }

  /**
   * 從路徑中提取路徑參數定義
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

    // 匹配 :paramName 格式的路徑參數
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

  private buildOperation(
    op: AstralOperation,
    resource: AstralResource,
    method: string,
    originalPath: string
  ) {
    const operation: any = {
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
          operation.responses[code] = {
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
          const jsonSchema: any = zodToJsonSchema(inputSchema as ZodSchema, { target: 'openApi3' })
          if (jsonSchema.properties) {
            operation.parameters = operation.parameters || []
            for (const [name, prop] of Object.entries(jsonSchema.properties)) {
              operation.parameters.push({
                name,
                in: 'query',
                required: jsonSchema.required?.includes(name),
                schema: prop,
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
      if (operation.requestBody && op.examples.request) {
        operation.requestBody.content['application/json'].examples = op.examples.request
      }
      if (op.examples.response) {
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

  private zodToSchema(zod: any) {
    try {
      // 生成快取鍵
      const cacheKey = this.getSchemaKey(zod)

      // 檢查快取
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

      // 存入快取
      this.schemaCache.set(cacheKey, result)

      return result
    } catch (error) {
      throw new AstralSchemaError(
        'Zod schema 轉換為 JSON Schema 時發生錯誤',
        zod,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * 為 schema 生成快取鍵
   * @private
   */
  private getSchemaKey(schema: any): string {
    try {
      if (Array.isArray(schema)) {
        return `array:${this.getSchemaKey(schema[0])}`
      }
      // For Zod schemas, use the schema's definition to create a unique key
      if (schema?._def) {
        // Use the schema's definition structure and shape to create a unique identifier
        const shape = schema._def.shape?.()
        if (shape) {
          // Create a key based on the shape's property names
          const keys = Object.keys(shape).sort().join(',')
          return `zod:${schema._def.typeName || 'object'}:${keys}`
        }
        return `zod:${schema._def.typeName || 'unknown'}:${Math.random()}`
      }
      // Fallback to JSON serialization
      return JSON.stringify(schema)
    } catch {
      // 如果無法序列化，使用隨機鍵（避免快取衝突）
      return `ref:${Math.random()}`
    }
  }

  private normalizePath(path: string): string {
    // Convert :param to {param} for OpenAPI
    return path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
  }

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
