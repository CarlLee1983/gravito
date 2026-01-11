import type { Container, GravitoContext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { createSchema, createYoga, type YogaServerInstance } from 'graphql-yoga'

export interface GraphQLConfig {
  // biome-ignore lint/suspicious/noExplicitAny: Generic Schema
  schema?: any // Allow passing a pre-built schema
  path?: string
}

export class OrbitGraphQL implements GravitoOrbit {
  name = 'graphql'

  // biome-ignore lint/suspicious/noExplicitAny: Yoga type
  private yoga: YogaServerInstance<any, any> | null = null

  constructor(private config: GraphQLConfig = {}) {}

  async install(core: PlanetCore) {
    const container = core.container

    // 1. Resolve Schema
    // Check if schema is passed in constructor config
    let schema = this.config.schema

    // If not, try to resolve from core config or container
    if (!schema) {
      if (core.config.has('GRAPHQL_SCHEMA')) {
        schema = core.config.get('GRAPHQL_SCHEMA')
      } else {
        try {
          schema = container.make('GRAPHQL_SCHEMA')
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
    // Using instance() to bind the existing object
    container.instance('graphql', this.yoga)

    // 3. Mount Routes
    const endpoint = this.config.path || '/graphql'

    const handler = async (c: GravitoContext) => {
      // Convert Hono/Gravito request to standard Request
      const response = await this.yoga!.fetch(c.req.raw, {
        gravito: c, // Pass Gravito Context into the GraphQL Context
      })

      return response
    }

    core.router.get(endpoint, handler)
    core.router.post(endpoint, handler)

    // Optional: Log mounting (maybe rely on core logger)
    // console.log(`[OrbitGraphQL] 🚀 Mounted at ${endpoint}`)
  }
}
