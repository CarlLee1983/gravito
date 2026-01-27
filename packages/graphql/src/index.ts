import { useDepthLimit } from '@envelop/depth-limit'
import { useRateLimiter } from '@envelop/rate-limiter'
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
 * This error is primarily used during the orbit installation phase to signal
 * fatal configuration issues, such as missing schema definitions or invalid
 * file paths.
 *
 * @example
 * ```typescript
 * throw new GraphQLConfigError('Schema file not found: ./schema.graphql');
 * ```
 */
export class GraphQLConfigError extends Error {
  /**
   * Creates a new GraphQLConfigError.
   *
   * @param message - The descriptive error message.
   */
  constructor(message: string) {
    super(`[OrbitGraphQL] ${message}`)
    this.name = 'GraphQLConfigError'
  }
}

/**
 * Extended GraphQL execution context including Gravito-specific properties.
 *
 * This interface bridges GraphQL Yoga's standard context with the Gravito ecosystem,
 * allowing resolvers to access core services like authentication and database connections
 * via the `gravito` property.
 *
 * @remarks
 * The `gravito` property is automatically injected during the request lifecycle,
 * ensuring seamless integration with the service container.
 *
 * @example
 * ```typescript
 * const user = context.gravito.get('auth').user();
 * ```
 */
export interface GraphQLContext extends YogaInitialContext {
  /**
   * Gravito HTTP Context containing request/response objects and the service container.
   *
   * Use this property to access shared services and request-specific data
   * within your GraphQL resolvers.
   */
  gravito: GravitoContext

  /**
   * Per-request DataLoaders for efficient batch data fetching.
   *
   * These are automatically instantiated if a `dataLoaders` factory is provided
   * in the Orbit configuration, helping to eliminate N+1 query problems.
   */
  loaders?: Record<string, unknown>
}

/**
 * Configuration options for Cross-Origin Resource Sharing (CORS).
 *
 * Defines the security policies for cross-origin requests, controlling which
 * domains, methods, and headers are permitted when accessing the GraphQL API.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS}
 */
export interface CorsConfig {
  /**
   * Allowed origin(s) for Cross-Origin requests.
   *
   * Can be a string, an array of strings, or a boolean (true to allow all).
   */
  origin?: string | string[]

  /**
   * Indicates whether the request can be made using credentials (cookies, headers).
   */
  credentials?: boolean

  /**
   * HTTP methods allowed for Cross-Origin requests.
   * @example ['GET', 'POST']
   */
  methods?: string[]

  /**
   * HTTP headers allowed in the actual request.
   */
  allowedHeaders?: string[]

  /**
   * HTTP headers exposed to the browser.
   */
  exposedHeaders?: string[]

  /**
   * How long the results of a preflight request can be cached (in seconds).
   */
  maxAge?: number
}

/**
 * Comprehensive configuration for the OrbitGraphQL module.
 *
 * This interface centralizes all settings for the GraphQL server, from
 * schema resolution and path mounting to advanced security and performance features.
 *
 * @example
 * ```typescript
 * const config: GraphQLConfig = {
 *   path: '/api/graphql',
 *   schema: mySchema,
 *   security: { depthLimit: 5 },
 *   graphiql: true
 * };
 * ```
 */
export interface GraphQLConfig {
  /**
   * The GraphQL schema definition.
   *
   * Supports `GraphQLSchema` instances or file paths (Bun only). If omitted,
   * the orbit will attempt to resolve 'GRAPHQL_SCHEMA' from the IoC container.
   */
  schema?: GraphQLSchema | string

  /**
   * The HTTP path where the GraphQL endpoint will be mounted.
   * @default '/graphql'
   */
  path?: string

  /**
   * Controls the availability of the GraphiQL IDE.
   * @default true
   */
  graphiql?: boolean

  /**
   * CORS settings to control browser access policies.
   */
  cors?: CorsConfig | boolean

  /**
   * Array of GraphQL Yoga plugins to extend server functionality.
   */
  plugins?: Plugin[]

  /**
   * Custom error formatter to sanitize errors before sending them to the client.
   *
   * @param error - The original GraphQL error.
   * @param context - The execution context.
   * @returns The formatted error object.
   */
  formatError?: (error: GraphQLError, context: GraphQLContext) => GraphQLFormattedError

