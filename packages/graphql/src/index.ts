import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { createSchema, createYoga, type YogaServerInstance } from 'graphql-yoga'

/**
 * Configuration for the GraphQL orbit.
 * @public
 */
export interface GraphQLConfig {
  /**
   * Optional pre-built GraphQLSchema. If not provided, the orbit will
   * attempt to resolve 'GRAPHQL_SCHEMA' from the container or config.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Generic Schema
  schema?: any // Allow passing a pre-built schema
  /**
   * The URL path where the GraphQL endpoint will be mounted.
   * Default: '/graphql'
   */
  path?: string
}

/**
 * OrbitGraphQL integrates GraphQL Yoga into the Gravito ecosystem.
 * It provides a seamless way to build type-safe APIs with standard
 * GraphQL tools, automatically exposing the Gravito context to resolvers.
 *
 * @example
 * ```typescript
 * const graphql = new OrbitGraphQL({
 *   path: '/api/graphql',
 *   schema: mySchema
 * });
 * core.addOrbit(graphql);
 * ```
 * @public
 */
export class OrbitGraphQL implements GravitoOrbit {
  name = 'graphql'

  // biome-ignore lint/suspicious/noExplicitAny: Yoga type
  private yoga: YogaServerInstance<any, any> | null = null

  constructor(private config: GraphQLConfig = {}) { }

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
        }
      },
    })

    // Register yoga instance in container for advanced usage
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

    core.logger.info(`[OrbitGraphQL] Mounted at ${endpoint}`)
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** GraphQL Yoga server instance */
    // biome-ignore lint/suspicious/noExplicitAny: Yoga generic type
    graphql?: YogaServerInstance<any, any>
  }
}
