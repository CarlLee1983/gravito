import { useDepthLimit } from '@envelop/depth-limit'
import { useResponseCache } from '@envelop/response-cache'
import { useAPQ } from '@graphql-yoga/plugin-apq'
import type { GravitoContext, GravitoOrbit, PlanetCore } from '@gravito/core'
import type { GraphQLError, GraphQLFormattedError, GraphQLSchema } from 'graphql'
import { createComplexityLimitRule } from 'graphql-complexity-validation'
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
 * Custom error thrown when the GraphQL Orbit encounters invalid configuration.
 *
 * This error typically occurs during the installation phase if the schema cannot be resolved
 * from the file system (when using Bun) or if no schema is provided via config/container.
 *
 * @example
 * ```typescript
 * throw new GraphQLConfigError('Schema file not found');
 * ```
 */
export class GraphQLConfigError extends Error {
  constructor(message: string) {
    super(`[OrbitGraphQL] ${message}`)
    this.name = 'GraphQLConfigError'
  }
}

/**
 * Extended GraphQL execution context including Gravito-specific properties.
 *
 * This interface bridges the gap between GraphQL Yoga's standard context and
 * the Gravito ecosystem, allowing resolvers to access core services.
 *
 * @remarks
 * The `gravito` property is injected via the second argument of `yoga.fetch()`,
 * ensuring it's available for every request processed by the Orbit.
 */
export interface GraphQLContext extends YogaInitialContext {
  /**
   * Gravito HTTP Context containing request/response objects and service container.
   * Use this to access services like Auth, Database, or Logger within resolvers.
   */
  gravito: GravitoContext
  /**
   * Per-request DataLoaders for efficient batch data fetching.
   * Populated only if `dataLoaders` factory is defined in the config.
   */
  loaders?: Record<string, unknown>
}

/**
 * Configuration options for Cross-Origin Resource Sharing (CORS).
 *
 * Defines how the GraphQL server should handle requests from different origins,
 * essential for securing APIs consumed by browsers.
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
 * Comprehensive configuration for the OrbitGraphQL module.
 *
 * Controls all aspects of the GraphQL server, including schema resolution,
 * security limits, performance caching, and subscription handling.
 *
 * @example
 * ```typescript
 * const config: GraphQLConfig = {
 *   path: '/api/graphql',
 *   schema: mySchema,
 *   security: { depthLimit: 5 },
 *   graphiql: process.env.NODE_ENV === 'development'
 * };
 * ```
 */
export interface GraphQLConfig {
  /**
   * The GraphQL schema definition.
   *
   * If provided as a string (Bun only), it treats it as a file path to load.
   * If omitted, the Orbit attempts to resolve 'GRAPHQL_SCHEMA' from the Gravito container.
   */
  schema?: GraphQLSchema | string
  /**
   * The HTTP path where the GraphQL endpoint will be mounted.
   * @default '/graphql'
   */
  path?: string
  /**
   * Controls the availability of the GraphiQL IDE.
   * Useful to disable in production for security.
   * @default true
   */
  graphiql?: boolean
  /**
   * CORS settings to control browser access policies.
   * Can be a boolean to enable/disable defaults, or a detailed config object.
   */
  cors?: CorsConfig | boolean
  /**
   * Array of GraphQL Yoga plugins to extend functionality.
   * Use this to add custom behaviors like logging, tracing, or third-party extensions.
   */
  plugins?: Plugin[]
  /**
   * Custom error formatter to sanitize or transform errors before sending to client.
   * Useful for hiding implementation details or adhering to specific error specs.
   */
  formatError?: (error: GraphQLError, context: GraphQLContext) => GraphQLFormattedError
  /**
   * Determines if error stack traces and internal details should be masked.
   * Recommended to be `true` in production to prevent information leakage.
   * @default true
   */
  maskErrors?: boolean
  /**
   * Enforces authentication for all GraphQL operations.
   * If true, checks Gravito's Auth service before executing any query.
   * @default false
   */
  requireAuth?: boolean
  /**
   * Custom response handler when authentication fails.
   * Allows returning specific HTTP status codes or JSON error responses.
   */
  onAuthFailure?: (context: GraphQLContext) => Response | undefined
  /**
   * Configuration for real-time GraphQL Subscriptions over WebSocket.
   */
  subscriptions?: {
    /**
     * Enables WebSocket listener for subscriptions.
     * @default false
     */
    enabled?: boolean
    /**
     * The path for the WebSocket endpoint.
     * @default '/graphql/ws'
     */
    path?: string
  }
  /**
   * Security constraints to protect against malicious queries.
   */
  security?: {
    /**
     * Maximum allowed depth of a query selection set.
     * Prevents deep nesting attacks.
     * @default undefined (unlimited)
     */
    depthLimit?: number
    /**
     * Maximum allowed complexity score for a query.
     * Prevents resource exhaustion attacks.
     * @default undefined (unlimited)
     */
    complexityLimit?: number
  }
  /**
   * Performance optimization settings.
   */
  performance?: {
    /**
     * Response caching configuration.
     * Caches full query results to improve throughput for read-heavy APIs.
     */
    cache?: {
      /** @default false */
      enabled?: boolean
      /** Cache duration in milliseconds. @default 2000 */
      ttl?: number
      /** Whether to cache responses per user (Authorization header). @default false */
      includeAuthorization?: boolean
      /**
       * Custom storage for response cache (e.g., Redis).
       * Defaults to in-memory store if unspecified.
       */
      // biome-ignore lint/suspicious/noExplicitAny: Store type is flexible (Cache Interface)
      store?: any
    }
    /**
     * Automatic Persisted Queries (APQ) configuration.
     * Reduces network payload size by sending query hashes instead of full text.
     */
    persistedQueries?: {
      /** @default false */
      enabled?: boolean
      /**
       * Custom storage for persisted queries (e.g., Redis).
       * Defaults to in-memory Map if unspecified.
       */
      // biome-ignore lint/suspicious/noExplicitAny: Store type is flexible (Map or Cache Interface)
      store?: any
    }
  }
  /**
   * Factory function to instantiate DataLoaders for each request.
   * Solves the N+1 query problem by batching database calls.
   */
  dataLoaders?: (context: GravitoContext) => Record<string, unknown>
}

