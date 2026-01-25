import { useDepthLimit } from '@envelop/depth-limit'
import { useResponseCache } from '@envelop/response-cache'
import type { GravitoContext, GravitoOrbit, PlanetCore } from '@gravito/core'
import type { GraphQLError, GraphQLFormattedError, GraphQLSchema } from 'graphql'
import { makeHandler } from 'graphql-ws/use/bun'
import {
  createSchema,
  createYoga,
  type Plugin,
  type YogaInitialContext,
  type YogaServerInstance,
} from 'graphql-yoga'

interface BunServerLike {
  upgrade(req: Request, options?: { data?: unknown }): boolean
}

/**
 * GraphQL Context, containing Yoga initial context and Gravito extension.
 *
 * Note: gravito is injected via the second argument of yoga.fetch(),
 * not created in the context function of createYoga.
 */
export interface GraphQLContext extends YogaInitialContext {
  /** Gravito HTTP Context, accessible for req/res/services etc. */
  gravito: GravitoContext
  /** DataLoaders injected via config */
  loaders?: Record<string, unknown>
}

/**
 * CORS Configuration
 */
export interface CorsConfig {
  origin?: string | string[]
  credentials?: boolean
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  maxAge?: number
}

/**
 * Configuration for the GraphQL orbit.
 * @public
 */
export interface GraphQLConfig {
  /**
   * Optional pre-built GraphQLSchema. If not provided, the orbit will
   * attempt to resolve 'GRAPHQL_SCHEMA' from the container or config.
   *
   * If using Bun, this can also be a string path to a .graphql file.
   */
  schema?: GraphQLSchema | string
  /**
   * The URL path where the GraphQL endpoint will be mounted.
   * Default: '/graphql'
   */
  path?: string
  /**
   * Enable GraphiQL
   * @default true
   */
  graphiql?: boolean
  /**
   * CORS Configuration
   */
  cors?: CorsConfig | boolean
  /**
   * Yoga Plugins array
   */
  plugins?: Plugin[]
  /**
   * Custom error formatting function
   */
  formatError?: (error: GraphQLError, context: GraphQLContext) => GraphQLFormattedError
  /**
   * Whether to mask error details in production
   * @default true
   */
  maskErrors?: boolean
  /**
   * Require authentication for all GraphQL requests
   * @default false
   */
  requireAuth?: boolean
  /**
   * Custom handler for authentication failure
   */
  onAuthFailure?: (context: GraphQLContext) => Response | void
  /**
   * Subscription Configuration (WebSocket)
   */
  subscriptions?: {
    /** Whether to enable subscriptions @default false */
    enabled?: boolean
    /** WebSocket path @default '/graphql/ws' */
    path?: string
  }
  /**
   * Security Configurations
   */
  security?: {
    /** Max Query Depth @default undefined (no limit) */
    depthLimit?: number
  }
  /**
   * Performance Configurations
   */
  performance?: {
    /** Response Cache Config */
    cache?: {
      /** Whether to enable response caching @default false */
      enabled?: boolean
      /** Cache TTL in milliseconds @default 2000 */
      ttl?: number
      /** Whether to include the HTTP Authorization header in the cache key @default false */
      includeAuthorization?: boolean
    }
  }
  /**
   * Factory function to create DataLoaders for each request
   */
  dataLoaders?: (context: GravitoContext) => Record<string, unknown>
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

  private yoga: YogaServerInstance<Record<string, unknown>, GraphQLContext> | null = null

  constructor(private config: GraphQLConfig = {}) {}