  /**
   * Determines if error details should be masked for security.
   * @default true
   */
  maskErrors?: boolean

  /**
   * Enforces authentication for all GraphQL operations.
   * @default false
   */
  requireAuth?: boolean

  /**
   * Custom response handler when authentication fails.
   *
   * @param context - The execution context.
   * @returns A custom Response object or undefined to use the default.
   */
  onAuthFailure?: (context: GraphQLContext) => Response | undefined

  /**
   * Configuration for real-time GraphQL Subscriptions.
   */
  subscriptions?: {
    /** Enables WebSocket listener for subscriptions. */
    enabled?: boolean
    /** The path for the WebSocket endpoint. @default '/graphql/ws' */
    path?: string
  }

  /**
   * Security constraints to protect against resource exhaustion attacks.
   */
  security?: {
    /** Maximum allowed depth of a query selection set. */
    depthLimit?: number
    /** Maximum allowed complexity score for a query. */
    complexityLimit?: number
    /** Rate limiting configuration using the Token Bucket algorithm. */
    rateLimit?: {
      /** Max number of requests allowed in the time window. */
      max: number
      /** Time window in milliseconds. */
      window: number
    }
  }

  /**
   * Performance optimization settings for the GraphQL server.
   */
  performance?: {
    /**
     * Response caching configuration to reduce redundant computations.
     */
    cache?: {
      /** Enables response caching. */
      enabled?: boolean
      /** Cache duration in milliseconds. @default 2000 */
      ttl?: number
      /** Whether to partition cache entries per user session. */
      includeAuthorization?: boolean
      /** Custom storage implementation for the cache. */
      // biome-ignore lint/suspicious/noExplicitAny: Store type is flexible
      store?: any
    }
    /**
     * Automatic Persisted Queries (APQ) configuration.
     * Improves performance by reducing request payload sizes.
     */
    persistedQueries?: {
      /** Enables APQ support. */
      enabled?: boolean
      /** Custom storage for query hashes. */
      // biome-ignore lint/suspicious/noExplicitAny: Store type is flexible
      store?: any
    }
  }

  /**
   * Factory function to instantiate DataLoaders for each request.
   *
   * Used to solve the N+1 query problem by batching and caching database requests
   * within a single GraphQL execution.
   */
  dataLoaders?: (context: GravitoContext) => Record<string, unknown>
}

/**
 * OrbitGraphQL integrates GraphQL Yoga into the Gravito ecosystem.
 *
 * This module mounts a fully-featured GraphQL server onto Gravito's router,
 * providing seamless access to core services, security plugins, and performance
 * optimizations. It handles schema resolution, context injection, and real-time
 * subscriptions out of the box.
 *
 * @example
 * ```typescript
 * const graphql = new OrbitGraphQL({ schema });
 * core.orbit(graphql);
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
   * This method performs the following initialization steps:
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

    if (this.config.security?.rateLimit) {
      plugins.push(
        // biome-ignore lint/suspicious/noExplicitAny: Plugin typing
        useRateLimiter({
          identifyFn: (context) => {
            // Identify by IP or User ID
            const req = (context as unknown as YogaInitialContext).request
            return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
          },
          rateLimitDirectiveName: 'rateLimit',
        }) as unknown as Plugin
      )
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
        context: (ctx) => {
          const req = ctx.extra.request as unknown as Request
          return {
            gravito: {
              req,
              env: {},
              get: (name: string) => core.container.make(name),
            },
            loaders: this.config.dataLoaders
              ? this.config.dataLoaders({
                  req,
                  get: (name: string) => core.container.make(name),
                } as unknown as GravitoContext)
              : {},
          } as unknown as GraphQLContext
        },
        onConnect: async (ctx) => {
          if (this.config.requireAuth) {
            const req = ctx.extra.request as unknown as Request
            const token =
              (ctx.connectionParams?.Authorization as string) || req.headers.get('authorization')

            if (!token) {
              return false
            }
          }
          return true
        },
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
export * from './dataloaders/atlas-loader'

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** GraphQL Yoga server instance */
    graphql?: YogaServerInstance<Record<string, unknown>, GraphQLContext>
  }
}
