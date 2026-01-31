import { describe, expect, test } from 'bun:test'
import { Type } from '@sinclair/typebox'
import { createAstralResource, createCrudResources, typeboxToOpenApi } from '../src/openapi'

describe('openapi.ts', () => {
  describe('typeboxToOpenApi', () => {
    describe('基本型別', () => {
      test('should convert string type', () => {
        const schema = Type.String()
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('string')
      })

      test('should convert string with constraints', () => {
        const schema = Type.String({
          minLength: 3,
          maxLength: 50,
          pattern: '^[A-Za-z]+$',
        })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('string')
        expect(openapi.minLength).toBe(3)
        expect(openapi.maxLength).toBe(50)
        expect(openapi.pattern).toBe('^[A-Za-z]+$')
      })

      test('should convert string with format', () => {
        const schema = Type.String({ format: 'email' })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('string')
        expect(openapi.format).toBe('email')
      })

      test('should convert number type', () => {
        const schema = Type.Number()
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('number')
      })

      test('should convert number with constraints', () => {
        const schema = Type.Number({ minimum: 0, maximum: 100 })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('number')
        expect(openapi.minimum).toBe(0)
        expect(openapi.maximum).toBe(100)
      })

      test('should convert integer type', () => {
        const schema = Type.Integer()
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('integer')
      })

      test('should convert boolean type', () => {
        const schema = Type.Boolean()
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('boolean')
      })

      test('should convert null type', () => {
        const schema = Type.Null()
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('null')
      })
    })

    describe('複雜型別', () => {
      test('should convert array type', () => {
        const schema = Type.Array(Type.String())
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('array')
        expect(openapi.items).toEqual({ type: 'string' })
      })

      test('should convert array with constraints', () => {
        const schema = Type.Array(Type.Number(), {
          minItems: 1,
          maxItems: 10,
        })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('array')
        expect(openapi.minItems).toBe(1)
        expect(openapi.maxItems).toBe(10)
      })

      test('should convert object type', () => {
        const schema = Type.Object({
          name: Type.String(),
          age: Type.Number(),
        })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('object')
        expect(openapi.properties).toEqual({
          name: { type: 'string' },
          age: { type: 'number' },
        })
        expect(openapi.required).toEqual(['name', 'age'])
      })

      test('should handle optional properties', () => {
        const schema = Type.Object({
          name: Type.String(),
          email: Type.Optional(Type.String()),
        })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.required).toEqual(['name'])
        expect(openapi.properties?.email).toEqual({ type: 'string' })
      })

      test('should handle nested objects', () => {
        const schema = Type.Object({
          user: Type.Object({
            name: Type.String(),
            email: Type.String(),
          }),
        })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.type).toBe('object')
        expect(openapi.properties?.user).toEqual({
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['name', 'email'],
        })
      })
    })

    describe('特殊型別', () => {
      test('should convert literal type', () => {
        const schema = Type.Literal('active')
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.enum).toEqual(['active'])
        expect(openapi.type).toBe('string')
      })

      test('should convert union type', () => {
        const schema = Type.Union([Type.String(), Type.Number()])
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.anyOf).toEqual([{ type: 'string' }, { type: 'number' }])
      })

      test('should convert intersect type', () => {
        const schema = Type.Intersect([
          Type.Object({ name: Type.String() }),
          Type.Object({ age: Type.Number() }),
        ])
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.allOf).toBeDefined()
        expect(openapi.allOf?.length).toBe(2)
      })
    })

    describe('metadata', () => {
      test('should preserve description', () => {
        const schema = Type.String({ description: 'User email address' })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.description).toBe('User email address')
      })

      test('should preserve default value', () => {
        const schema = Type.String({ default: 'guest' })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.default).toBe('guest')
      })

      test('should include example from examples array', () => {
        const schema = Type.String({ examples: ['example1', 'example2'] })
        const openapi = typeboxToOpenApi(schema)

        expect(openapi.example).toBe('example1')
      })
    })
  })

  describe('createAstralResource', () => {
    test('should create basic resource', () => {
      const resource = createAstralResource({
        path: '/users',
        method: 'GET',
        responseSchema: Type.Array(Type.Object({ id: Type.String() })),
      })

      expect(resource.path).toBe('/users')
      expect(resource.method).toBe('GET')
      expect(resource.responses['200']).toBeDefined()
    })

    test('should include summary and description', () => {
      const resource = createAstralResource({
        path: '/users',
        method: 'GET',
        summary: 'Get all users',
        description: 'Returns a list of all users',
        responseSchema: Type.Array(Type.Object({})),
      })

      expect(resource.summary).toBe('Get all users')
      expect(resource.description).toBe('Returns a list of all users')
    })

    test('should include tags', () => {
      const resource = createAstralResource({
        path: '/users',
        method: 'GET',
        tags: ['users', 'public'],
        responseSchema: Type.Object({}),
      })

      expect(resource.tags).toEqual(['users', 'public'])
    })

    test('should include request body for POST', () => {
      const resource = createAstralResource({
        path: '/users',
        method: 'POST',
        requestSchema: Type.Object({
          name: Type.String(),
          email: Type.String(),
        }),
        responseSchema: Type.Object({ id: Type.String() }),
      })

      expect(resource.requestBody).toBeDefined()
      expect(resource.requestBody?.required).toBe(true)
      expect(resource.requestBody?.content['application/json'].schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      })
    })

    test('should include request body for PUT', () => {
      const resource = createAstralResource({
        path: '/users/:id',
        method: 'PUT',
        requestSchema: Type.Object({ name: Type.String() }),
        responseSchema: Type.Object({}),
      })

      expect(resource.requestBody).toBeDefined()
    })

    test('should include request body for PATCH', () => {
      const resource = createAstralResource({
        path: '/users/:id',
        method: 'PATCH',
        requestSchema: Type.Object({ name: Type.String() }),
        responseSchema: Type.Object({}),
      })

      expect(resource.requestBody).toBeDefined()
    })

    test('should not include request body for GET', () => {
      const resource = createAstralResource({
        path: '/users',
        method: 'GET',
        requestSchema: Type.Object({ name: Type.String() }),
        responseSchema: Type.Object({}),
      })

      expect(resource.requestBody).toBeUndefined()
    })

    test('should not include request body for DELETE', () => {
      const resource = createAstralResource({
        path: '/users/:id',
        method: 'DELETE',
        requestSchema: Type.Object({ name: Type.String() }),
        responseSchema: Type.Object({}),
      })

      expect(resource.requestBody).toBeUndefined()
    })

    test('should support custom response status code', () => {
      const resource = createAstralResource({
        path: '/users',
        method: 'POST',
        requestSchema: Type.Object({ name: Type.String() }),
        responseSchema: Type.Object({ id: Type.String() }),
        responseStatusCode: 201,
      })

      expect(resource.responses['201']).toBeDefined()
      expect(resource.responses['200']).toBeUndefined()
    })

    test('should support custom response description', () => {
      const resource = createAstralResource({
        path: '/users',
        method: 'GET',
        responseSchema: Type.Object({}),
        responseDescription: 'Custom success response',
      })

      expect(resource.responses['200'].description).toBe('Custom success response')
    })

    test('should normalize method to uppercase', () => {
      const resource = createAstralResource({
        path: '/users',
        method: 'get',
        responseSchema: Type.Object({}),
      })

      expect(resource.method).toBe('GET')
    })
  })

  describe('createCrudResources', () => {
    const userItemSchema = Type.Object({
      id: Type.String(),
      name: Type.String(),
      email: Type.String(),
    })

    const userCreateSchema = Type.Object({
      name: Type.String(),
      email: Type.String(),
    })

    const userUpdateSchema = Type.Partial(userCreateSchema)

    test('should create all CRUD resources', () => {
      const resources = createCrudResources({
        resourceName: 'user',
        basePath: '/users',
        schemas: {
          item: userItemSchema,
          create: userCreateSchema,
          update: userUpdateSchema,
        },
      })

      expect(resources.list).toBeDefined()
      expect(resources.get).toBeDefined()
      expect(resources.create).toBeDefined()
      expect(resources.update).toBeDefined()
      expect(resources.delete).toBeDefined()
    })

    test('should configure list endpoint correctly', () => {
      const resources = createCrudResources({
        resourceName: 'user',
        basePath: '/users',
        schemas: {
          item: userItemSchema,
          create: userCreateSchema,
          update: userUpdateSchema,
        },
      })

      expect(resources.list.path).toBe('/users')
      expect(resources.list.method).toBe('GET')
      expect(resources.list.requestBody).toBeUndefined()
    })

    test('should configure get endpoint correctly', () => {
      const resources = createCrudResources({
        resourceName: 'user',
        basePath: '/users',
        schemas: {
          item: userItemSchema,
          create: userCreateSchema,
          update: userUpdateSchema,
        },
      })

      expect(resources.get.path).toBe('/users/:id')
      expect(resources.get.method).toBe('GET')
    })

    test('should configure create endpoint correctly', () => {
      const resources = createCrudResources({
        resourceName: 'user',
        basePath: '/users',
        schemas: {
          item: userItemSchema,
          create: userCreateSchema,
          update: userUpdateSchema,
        },
      })

      expect(resources.create.path).toBe('/users')
      expect(resources.create.method).toBe('POST')
      expect(resources.create.requestBody).toBeDefined()
      expect(resources.create.responses['201']).toBeDefined()
    })

    test('should configure update endpoint correctly', () => {
      const resources = createCrudResources({
        resourceName: 'user',
        basePath: '/users',
        schemas: {
          item: userItemSchema,
          create: userCreateSchema,
          update: userUpdateSchema,
        },
      })

      expect(resources.update.path).toBe('/users/:id')
      expect(resources.update.method).toBe('PATCH')
      expect(resources.update.requestBody).toBeDefined()
    })

    test('should configure delete endpoint correctly', () => {
      const resources = createCrudResources({
        resourceName: 'user',
        basePath: '/users',
        schemas: {
          item: userItemSchema,
          create: userCreateSchema,
          update: userUpdateSchema,
        },
      })

      expect(resources.delete.path).toBe('/users/:id')
      expect(resources.delete.method).toBe('DELETE')
    })

    test('should use custom tags', () => {
      const resources = createCrudResources({
        resourceName: 'user',
        basePath: '/users',
        tags: ['users', 'public'],
        schemas: {
          item: userItemSchema,
          create: userCreateSchema,
          update: userUpdateSchema,
        },
      })

      expect(resources.list.tags).toEqual(['users', 'public'])
      expect(resources.create.tags).toEqual(['users', 'public'])
    })

    test('should default to resource name as tag', () => {
      const resources = createCrudResources({
        resourceName: 'user',
        basePath: '/users',
        schemas: {
          item: userItemSchema,
          create: userCreateSchema,
          update: userUpdateSchema,
        },
      })

      expect(resources.list.tags).toEqual(['user'])
    })
  })
})
