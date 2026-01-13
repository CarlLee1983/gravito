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
})