  async install(core: PlanetCore) {
    const container = core.container

    let schema: GraphQLSchema | undefined

    if (this.config.schema) {
      if (typeof this.config.schema === 'string') {
        // Handle string path (Bun optimization)
        if (typeof Bun !== 'undefined') {
          try {
            const file = Bun.file(this.config.schema)
            const typeDefs = await file.text()
            schema = createSchema({
              typeDefs,
              resolvers: {
                Query: {
                  // Basic resolver for file-based schema
                  hello: () => 'Hello World',
                },
              },
            })
          } catch (e) {
            core.logger.error(
              `[OrbitGraphQL] Failed to load schema from file: ${this.config.schema}`,
              e
            )
            throw e
          }
        } else {
          throw new Error('[OrbitGraphQL] String schema path is only supported in Bun runtime.')
        }
      } else {
        schema = this.config.schema
      }
    }

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
    const plugins: Plugin[] = this.config.plugins || []

    // Add Security Plugins
    if (this.config.security?.depthLimit) {
      plugins.push(
        useDepthLimit({ maxDepth: this.config.security.depthLimit }) as unknown as Plugin
      )
    }

    // Add Performance Plugins
    if (this.config.performance?.cache?.enabled) {
      plugins.push(
        useResponseCache({
          session: (context) => {
            // If includeAuthorization is true, use the auth header as session id
            // Otherwise null (global cache)
            if (this.config.performance?.cache?.includeAuthorization) {
              const headers = (context as unknown as YogaInitialContext).request.headers
              return headers.get('authorization') || null
            }
            return null
          },
          ttl: this.config.performance.cache.ttl ?? 2000,
        }) as unknown as Plugin
      )
    }

    this.yoga = createYoga<Record<string, unknown>, GraphQLContext>({
      schema,
      graphqlEndpoint: this.config.path || '/graphql',
      graphiql: this.config.graphiql ?? true,
      // biome-ignore lint/suspicious/noExplicitAny: Temporary cast to avoid strict type mismatch with Yoga's CORS types
      cors: this.config.cors as any,
      plugins,
      maskedErrors: this.config.maskErrors,
      // Inject Gravito Context
      context: (initialContext) => {
        const gravito = {
          ...initialContext,
        } as unknown as GraphQLContext

        if (this.config.dataLoaders) {
          const gravitoCtx = (initialContext as unknown as { gravito: GravitoContext }).gravito

          if (gravitoCtx) {
            gravito.loaders = this.config.dataLoaders(gravitoCtx)
          }
        }

        return gravito
      },
    })

    // Register yoga instance in container for advanced usage
    container.instance('graphql', this.yoga)

    // 4. Setup Subscriptions (WebSocket)
    if (this.config.subscriptions?.enabled) {
      if (core.adapter.name !== 'bun-native' && core.adapter.name !== 'photon') {
        core.logger.warn(
          '[OrbitGraphQL] GraphQL Subscriptions are currently optimized for Bun adapter.'
        )
      }

      const wsPath = this.config.subscriptions.path || '/graphql/ws'

      const websocketHandler = makeHandler({
        schema,
        // Hooks for onConnect/onSubscribe can be added here
      })

      if (core.adapter.websocket) {
        core.logger.warn(
          '[OrbitGraphQL] WebSocket handler already registered. Overwriting with GraphQL WebSocket handler.'
        )
      }

      core.adapter.websocket = websocketHandler

      core.logger.info(`[OrbitGraphQL] WebSocket Subscriptions enabled at ${wsPath}`)
    }

    // 3. Mount Routes
    const endpoint = this.config.path || '/graphql'

    const handler = async (c: GravitoContext) => {
      if (!this.yoga) {
        return c.text('GraphQL server not initialized', 500)
      }

      // WebSocket Upgrade Handling
      if (
        this.config.subscriptions?.enabled &&
        c.req.header('upgrade') === 'websocket' &&
        c.req.url.endsWith(this.config.subscriptions.path || '/graphql/ws')
      ) {
        // Access the native server instance from environment (Bun specific)
        const server = c.env as unknown as BunServerLike

        if (server && typeof server.upgrade === 'function') {
          const upgraded = server.upgrade(c.req.raw, {
            data: {},
          })

          if (upgraded) {
            // Bun stops processing if upgraded, but we return 101 to satisfy type signature
            return new Response(null, { status: 101 })
          }

          return c.text('WebSocket upgrade failed', 500)
        }

        return c.text('WebSocket upgrades are only supported on Bun runtime', 500)
      }

      // Authentication Check
      if (this.config.requireAuth) {
        let authenticated = false
        // Try to check authentication via standard Gravito Auth service if available
        try {
          // Check if 'auth' service is bound and has 'check' method
          const auth = c.get('auth')
          if (auth) {
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic auth check
            const authService = auth as any
            if (typeof authService.check === 'function') {
              authenticated = await authService.check()
            } else if (typeof authService.user === 'function') {
              authenticated = !!(await authService.user())
            }
          }
        } catch {
          // Auth service not found or error, assume unauthenticated
        }

        if (!authenticated) {
          if (this.config.onAuthFailure) {
            const res = this.config.onAuthFailure(c as unknown as GraphQLContext)
            if (res) return res
          }
          return c.text('Unauthorized', 401)
        }
      }

      // Convert Hono/Gravito request to standard Request
      const response = await this.yoga.fetch(c.req.raw, {
        gravito: c, // Pass Gravito Context into the GraphQL Context
      })

      return response
    }

    core.router.get(endpoint, handler)
    core.router.post(endpoint, handler)

    if (this.config.subscriptions?.enabled) {
      const wsPath = this.config.subscriptions.path || '/graphql/ws'
      core.router.get(wsPath, handler)
    }

    core.logger.info(`[OrbitGraphQL] Mounted at ${endpoint}`)
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** GraphQL Yoga server instance */
    graphql?: YogaServerInstance<Record<string, unknown>, GraphQLContext>
  }
}
