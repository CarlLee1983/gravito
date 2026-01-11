import type { Container, GravitoContext, Orbit } from '@gravito/core'
import { createSchema, createYoga, type YogaServerInstance } from 'graphql-yoga'

export interface GraphQLConfig {
  schema?: any // Allow passing a pre-built schema
  path?: string
}

export class OrbitGraphQL implements Orbit {
  name = 'graphql'

  // biome-ignore lint/suspicious/noExplicitAny: Yoga type
  private yoga: YogaServerInstance<any, any> | null = null

  constructor(private config: GraphQLConfig = {}) {}

  async install(container: Container) {
    // 1. Resolve Schema
    // Check if schema is passed in constructor config
    let schema = this.config.schema

    // If not, try to resolve from container (GRAPHQL_SCHEMA)
    if (!schema) {
      try {
        schema = container.resolve('GRAPHQL_SCHEMA')
      } catch {
        // No schema provided, use default Hello World schema
        schema = createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hello: String
              gravito: String
            }
          `,
          resolvers: {
            Query: {
              hello: () => 'Hello World from Gravito GraphQL!',
              gravito: () => 'Is awesome 🚀',
            },
          },
        })
      }
    }

    // 2. Create Yoga Instance
    this.yoga = createYoga({
      schema,
      graphqlEndpoint: this.config.path || '/graphql',
      // Inject Gravito Context
      context: (initialContext) => {
        return {
          ...initialContext,
          // We can attach more Gravito specific stuff here if needed
        }
      },
    })

    // Register yoga instance in container for advanced usage
    container.bind('graphql', this.yoga)
  }

  async boot(container: Container) {
    const core = container.resolve<any>('app') // Resolve PlanetCore application
    const endpoint = this.config.path || '/graphql'

    if (!this.yoga) {
      throw new Error('GraphQL Orbit not installed correctly')
    }

    // 3. Mount Routes
    // Hono/Gravito router integration
    // We bind to both GET and POST for the GraphQL endpoint

    // Using a wildcard to capture all GraphQL related paths (like /graphql/stream) if needed,
    // but typically just /graphql is enough for standard usage.

    const handler = async (c: GravitoContext) => {
      // Convert Hono/Gravito request to standard Request
      const response = await this.yoga!.fetch(c.req.raw, {
        gravito: c, // Pass Gravito Context into the GraphQL Context
      })

      return response
    }

    core.router.get(endpoint, handler)
    core.router.post(endpoint, handler)

    console.log(`[OrbitGraphQL] 🚀 Mounted at ${endpoint}`)
  }
}
