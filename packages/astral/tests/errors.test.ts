import { describe, expect, test } from 'bun:test'
import {
  AstralConfigError,
  AstralError,
  AstralGenerationError,
  AstralResourceError,
  AstralRouteError,
  AstralSchemaError,
} from '../src/errors'

describe('AstralError', () => {
  test('should create base error with message and code', () => {
    const error = new AstralError('Test error message', 'TEST_ERROR_CODE')

    expect(error.message).toBe('Test error message')
    expect(error.code).toBe('TEST_ERROR_CODE')
    expect(error.name).toBe('AstralError')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AstralError)
  })

  test('should have proper stack trace', () => {
    const error = new AstralError('Stack test', 'STACK_TEST')

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('AstralError')
  })
})

describe('AstralConfigError', () => {
  test('should create config error with field information', () => {
    const error = new AstralConfigError('Invalid value', 'uiPath')

    expect(error.message).toBe("Astral configuration error at 'uiPath': Invalid value")
    expect(error.code).toBe('ASTRAL_CONFIG_ERROR')
    expect(error.field).toBe('uiPath')
    expect(error.name).toBe('AstralConfigError')
    expect(error).toBeInstanceOf(AstralError)
    expect(error).toBeInstanceOf(AstralConfigError)
  })

  test('should handle various field names', () => {
    const error1 = new AstralConfigError('must be an array', 'contracts')
    expect(error1.field).toBe('contracts')

    const error2 = new AstralConfigError('must start with /', 'jsonPath')
    expect(error2.field).toBe('jsonPath')

    const error3 = new AstralConfigError('invalid format', 'version')
    expect(error3.field).toBe('version')
  })
})

describe('AstralSchemaError', () => {
  test('should create schema error without cause', () => {
    const mockSchema = { _def: { typeName: 'ZodString' } }
    const error = new AstralSchemaError('Failed to convert', mockSchema)

    expect(error.message).toBe('Schema conversion error: Failed to convert')
    expect(error.code).toBe('ASTRAL_SCHEMA_ERROR')
    expect(error.schema).toBe(mockSchema)
    expect(error.cause).toBeUndefined()
    expect(error.name).toBe('AstralSchemaError')
    expect(error).toBeInstanceOf(AstralError)
    expect(error).toBeInstanceOf(AstralSchemaError)
  })

  test('should create schema error with cause and splice stack trace', () => {
    const mockSchema = { _def: { typeName: 'ZodObject' } }
    const originalError = new Error('Original error')
    originalError.stack = 'Error: Original error\n    at test.ts:10:5'

    const error = new AstralSchemaError('Conversion failed', mockSchema, originalError)

    expect(error.message).toBe('Schema conversion error: Conversion failed')
    expect(error.cause).toBe(originalError)
    expect(error.stack).toContain('Caused by:')
    expect(error.stack).toContain('Original error')
  })

  test('should handle cause with undefined stack', () => {
    const mockSchema = {}
    const causeError = new Error('No stack')
    causeError.stack = undefined

    const error = new AstralSchemaError('Test', mockSchema, causeError)

    expect(error.cause).toBe(causeError)
    expect(error.stack).toContain('Caused by: undefined')
  })

  test('should handle any type of schema', () => {
    const error1 = new AstralSchemaError('Test', null)
    expect(error1.schema).toBeNull()

    const error2 = new AstralSchemaError('Test', { custom: 'schema' })
    expect(error2.schema).toEqual({ custom: 'schema' })

    const error3 = new AstralSchemaError('Test', 'string-schema')
    expect(error3.schema).toBe('string-schema')
  })
})

describe('AstralResourceError', () => {
  const mockResource = {
    path: '/api/users',
    operations: {
      index: { summary: 'List users' },
    },
  }

  test('should create resource error without field', () => {
    const error = new AstralResourceError('Invalid resource', mockResource)

    expect(error.message).toBe("Resource '/api/users' validation error: Invalid resource")
    expect(error.code).toBe('ASTRAL_RESOURCE_ERROR')
    expect(error.resource).toBe(mockResource)
    expect(error.field).toBeUndefined()
    expect(error.name).toBe('AstralResourceError')
    expect(error).toBeInstanceOf(AstralError)
    expect(error).toBeInstanceOf(AstralResourceError)
  })

  test('should create resource error with field', () => {
    const error = new AstralResourceError('Must be a number', mockResource, 'status')

    expect(error.message).toBe(
      "Resource '/api/users' validation error at field 'status': Must be a number"
    )
    expect(error.field).toBe('status')
  })

  test('should handle nested field paths', () => {
    const error = new AstralResourceError('Invalid', mockResource, 'operations.index.status')

    expect(error.message).toContain("at field 'operations.index.status'")
    expect(error.field).toBe('operations.index.status')
  })

  test('should preserve resource object reference', () => {
    const resource = { path: '/test', operations: { show: {} } }
    const error = new AstralResourceError('Test', resource, 'path')

    expect(error.resource).toBe(resource)
    expect(error.resource.path).toBe('/test')
  })
})

