import { describe, expect, test } from 'bun:test'
import { GravitoException, SystemException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import {
  AstralConfigError,
  AstralError,
  AstralGenerationError,
  AstralResourceError,
  AstralRouteError,
  AstralSchemaError,
} from '../../src/errors'

describe('AstralError contract', () => {
  test('AstralError satisfies GravitoException contract', () => {
    const error = new AstralError('Test error', 'astral.test_error')

    assertGravitoException(error, {
      expectedCode: 'astral.test_error',
      expectedStatus: 500,
      expectedInstanceOf: [SystemException, GravitoException],
    })
  })

  test('AstralError is instanceof SystemException and GravitoException', () => {
    const error = new AstralError('Test error', 'astral.test')

    expect(error).toBeInstanceOf(AstralError)
    expect(error).toBeInstanceOf(SystemException)
    expect(error).toBeInstanceOf(GravitoException)
    expect(error).toBeInstanceOf(Error)
  })

  test('AstralConfigError satisfies GravitoException contract', () => {
    const error = new AstralConfigError('Invalid value', 'uiPath')

    assertGravitoException(error, {
      expectedCode: 'ASTRAL_CONFIG_ERROR',
      expectedStatus: 500,
      expectedInstanceOf: [AstralError, SystemException, GravitoException],
    })
  })

  test('AstralSchemaError satisfies GravitoException contract', () => {
    const schema = { _def: { typeName: 'ZodString' } }
    const error = new AstralSchemaError('Failed to convert', schema)

    assertGravitoException(error, {
      expectedCode: 'ASTRAL_SCHEMA_ERROR',
      expectedStatus: 500,
      expectedInstanceOf: [AstralError, SystemException, GravitoException],
    })
  })

  test('AstralSchemaError preserves cause', () => {
    const cause = new Error('original')
    const schema = {}
    const error = new AstralSchemaError('Failed', schema, cause)

    expect(error.cause).toBe(cause)
    assertGravitoException(error, {
      expectedCode: 'ASTRAL_SCHEMA_ERROR',
      expectedStatus: 500,
      expectCause: true,
    })
  })

  test('AstralResourceError satisfies GravitoException contract', () => {
    const resource = { path: '/api/users', operations: {} }
    const error = new AstralResourceError('Invalid', resource)

    assertGravitoException(error, {
      expectedCode: 'ASTRAL_RESOURCE_ERROR',
      expectedStatus: 500,
      expectedInstanceOf: [AstralError, SystemException, GravitoException],
    })
  })

  test('AstralRouteError satisfies GravitoException contract', () => {
    const error = new AstralRouteError('Not found', '/api/users')

    assertGravitoException(error, {
      expectedCode: 'ASTRAL_ROUTE_ERROR',
      expectedStatus: 500,
      expectedInstanceOf: [AstralError, SystemException, GravitoException],
    })
  })

  test('AstralGenerationError satisfies GravitoException contract', () => {
    const error = new AstralGenerationError('Generation failed')

    assertGravitoException(error, {
      expectedCode: 'ASTRAL_GENERATION_ERROR',
      expectedStatus: 500,
      expectedInstanceOf: [AstralError, SystemException, GravitoException],
    })
  })

  test('AstralGenerationError preserves cause', () => {
    const cause = new Error('nested')
    cause.stack = 'Error: nested\n    at test.ts:1:1'
    const error = new AstralGenerationError('Failed', undefined, cause)

    expect(error.cause).toBe(cause)
    assertGravitoException(error, {
      expectedCode: 'ASTRAL_GENERATION_ERROR',
      expectedStatus: 500,
      expectCause: true,
    })
  })

  test('all error classes have correct name', () => {
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
