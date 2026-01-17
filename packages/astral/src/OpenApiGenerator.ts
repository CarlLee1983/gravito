import type { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
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

    // Process each contract/resource
    for (const resource of this.config.contracts || []) {
      this.processResource(spec, resource, routes)
    }

    return spec
  }

  private processResource(spec: any, resource: AstralResource, routes: AstralRoute[]) {
    // Find matching routes in the framework
    const matchingRoutes = routes.filter(
      (r) => r.path === resource.path || r.path.startsWith(`${resource.path}/`)
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

      spec.paths[path][method] = this.buildOperation(opMetadata, resource, method)
    }
  }

  private buildOperation(op: AstralOperation, resource: AstralResource, method: string) {
    const operation: any = {
      summary: op.summary,
      description: op.description,
      tags: op.tags || resource.tags,
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: op.output ? this.zodToSchema(op.output) : { type: 'object' },
            },
          },
        },
      },
    }

    // Handle Errors
    if (op.errors) {
      for (const [code, schema] of Object.entries(op.errors)) {
        operation.responses[code] = {
          description: typeof schema === 'string' ? schema : 'Error response',
          content: {
            'application/json': {
              schema: typeof schema === 'string' ? { type: 'object' } : this.zodToSchema(schema),
            },
          },
        }
      }
    }

    // Handle Input (Body or Query)
    if (op.input) {
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
    }

    return operation
  }

  private extractZodSchema(input: any): ZodSchema {
    // If it's a FormRequest class, try to instantiate and get schema
    if (typeof input === 'function' && input.prototype?.validate) {
      try {
        const instance = new (input as any)()
        return instance.schema
      } catch {
        return input as ZodSchema // Fallback
      }
    }
    return input as ZodSchema
  }

  private zodToSchema(zod: any) {
    if (Array.isArray(zod)) {
      return {
        type: 'array',
        items: zodToJsonSchema(zod[0] as ZodSchema, { target: 'openApi3' }),
      }
    }
    return zodToJsonSchema(zod as ZodSchema, { target: 'openApi3' })
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