describe('AstralRouteError', () => {
  test('should create route error without method', () => {
    const error = new AstralRouteError('Route not found', '/api/users')

    expect(error.message).toBe("Route error '/api/users': Route not found")
    expect(error.code).toBe('ASTRAL_ROUTE_ERROR')
    expect(error.path).toBe('/api/users')
    expect(error.method).toBeUndefined()
    expect(error.name).toBe('AstralRouteError')
    expect(error).toBeInstanceOf(AstralError)
    expect(error).toBeInstanceOf(AstralRouteError)
  })

  test('should create route error with method', () => {
    const error = new AstralRouteError('Method not allowed', '/api/users', 'DELETE')

    expect(error.message).toBe("Route error [DELETE] '/api/users': Method not allowed")
    expect(error.method).toBe('DELETE')
  })

  test('should handle various HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

    for (const method of methods) {
      const error = new AstralRouteError('Test', '/test', method)
      expect(error.message).toContain(`[${method}]`)
      expect(error.method).toBe(method)
    }
  })

  test('should handle paths with parameters', () => {
    const error = new AstralRouteError('Parameter error', '/api/users/:id/posts/:postId', 'GET')

    expect(error.path).toBe('/api/users/:id/posts/:postId')
    expect(error.message).toContain('/api/users/:id/posts/:postId')
  })

  test('should handle empty path', () => {
    const error = new AstralRouteError('Invalid path', '')

    expect(error.path).toBe('')
    expect(error.message).toBe("Route error '': Invalid path")
  })
})

describe('AstralGenerationError', () => {
  test('should create generation error without context and cause', () => {
    const error = new AstralGenerationError('Generation failed')

    expect(error.message).toBe('OpenAPI generation error: Generation failed')
    expect(error.code).toBe('ASTRAL_GENERATION_ERROR')
    expect(error.context).toBeUndefined()
    expect(error.cause).toBeUndefined()
    expect(error.name).toBe('AstralGenerationError')
    expect(error).toBeInstanceOf(AstralError)
    expect(error).toBeInstanceOf(AstralGenerationError)
  })

  test('should create generation error with context', () => {
    const context = {
      operationId: 'listUsers',
      path: '/api/users',
      method: 'GET',
    }
    const error = new AstralGenerationError('Failed to generate', context)

    expect(error.context).toBe(context)
    expect(error.context?.operationId).toBe('listUsers')
    expect(error.cause).toBeUndefined()
  })

  test('should create generation error with cause and splice stack trace', () => {
    const originalError = new Error('Schema error')
    originalError.stack = 'Error: Schema error\n    at generator.ts:50:10'

    const error = new AstralGenerationError('Generation failed', undefined, originalError)

    expect(error.cause).toBe(originalError)
    expect(error.context).toBeUndefined()
    expect(error.stack).toContain('Caused by:')
    expect(error.stack).toContain('Schema error')
  })

  test('should create generation error with both context and cause', () => {
    const context = { phase: 'schema-conversion' }
    const cause = new Error('Nested error')
    cause.stack = 'Error: Nested error\n    at nested.ts:100:5'

    const error = new AstralGenerationError('Full error', context, cause)

    expect(error.context).toEqual({ phase: 'schema-conversion' })
    expect(error.cause).toBe(cause)
    expect(error.stack).toContain('Caused by:')
    expect(error.stack).toContain('Nested error')
  })

  test('should handle context with various data types', () => {
    const complexContext = {
      routes: ['/api/users', '/api/posts'],
      count: 42,
      nested: { deep: { value: true } },
      nullValue: null,
    }
    const error = new AstralGenerationError('Complex context test', complexContext)

    expect(error.context).toEqual(complexContext)
  })

  test('should handle cause with undefined stack', () => {
    const causeError = new Error('No stack error')
    causeError.stack = undefined

    const error = new AstralGenerationError('Test', {}, causeError)

    expect(error.cause).toBe(causeError)
    expect(error.stack).toContain('Caused by: undefined')
  })
})

describe('Error inheritance chain', () => {
  test('all error classes should extend AstralError', () => {
    const config = new AstralConfigError('test', 'field')
    const schema = new AstralSchemaError('test', {})
    const resource = new AstralResourceError('test', { path: '/test', operations: {} })
    const route = new AstralRouteError('test', '/path')
    const generation = new AstralGenerationError('test')

    expect(config).toBeInstanceOf(AstralError)
    expect(schema).toBeInstanceOf(AstralError)
    expect(resource).toBeInstanceOf(AstralError)
    expect(route).toBeInstanceOf(AstralError)
    expect(generation).toBeInstanceOf(AstralError)
  })

  test('all error classes should extend Error', () => {
    const config = new AstralConfigError('test', 'field')
    const schema = new AstralSchemaError('test', {})
    const resource = new AstralResourceError('test', { path: '/test', operations: {} })
    const route = new AstralRouteError('test', '/path')
    const generation = new AstralGenerationError('test')

    expect(config).toBeInstanceOf(Error)
    expect(schema).toBeInstanceOf(Error)
    expect(resource).toBeInstanceOf(Error)
    expect(route).toBeInstanceOf(Error)
    expect(generation).toBeInstanceOf(Error)
  })

  test('errors should have correct name property', () => {
    expect(new AstralError('test', 'CODE').name).toBe('AstralError')
    expect(new AstralConfigError('test', 'field').name).toBe('AstralConfigError')
    expect(new AstralSchemaError('test', {}).name).toBe('AstralSchemaError')
    expect(new AstralResourceError('test', { path: '/t', operations: {} }).name).toBe(
      'AstralResourceError'
    )
    expect(new AstralRouteError('test', '/path').name).toBe('AstralRouteError')
    expect(new AstralGenerationError('test').name).toBe('AstralGenerationError')
  })
})
