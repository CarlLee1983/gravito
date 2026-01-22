import { describe, expect, test } from 'bun:test'
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'
import { AstralConfigError, AstralResourceError, AstralSchemaError } from '../src/errors'
import { astral, OrbitAstral } from '../src/index'
import { OpenApiGenerator } from '../src/OpenApiGenerator'

describe('OpenApiGenerator', () => {
  const UserDTO = z.object({
    id: z.number(),
    name: z.string(),
  })

  class StoreRequest extends FormRequest {
    schema = z.object({
      email: z.string().email(),
    })
  }

  const config = {
    contracts: [
      astral.resource('/api/users', {
        operations: {
          index: { summary: 'List', output: [UserDTO] },
          store: { summary: 'Create', input: StoreRequest, output: UserDTO },
        },
      }),
    ],
  }

  const generator = new OpenApiGenerator(config)

  test('should generate base openapi structure', () => {
    const spec = generator.generate([])
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.info.title).toBe('API Documentation')
  })

  test('should map routes correctly', () => {
    const routes = [
      { path: '/api/users', method: 'GET', name: 'user.index' },
      { path: '/api/users', method: 'POST', name: 'user.store' },
    ]
    const spec = generator.generate(routes)

    expect(spec.paths['/api/users']).toBeDefined()
    expect(spec.paths['/api/users'].get).toBeDefined()
    expect(spec.paths['/api/users'].post).toBeDefined()
    expect(spec.paths['/api/users'].get.summary).toBe('List')
  })

  test('should transform zod array to openapi array schema', () => {
    const routes = [{ path: '/api/users', method: 'GET' }]
    const spec = generator.generate(routes)
    const response = spec.paths['/api/users'].get.responses['200']

    expect(response.content['application/json'].schema.type).toBe('array')
  })

  test('should extract schema from FormRequest class', () => {
    const routes = [{ path: '/api/users', method: 'POST' }]
    const spec = generator.generate(routes)
    const body = spec.paths['/api/users'].post.requestBody

    expect(body.content['application/json'].schema.properties.email).toBeDefined()
  })

  test('should handle error responses', () => {
    const configWithErrors = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            index: {
              summary: 'List',
              output: [UserDTO],
              errors: {
                401: 'Unauthorized',
                403: z.object({ message: z.string() }),
              },
            },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithErrors)
    const routes = [{ path: '/api/users', method: 'GET' }]
    const spec = gen.generate(routes)

    expect(spec.paths['/api/users'].get.responses['401']).toBeDefined()
    expect(
      spec.paths['/api/users'].get.responses['403'].content['application/json'].schema.properties
        .message
    ).toBeDefined()
  })

  test('should handle query parameters for GET', () => {
    const FilterSchema = z.object({
      q: z.string().optional(),
      page: z.number().default(1),
    })
    const configWithQuery = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            index: {
              summary: 'List',
              input: FilterSchema,
              output: [UserDTO],
            },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithQuery)
    const routes = [{ path: '/api/users', method: 'GET' }]
    const spec = gen.generate(routes)

    const params = spec.paths['/api/users'].get.parameters
    expect(params).toBeDefined()
    expect(params.find((p: any) => p.name === 'q')).toBeDefined()
    expect(params.find((p: any) => p.name === 'page')).toBeDefined()
  })

  test('should extract path parameters from route', () => {
    const configWithParams = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            show: {
              summary: 'Get user',
              output: UserDTO,
            },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithParams)
    const routes = [{ path: '/api/users/:id', method: 'GET' }]
    const spec = gen.generate(routes)

    const params = spec.paths['/api/users/{id}'].get.parameters
    expect(params).toBeDefined()
    expect(params.find((p: any) => p.name === 'id' && p.in === 'path')).toBeDefined()
  })

  test('should handle custom params from operation definition', () => {
    const configWithCustomParams = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            show: {
              summary: 'Get user',
              output: UserDTO,
              params: {
                id: z.string().uuid(),
              },
            },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithCustomParams)
    const routes = [{ path: '/api/users/:id', method: 'GET' }]
    const spec = gen.generate(routes)

    const params = spec.paths['/api/users/{id}'].get.parameters
    expect(params).toBeDefined()
    expect(params.length).toBeGreaterThan(0)
  })

  test('should handle custom status codes', () => {
    const configWithStatus = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            store: {
              summary: 'Create',
              input: StoreRequest,
              output: UserDTO,
              status: 201,
            },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithStatus)
    const routes = [{ path: '/api/users', method: 'POST' }]
    const spec = gen.generate(routes)

    expect(spec.paths['/api/users'].post.responses['201']).toBeDefined()
  })

  test('should add operationId and deprecated fields', () => {
    const configWithMeta = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            index: {
              summary: 'List',
              output: [UserDTO],
              operationId: 'listUsers',
              deprecated: true,
            },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithMeta)
    const routes = [{ path: '/api/users', method: 'GET' }]
    const spec = gen.generate(routes)

    expect(spec.paths['/api/users'].get.operationId).toBe('listUsers')
    expect(spec.paths['/api/users'].get.deprecated).toBe(true)
  })

  test('should handle security requirements', () => {
    const configWithSecurity = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            index: {
              summary: 'List',
              output: [UserDTO],
              security: [{ bearerAuth: [] }],
            },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithSecurity)
    const routes = [{ path: '/api/users', method: 'GET' }]
    const spec = gen.generate(routes)

    expect(spec.paths['/api/users'].get.security).toBeDefined()
    expect(spec.paths['/api/users'].get.security[0].bearerAuth).toBeDefined()
  })

  test('should handle external documentation', () => {
    const configWithExternalDocs = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            index: {
              summary: 'List',
              output: [UserDTO],
              externalDocs: {
                url: 'https://example.com/docs',
                description: 'User API Docs',
              },
            },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithExternalDocs)
    const routes = [{ path: '/api/users', method: 'GET' }]
    const spec = gen.generate(routes)

    expect(spec.paths['/api/users'].get.externalDocs).toBeDefined()
    expect(spec.paths['/api/users'].get.externalDocs.url).toBe('https://example.com/docs')
  })

  test('should use precise route matching - not match /users2 when resource is /users', () => {
    const configWithUsers = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            index: { summary: 'List users', output: [UserDTO] },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithUsers)
    const routes = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users2', method: 'GET' },
    ]
    const spec = gen.generate(routes)

    // /api/users 應該存在
    expect(spec.paths['/api/users']).toBeDefined()
    // /api/users2 不應該被匹配到 /api/users 資源
    expect(spec.paths['/api/users2']).toBeUndefined()
  })

  test('should match nested routes correctly', () => {
    const configWithNested = {
      contracts: [
        astral.resource('/api/users', {
          operations: {
            index: { summary: 'List', output: [UserDTO] },
            show: { summary: 'Get', output: UserDTO },
          },
        }),
      ],
    }
    const gen = new OpenApiGenerator(configWithNested)
    const routes = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users/:id', method: 'GET' },
    ]
    const spec = gen.generate(routes)

    expect(spec.paths['/api/users']).toBeDefined()
    expect(spec.paths['/api/users/{id}']).toBeDefined()
  })
})

