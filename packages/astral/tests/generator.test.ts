import { describe, expect, test } from 'bun:test'
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'
import { astral } from '../src/index'
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
})
