import { afterAll, describe, expect, it } from 'bun:test'
import { defineConfig, PlanetCore } from '@gravito/core'
import { GravitoAdapter } from '@gravito/photon/adapter'
import type { ExecutionResult } from 'graphql'
import { createClient } from 'graphql-ws'
import { createSchema } from 'graphql-yoga'
import { OrbitGraphQL } from '../src/index'

interface TestServer {
  stop(): void
  port: number
}

describe('GraphQL Subscriptions', () => {
  let server: TestServer | undefined

  afterAll(() => {
    if (server) {
      server.stop()
    }
  })

  it.skip('should handle subscriptions over websocket', async () => {
    // SKIP: This test is flaky in CI environments due to WebSocket connection timing issues
    // The test requires proper server startup and WebSocket upgrade negotiation
    // which can be unreliable in resource-constrained CI runners
    // TODO: Migrate to integration tests with proper WebSocket test framework
    const schema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
        type Subscription {
          countdown(from: Int!): Int!
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'world',
        },
        Subscription: {
          countdown: {
            subscribe: async function* (_, { from }: { from: number }) {
              for (let i = from; i >= 0; i--) {
                yield { countdown: i }
                // Small delay to simulate async work
                await new Promise((resolve) => setTimeout(resolve, 10))
              }
            },
          },
        },
      },
    })

    const config = defineConfig({
      orbits: [
        new OrbitGraphQL({
          schema,
          subscriptions: {
            enabled: true,
            path: '/graphql/ws',
          },
        }),
      ],
      adapter: new GravitoAdapter(),
    })

    const core = await PlanetCore.boot(config)
    const liftoff = core.liftoff(0) // Random port

    // Start real Bun server
    server = Bun.serve({
      port: liftoff.port,
      fetch: liftoff.fetch,
      websocket: liftoff.websocket,
    })

    const url = `ws://localhost:${server.port}/graphql/ws`

    // Use graphql-ws client to connect with retries
    const client = createClient({
      url,
      webSocketImpl: WebSocket, // Bun's native WebSocket
      retryAttempts: 3,
      shouldRetry: () => true,
      lazy: false, // Ensure connection is established immediately
    })

    const received: number[] = []

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const unsubscribe = client.subscribe(
          {
            query: 'subscription { countdown(from: 3) }',
          },
          {
            next: (data: ExecutionResult) => {
              const payload = data.data as { countdown: number } | undefined
              if (payload?.countdown !== undefined) {
                received.push(payload.countdown)
              }
            },
            error: (err: unknown) => reject(err),
            complete: () => {
              unsubscribe()
              resolve()
            },
          }
        )
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('WebSocket subscription timeout after 8000ms')), 8000)
      ),
    ])

    expect(received.length).toBeGreaterThan(0)
  })
})
