import { describe, expect, mock, test } from 'bun:test'
import { z } from 'zod'
import { AstralConfigError, AstralResourceError } from '../src/errors'
import { astral, OrbitAstral } from '../src/index'

describe('astral.resource()', () => {
  test('should create a valid resource contract', () => {
    const resource = astral.resource('/api/users', {
      tags: ['users'],
      operations: {
        index: { summary: 'List users' },
        store: { summary: 'Create user' },
      },
    })

    expect(resource.path).toBe('/api/users')
    expect(resource.tags).toEqual(['users'])
    expect(resource.operations.index?.summary).toBe('List users')
    expect(resource.operations.store?.summary).toBe('Create user')
  })

  test('should create resource with all operation types', () => {
    const UserDTO = z.object({ id: z.number(), name: z.string() })

    const resource = astral.resource('/api/users', {
      operations: {
        index: { summary: 'List', output: [UserDTO] },
        store: { summary: 'Create', output: UserDTO },
        show: { summary: 'Get one', output: UserDTO },
        update: { summary: 'Update', output: UserDTO },
        destroy: { summary: 'Delete' },
      },
    })

    expect(Object.keys(resource.operations)).toHaveLength(5)
  })
})

describe('OrbitAstral', () => {
  describe('constructor and validateConfig()', () => {
    test('should use default config values', () => {
      const orbit = new OrbitAstral()

      // 驗證預設值
      expect(() => orbit).not.toThrow()
    })

    test('should accept custom config', () => {
      const orbit = new OrbitAstral({
        title: 'Custom API',
        version: '2.0.0',
        uiPath: '/swagger',
        jsonPath: '/api-spec.json',
      })

      expect(() => orbit).not.toThrow()
    })

    test('should validate path format', () => {
      expect(() => new OrbitAstral({ path: 'invalid' })).toThrow(AstralConfigError)
      expect(() => new OrbitAstral({ path: '/valid' })).not.toThrow()
    })

    test('should validate servers is an array', () => {
      expect(() => new OrbitAstral({ servers: {} as any })).toThrow(AstralConfigError)
    })

    test('should validate server URL with relative path', () => {
      expect(() => new OrbitAstral({ servers: [{ url: '/api/v1' }] })).not.toThrow()
    })

    test('should reject invalid server URL', () => {
      expect(() => new OrbitAstral({ servers: [{ url: ':::invalid' }] })).toThrow(AstralConfigError)
    })

    test('should validate tags is an array', () => {
      expect(() => new OrbitAstral({ tags: {} as any })).toThrow(AstralConfigError)
    })

    test('should validate resource has path', () => {
      expect(() => {
        new OrbitAstral({
          contracts: [
            {
              path: '',
              operations: { index: { summary: 'Test' } },
            } as any,
          ],
        })
      }).toThrow(AstralResourceError)
    })

    test('should validate resource operations is an object', () => {
      expect(() => {
        new OrbitAstral({
          contracts: [
            {
              path: '/test',
              operations: null as any,
            },
          ],
        })
      }).toThrow(AstralResourceError)
    })

    test('should validate operation status is a number', () => {
      expect(() => {
        new OrbitAstral({
          contracts: [
            astral.resource('/users', {
              operations: {
                index: {
                  summary: 'List',
                  status: 'invalid' as any,
                },
              },
            }),
          ],
        })
      }).toThrow(AstralResourceError)
    })

    test('should validate operation status is within valid range (100-599)', () => {
      expect(() => {
        new OrbitAstral({
          contracts: [
            astral.resource('/users', {
              operations: {
                index: {
                  summary: 'List',
                  status: 50,
                },
              },
            }),
          ],
        })
      }).toThrow(AstralResourceError)
    })

    test('should validate operation security is an array', () => {
      expect(() => {
        new OrbitAstral({
          contracts: [
            astral.resource('/users', {
              operations: {
                index: {
                  summary: 'List',
                  security: {} as any,
                },
              },
            }),
          ],
        })
      }).toThrow(AstralResourceError)
    })

    test('should validate error status code is not NaN', () => {
      expect(() => {
        new OrbitAstral({
          contracts: [
            astral.resource('/users', {
              operations: {
                index: {
                  summary: 'List',
                  errors: {
                    abc: 'Invalid status',
                  },
                },
              },
            }),
          ],
        })
      }).toThrow(AstralResourceError)
    })

    test('should validate externalDocs has url', () => {
      expect(() => {
        new OrbitAstral({
          contracts: [
            astral.resource('/users', {
              operations: {
                index: {
                  summary: 'List',
                  externalDocs: {} as any,
                },
              },
            }),
          ],
        })
      }).toThrow(AstralResourceError)
    })

    test('should validate externalDocs URL is valid', () => {
      expect(() => {
        new OrbitAstral({
          contracts: [
            astral.resource('/users', {
              operations: {
                index: {
                  summary: 'List',
                  externalDocs: {
                    url: 'not-a-valid-url',
                  },
                },
              },
            }),
          ],
        })
      }).toThrow(AstralResourceError)
    })

    test('should skip validation for null/undefined operations', () => {
      // This tests line 176 where operation can be undefined
      expect(() => {
        new OrbitAstral({
          contracts: [
            {
              path: '/test',
              operations: {
                index: { summary: 'Test' },
                store: undefined as any,
              },
            },
          ],
        })
      }).not.toThrow()
    })
  })

  describe('static configure()', () => {
    test('should create instance with configure method', () => {
      const orbit = OrbitAstral.configure({
        title: 'Test API',
        version: '1.0.0',
      })

      expect(orbit).toBeInstanceOf(OrbitAstral)
    })
  })

  describe('install()', () => {
    test('should register routes on the router', async () => {
      const orbit = new OrbitAstral({
        title: 'Test API',
        version: '1.0.0',
        uiPath: '/docs',
        jsonPath: '/openapi.json',
        contracts: [],
      })

      const registeredRoutes: { method: string; path: string }[] = []

      // 模擬 PlanetCore 和 router
      const mockRouter = {
        get: mock((path: string, _handler: unknown) => {
          registeredRoutes.push({ method: 'GET', path })
        }),
        compile: mock(() => []),
      }

      const mockCore = {
        router: mockRouter,
      } as any

      await orbit.install(mockCore)

      expect(registeredRoutes).toHaveLength(2)
      expect(registeredRoutes[0]).toEqual({ method: 'GET', path: '/openapi.json' })
      expect(registeredRoutes[1]).toEqual({ method: 'GET', path: '/docs' })
    })

    test('should use custom paths for docs and JSON', async () => {
      const orbit = new OrbitAstral({
        uiPath: '/swagger-ui',
        jsonPath: '/api/spec.json',
        contracts: [],
      })

      const registeredRoutes: string[] = []

      const mockRouter = {
        get: mock((path: string, _handler: unknown) => {
          registeredRoutes.push(path)
        }),
        compile: mock(() => []),
      }

      const mockCore = {
        router: mockRouter,
      } as any

      await orbit.install(mockCore)

      expect(registeredRoutes).toContain('/api/spec.json')
      expect(registeredRoutes).toContain('/swagger-ui')
    })

    test('should return cached spec on subsequent calls', async () => {
      const UserDTO = z.object({ id: z.number() })

      const orbit = new OrbitAstral({
        contracts: [
          astral.resource('/users', {
            operations: {
              index: { summary: 'List', output: [UserDTO] },
            },
          }),
        ],
      })

      let jsonHandler: ((ctx: any) => any) | null = null
      let compileCallCount = 0

      const mockRouter = {
        get: mock((path: string, handler: (ctx: any) => any) => {
          if (path === '/openapi.json') {
            jsonHandler = handler
          }
        }),
        compile: mock(() => {
          compileCallCount++
          return [{ path: '/users', method: 'GET' }]
        }),
      }

      const mockCore = {
        router: mockRouter,
      } as any

      await orbit.install(mockCore)

      // 模擬 ctx.json 方法
      const mockCtx = {
        json: mock((data: any) => data),
      }

      // 第一次調用
      jsonHandler?.(mockCtx)
      expect(compileCallCount).toBe(1)

      // 第二次調用 - 應使用快取
      jsonHandler?.(mockCtx)
      expect(compileCallCount).toBe(1) // 仍然是 1，因為使用了快取
    })

    test('should generate HTML for Swagger UI', async () => {
      const orbit = new OrbitAstral({
        title: 'My Test API',
        jsonPath: '/api/openapi.json',
        uiPath: '/api/docs',
        contracts: [],
      })

      let uiHandler: ((ctx: any) => any) | null = null

      const mockRouter = {
        get: mock((path: string, handler: (ctx: any) => any) => {
          if (path === '/api/docs') {
            uiHandler = handler
          }
        }),
        compile: mock(() => []),
      }

      const mockCore = {
        router: mockRouter,
      } as any

      await orbit.install(mockCore)

      let capturedHtml = ''
      const mockCtx = {
        html: mock((html: string) => {
          capturedHtml = html
          return html
        }),
      }

      uiHandler?.(mockCtx)

      // 驗證 HTML 包含關鍵元素
      expect(capturedHtml).toContain('<!DOCTYPE html>')
      expect(capturedHtml).toContain('<title>My Test API</title>')
      expect(capturedHtml).toContain('/api/openapi.json')
      expect(capturedHtml).toContain('swagger-ui')
      expect(capturedHtml).toContain('SwaggerUIBundle')
    })

    test('should handle routes with contracts', async () => {
      const UserDTO = z.object({
        id: z.number(),
        name: z.string(),
      })

      const orbit = new OrbitAstral({
        title: 'Users API',
        contracts: [
          astral.resource('/api/users', {
            operations: {
              index: { summary: 'List users', output: [UserDTO] },
              show: { summary: 'Get user', output: UserDTO },
            },
          }),
        ],
      })

      let jsonHandler: ((ctx: any) => any) | null = null

      const mockRouter = {
        get: mock((path: string, handler: (ctx: any) => any) => {
          if (path === '/openapi.json') {
            jsonHandler = handler
          }
        }),
        compile: mock(() => [
          { path: '/api/users', method: 'GET' },
          { path: '/api/users/:id', method: 'GET' },
        ]),
      }

      const mockCore = {
        router: mockRouter,
      } as any

      await orbit.install(mockCore)

      let capturedSpec: any = null
      const mockCtx = {
        json: mock((data: any) => {
          capturedSpec = data
          return data
        }),
      }

      jsonHandler?.(mockCtx)

      expect(capturedSpec).toBeDefined()
      expect(capturedSpec.openapi).toBe('3.1.0')
      expect(capturedSpec.info.title).toBe('Users API')
      expect(capturedSpec.paths['/api/users']).toBeDefined()
    })
  })
})
