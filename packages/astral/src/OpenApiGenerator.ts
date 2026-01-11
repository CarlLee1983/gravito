import type { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { AstralConfig, AstralOperation, AstralResource } from './types'

export class OpenApiGenerator {
  constructor(private config: AstralConfig) {}

  /**
   * Generate OpenAPI Specification object
   */
  generate(routes: any[]): any {
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

  private processResource(spec: any, resource: AstralResource, routes: any[]) {
    // Find matching routes in the framework
    const matchingRoutes = routes.filter(
      (r) => r.path === resource.path || r.path.startsWith(resource.path + '/')
    )

    for (const route of matchingRoutes) {
      const path = this.normalizePath(route.path)
      const method = route.method.toLowerCase()

      if (!spec.paths[path]) spec.paths[path] = {}

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
        // TODO: Handle query params for GET
      }
    }

    return operation
  }

  private extractZodSchema(input: any): ZodSchema {
    // If it's a FormRequest class, try to instantiate and get schema
    if (typeof input === 'function' && input.prototype?.validate) {
      try {
        const instance = new input()
        return instance.schema
      } catch {
        return input // Fallback
      }
    }
    return input
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

  private inferOperationKey(route: any, resource: AstralResource): string {
    const relPath = route.path.replace(resource.path, '').replace(/^\//, '')
    const method = route.method.toLowerCase()

    if (relPath === '' && method === 'get') return 'index'
    if (relPath === '' && method === 'post') return 'store'
    if (relPath.match(/^:[^/]+$/) && method === 'get') return 'show'
    if (relPath.match(/^:[^/]+$/) && method === 'put') return 'update'
    if (relPath.match(/^:[^/]+$/) && method === 'delete') return 'destroy'

    return route.name || 'unknown'
  }
}