describe('OrbitAstral Configuration Validation', () => {
  test('should validate uiPath starts with /', () => {
    expect(() => {
      new OrbitAstral({ uiPath: 'docs' })
    }).toThrow(AstralConfigError)
  })

  test('should validate jsonPath starts with /', () => {
    expect(() => {
      new OrbitAstral({ jsonPath: 'openapi.json' })
    }).toThrow(AstralConfigError)
  })

  test('should validate version format', () => {
    expect(() => {
      new OrbitAstral({ version: 'v1' })
    }).toThrow(AstralConfigError)
  })

  test('should accept valid version format', () => {
    expect(() => {
      new OrbitAstral({ version: '1.0.0' })
    }).not.toThrow()
  })

  test('should validate contracts is an array', () => {
    expect(() => {
      new OrbitAstral({ contracts: {} as any })
    }).toThrow(AstralConfigError)
  })

  test('should validate resource path starts with /', () => {
    expect(() => {
      new OrbitAstral({
        contracts: [
          astral.resource('users', {
            operations: { index: { summary: 'List' } },
          }),
        ],
      })
    }).toThrow(AstralResourceError)
  })

  test('should validate resource has operations', () => {
    expect(() => {
      new OrbitAstral({
        contracts: [
          {
            path: '/users',
            operations: {},
          },
        ],
      })
    }).toThrow(AstralResourceError)
  })

  test('should validate operation status code range', () => {
    expect(() => {
      new OrbitAstral({
        contracts: [
          astral.resource('/users', {
            operations: {
              index: {
                summary: 'List',
                status: 999,
              },
            },
          }),
        ],
      })
    }).toThrow(AstralResourceError)
  })

  test('should validate error status code range', () => {
    expect(() => {
      new OrbitAstral({
        contracts: [
          astral.resource('/users', {
            operations: {
              index: {
                summary: 'List',
                errors: {
                  999: 'Invalid',
                },
              },
            },
          }),
        ],
      })
    }).toThrow(AstralResourceError)
  })

  test('should validate externalDocs URL', () => {
    expect(() => {
      new OrbitAstral({
        contracts: [
          astral.resource('/users', {
            operations: {
              index: {
                summary: 'List',
                externalDocs: {
                  url: '',
                },
              },
            },
          }),
        ],
      })
    }).toThrow(AstralResourceError)
  })

  test('should validate servers configuration', () => {
    expect(() => {
      new OrbitAstral({
        servers: [{ url: '' }],
      })
    }).toThrow(AstralConfigError)
  })

  test('should accept valid servers configuration', () => {
    expect(() => {
      new OrbitAstral({
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production',
          },
        ],
      })
    }).not.toThrow()
  })

  test('should validate tags configuration', () => {
    expect(() => {
      new OrbitAstral({
        tags: [{ name: '' } as any],
      })
    }).toThrow(AstralConfigError)
  })

  test('should detect duplicate tag names', () => {
    expect(() => {
      new OrbitAstral({
        tags: [{ name: 'users' }, { name: 'users' }],
      })
    }).toThrow(AstralConfigError)
  })

  test('should accept valid tags configuration', () => {
    expect(() => {
      new OrbitAstral({
        tags: [
          { name: 'users', description: 'User operations' },
          { name: 'posts', description: 'Post operations' },
        ],
      })
    }).not.toThrow()
  })
})
