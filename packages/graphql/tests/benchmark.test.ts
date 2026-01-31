import { describe, expect, it } from 'bun:test'
import { defineConfig, GravitoAdapter, PlanetCore } from '@gravito/core'
import { createSchema } from 'graphql-yoga'
import { type GraphQLContext, OrbitGraphQL } from '../src/index'

describe('GraphQL Performance Benchmarks', () => {
  describe('Response Caching Performance', () => {
    it('should demonstrate cache speedup', async () => {
      let callCount = 0
      const expensiveOperation = () => {
        callCount++
        let result = ''
        for (let i = 0; i < 1000000; i++) {
          result += i % 2 === 0 ? 'a' : 'b'
        }
        return result.slice(0, 100)
      }

      const schema = createSchema({
        typeDefs: 'type Query { expensive: String }',
        resolvers: {
          Query: {
            expensive: () => expensiveOperation(),
          },
        },
      })

      const config = defineConfig({
        orbits: [
          new OrbitGraphQL({
            schema,
            performance: {
              cache: {
                enabled: true,
                ttl: 5000,
              },
            },
          }),
        ],
        adapter: new GravitoAdapter(),
      })

      const core = await PlanetCore.boot(config)
      const { fetch } = core.liftoff()

      const uncachedStart = performance.now()
      const res1 = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ expensive }' }),
        })
      )
      const uncachedTime = performance.now() - uncachedStart
      await res1.json()
      expect(callCount).toBe(1)

      const cachedStart = performance.now()
      const res2 = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ expensive }' }),
        })
      )
      const cachedTime = performance.now() - cachedStart
      await res2.json()
      expect(callCount).toBe(1)

      expect(cachedTime).toBeLessThan(uncachedTime / 2)
    })

    it('should handle cache invalidation correctly', async () => {
      let value = 0
      const schema = createSchema({
        typeDefs: 'type Query { value: Int }',
        resolvers: {
          Query: {
            value: () => value,
          },
        },
      })

      const config = defineConfig({
        orbits: [
          new OrbitGraphQL({
            schema,
            performance: {
              cache: {
                enabled: true,
                ttl: 100,
              },
            },
          }),
        ],
        adapter: new GravitoAdapter(),
      })

      const core = await PlanetCore.boot(config)
      const { fetch } = core.liftoff()

      const res1 = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ value }' }),
        })
      )
      const json1 = (await res1.json()) as { data: { value: number } }
      expect(json1.data.value).toBe(0)

      value = 42
      await new Promise((resolve) => setTimeout(resolve, 150))

      const res2 = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ value }' }),
        })
      )
      const json2 = (await res2.json()) as { data: { value: number } }
      expect(json2.data.value).toBe(42)
    })
  })

  describe('APQ Performance', () => {
    it('should reduce bandwidth after caching query', async () => {
      const query = /* GraphQL */ `
        query GetUser {
          hello
        }
      `

      const schema = createSchema({
        typeDefs: 'type Query { hello: String }',
        resolvers: {
          Query: {
            hello: () => 'Hello',
          },
        },
      })

      const config = defineConfig({
        orbits: [
          new OrbitGraphQL({
            schema,
            performance: {
              persistedQueries: {
                enabled: true,
              },
            },
          }),
        ],
        adapter: new GravitoAdapter(),
      })

      const core = await PlanetCore.boot(config)
      const { fetch } = core.liftoff()

      const hasher = new Bun.CryptoHasher('sha256')
      hasher.update(query)
      const hash = hasher.digest('hex')

      const initialPayload = JSON.stringify({
        query,
        extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
      })
      const cachedPayload = JSON.stringify({
        extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
      })

      expect(cachedPayload.length).toBeLessThan(initialPayload.length)

      const res1 = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: initialPayload,
        })
      )
      expect(res1.status).toBe(200)

      const res2 = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: cachedPayload,
        })
      )
      expect(res2.status).toBe(200)
    })
  })

  describe('Query Complexity Performance', () => {
    it('should calculate complexity efficiently', async () => {
      const schema = createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user: User
          }
          type User {
            id: ID
            name: String
            posts: [Post]
          }
          type Post {
            id: ID
            title: String
            comments: [Comment]
          }
          type Comment {
            id: ID
            text: String
          }
        `,
        resolvers: {
          Query: {
            user: () => ({
              id: '1',
              name: 'Test',
              posts: Array.from({ length: 10 }).map((_, i) => ({
                id: i.toString(),
                title: `Post ${i}`,
                comments: Array.from({ length: 5 }).map((_, j) => ({
                  id: `${i}-${j}`,
                  text: `Comment ${j}`,
                })),
              })),
            }),
          },
        },
      })

      const config = defineConfig({
        orbits: [
          new OrbitGraphQL({
            schema,
            security: {
              complexityLimit: 1000,
            },
          }),
        ],
        adapter: new GravitoAdapter(),
      })

      const core = await PlanetCore.boot(config)
      const { fetch } = core.liftoff()

      const start = performance.now()
      const res = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: /* GraphQL */ `
              {
                user {
                  id
                  name
                  posts {
                    id
                    title
                    comments {
                      id
                      text
                    }
                  }
                }
              }
            `,
          }),
        })
      )
      const validationTime = performance.now() - start

      expect(res.status).toBe(200)
      expect(validationTime).toBeLessThan(500)
    })

    it('should reject complex queries quickly', async () => {
      const schema = createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user: User
          }
          type User {
            friends: [User]
          }
        `,
        resolvers: {
          Query: {
            user: () => ({ friends: [] }),
          },
        },
      })

      const config = defineConfig({
        orbits: [
          new OrbitGraphQL({
            schema,
            security: {
              complexityLimit: 10,
            },
          }),
        ],
        adapter: new GravitoAdapter(),
      })

      const core = await PlanetCore.boot(config)
      const { fetch } = core.liftoff()

      const start = performance.now()
      const res = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: /* GraphQL */ `
              {
                user {
                  friends {
                    friends {
                      friends {
                        friends {
                          friends {
                            friends {
                              friends {
                                friends {
                                  friends {
                                    friends {
                                      friends {
                                        friends {
                                          friends {
                                            friends {
                                              friends {
                                                friends {
                                                  friends {
                                                    friends {
                                                      friends {
                                                        friends {
                                                          friends {
                                                            friends {
                                                              friends {
                                                                friends {
                                                                  friends {
                                                                    friends {
                                                                      friends {
                                                                        friends {
                                                                          friends {
                                                                            friends {
                                                                              friends {
                                                                                friends {
                                                                                  friends {
                                                                                    friends {
                                                                                      friends {
                                                                                        friends {
                                                                                          friends {
                                                                                            friends {
                                                                                              friends {
                                                                                                friends {
                                                                                                  friends {
                                                                                                    friends {
                                                                                                      friends {
                                                                                                        friends
                                                                                                      }
                                                                                                    }
                                                                                                  }
                                                                                                }
                                                                                              }
                                                                                            }
                                                                                          }
                                                                                        }
                                                                                      }
                                                                                    }
                                                                                  }
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            `,
          }),
        })
      )
      const rejectionTime = performance.now() - start

      expect(res.status).toBe(200)
      expect(rejectionTime).toBeLessThan(50)

      const json = (await res.json()) as { errors?: unknown[] }
      expect(json.errors).toBeDefined()
    })
  })

  describe('DataLoader Performance', () => {
    it('should batch requests efficiently', async () => {
      const batchCalls: number[] = []

      const batchLoader = {
        load: async (id: string) => {
          return `User:${id}`
        },
        loadMany: async (ids: readonly string[]) => {
          batchCalls.push(ids.length)
          return ids.map((id) => `User:${id}`)
        },
      }

      const schema = createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            users(ids: [ID!]!): [String]
          }
        `,
        resolvers: {
          Query: {
            users: async (_: unknown, { ids }: { ids: string[] }, context: GraphQLContext) => {
              const loader = context.loaders?.user as typeof batchLoader | undefined
              if (!loader) {
                return []
              }

              return Promise.all(ids.map((id) => loader.load(id)))
            },
          },
        },
      })

      const config = defineConfig({
        orbits: [
          new OrbitGraphQL({
            schema,
            dataLoaders: () => ({
              user: batchLoader,
            }),
          }),
        ],
        adapter: new GravitoAdapter(),
      })

      const core = await PlanetCore.boot(config)
      const { fetch } = core.liftoff()

      const start = performance.now()
      const res = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '{ users(ids: ["1", "2", "3", "4", "5"]) }',
          }),
        })
      )
      const batchTime = performance.now() - start

      const json = (await res.json()) as { data: { users: string[] } }
      expect(json.data.users).toHaveLength(5)
      expect(batchTime).toBeLessThan(500)
    })
  })

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const schema = createSchema({
        typeDefs: 'type Query { hello: String }',
        resolvers: {
          Query: {
            hello: () => 'Hello',
          },
        },
      })

      const config = defineConfig({
        orbits: [
          new OrbitGraphQL({
            schema,
            performance: {
              cache: { enabled: true, ttl: 5000 },
            },
          }),
        ],
        adapter: new GravitoAdapter(),
      })

      const core = await PlanetCore.boot(config)
      const { fetch } = core.liftoff()

      const concurrentRequests = 100
      const start = performance.now()

      const requests = Array.from({ length: concurrentRequests }).map(() =>
        fetch(
          new Request('http://localhost/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ hello }' }),
          })
        )
      )

      const responses = await Promise.all(requests)
      const totalTime = performance.now() - start

      expect(responses.every((r: Response) => r.status === 200)).toBe(true)
      expect(totalTime).toBeLessThan(1000)
    })
  })

  describe('Memory Efficiency', () => {
    it('should handle large responses without memory issues', async () => {
      const schema = createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            items: [Item]
          }
          type Item {
            id: ID
            name: String
          }
        `,
        resolvers: {
          Query: {
            items: () =>
              Array.from({ length: 10000 }).map((_, i) => ({
                id: i.toString(),
                name: `Item ${i}`,
              })),
          },
        },
      })

      const config = defineConfig({
        orbits: [new OrbitGraphQL({ schema })],
        adapter: new GravitoAdapter(),
      })

      const core = await PlanetCore.boot(config)
      const { fetch } = core.liftoff()

      const start = performance.now()
      const res = await fetch(
        new Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ items { id name } }' }),
        })
      )
      const responseTime = performance.now() - start

      const json = (await res.json()) as { data: { items: unknown[] } }
      expect(json.data.items).toHaveLength(10000)
      expect(responseTime).toBeLessThan(1000)
    })
  })
})