/**
 * OrbitGraphQL integrates GraphQL Yoga into the Gravito ecosystem.
 *
 * It acts as a bridge, mounting a fully-featured GraphQL server onto Gravito's
 * router and dependency injection system. It handles request lifecycle,
 * context injection, and provides built-in support for security and performance best practices.
 *
 * @example
 * Basic usage with a schema:
 * ```typescript
 * const graphql = new OrbitGraphQL({
 *   path: '/api/graphql',
 *   schema: mySchema
 * });
 * core.addOrbit(graphql);
 * ```
 *
 * @public
 */
export class OrbitGraphQL implements GravitoOrbit {
  name = 'graphql'

  private yoga: YogaServerInstance<Record<string, unknown>, GraphQLContext> | null = null

  constructor(private config: GraphQLConfig = {}) {}

  /**
   * Installs the GraphQL Orbit into the PlanetCore application.
   *
   * This method:
   * 1. Resolves the GraphQL Schema (from config, file, or container).
   * 2. Configures the Yoga server with plugins (APQ, Cache, Security).
   * 3. Sets up WebSocket subscriptions if enabled.
   * 4. Mounts HTTP routes for the GraphQL endpoint.
   *
   * @param core - The PlanetCore instance to attach to.
   * @throws {GraphQLConfigError} If the schema file cannot be read (Bun only) or no schema is found.
   */
  /**
   * Installs the GraphQL Orbit into the PlanetCore application.
   *
   * This method:
   * 1. Resolves the GraphQL Schema (from config, file, or container).
   * 2. Configures the Yoga server with plugins (APQ, Cache, Security).
   * 3. Sets up WebSocket subscriptions if enabled.
   * 4. Mounts HTTP routes for the GraphQL endpoint.
   *
   * @param core - The PlanetCore instance to attach to.
   * @throws {GraphQLConfigError} If the schema file cannot be read (Bun only) or no schema is found.
   */
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
            throw new GraphQLConfigError(`Failed to load schema from file: ${this.config.schema}`)
          }
        } else {
          throw new GraphQLConfigError('String schema path is only supported in Bun runtime.')
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

    if (this.config.security?.complexityLimit) {
      const maxComplexity = this.config.security.complexityLimit
      plugins.push({
        onValidate({ params, addValidationRule }) {
          addValidationRule(
            createComplexityLimitRule({
              maxComplexity,
            })
          )
        },
      } as Plugin)
    }
    // Add Performance Plugins
    if (this.config.performance?.persistedQueries?.enabled) {
      const store = this.config.performance.persistedQueries.store || new Map<string, string>()

      plugins.push(
        // biome-ignore lint/suspicious/noExplicitAny: APQ plugin type compatibility
        useAPQ({ store }) as any
      )
    }

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
          cache: this.config.performance.cache.store,
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
      maskedErrors: (this.config.maskErrors === false
        ? false
        : {
            formatError: this.config.formatError,
            ...(typeof this.config.maskErrors === 'object' ? this.config.maskErrors : {}),
            // biome-ignore lint/suspicious/noExplicitAny: Bypass strict Yoga types for formatError
          }) as any,
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
            if (res) {
              return res
            }
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

export * from './atlas'

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** GraphQL Yoga server instance */
    graphql?: YogaServerInstance<Record<string, unknown>, GraphQLContext>
  }
}
