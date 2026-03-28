import { describe, expect, test } from 'bun:test'
import { GravitoException, InfrastructureException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import {
  RippleDriverError,
  RippleError,
  RippleErrorCodes,
} from '../../src/errors/RippleError'

describe('RippleError contract', () => {
  test('RippleError satisfies GravitoException contract', () => {
    const error = new RippleError(
      RippleErrorCodes.CONNECTION_FAILED,
      'Connection failed'
    )

    assertGravitoException(error, {
      expectedCode: RippleErrorCodes.CONNECTION_FAILED,
      expectedStatus: 500,
      expectedInstanceOf: [InfrastructureException, GravitoException],
    })
  })

  test('RippleError is instanceof InfrastructureException and GravitoException', () => {
    const error = new RippleError(RippleErrorCodes.QUERY_FAILED, 'Query failed')

    expect(error).toBeInstanceOf(RippleError)
    expect(error).toBeInstanceOf(InfrastructureException)
    expect(error).toBeInstanceOf(GravitoException)
    expect(error).toBeInstanceOf(Error)
  })

  test('RippleError preserves message', () => {
    const error = new RippleError(RippleErrorCodes.INVALID_OPERATION, 'Not supported')

    expect(error.message).toBe('Not supported')
    expect(error.code).toBe(RippleErrorCodes.INVALID_OPERATION)
  })

  test('RippleError name is set correctly', () => {
    const error = new RippleError(RippleErrorCodes.DRIVER_ERROR, 'Driver error')

    expect(error.name).toBe('RippleError')
    expect(error.name).not.toBe('Error')
  })

  test('RippleDriverError extends RippleError and InfrastructureException', () => {
    const error = new RippleDriverError(RippleErrorCodes.DRIVER_ERROR, 'Driver not found')

    expect(error).toBeInstanceOf(RippleDriverError)
    expect(error).toBeInstanceOf(RippleError)
    expect(error).toBeInstanceOf(InfrastructureException)
    expect(error).toBeInstanceOf(GravitoException)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('RippleDriverError')
  })

  test('RippleDriverError satisfies GravitoException contract', () => {
    const error = new RippleDriverError(RippleErrorCodes.DRIVER_ERROR, 'Driver error')

    assertGravitoException(error, {
      expectedCode: RippleErrorCodes.DRIVER_ERROR,
      expectedStatus: 500,
      expectedInstanceOf: [RippleError, InfrastructureException, GravitoException],
    })
  })

  test('RippleError retryable defaults to false', () => {
    const error = new RippleError(RippleErrorCodes.CONNECTION_FAILED, 'Connection failed')

    expect(error.retryable).toBe(false)
    assertGravitoException(error, {
      expectedCode: RippleErrorCodes.CONNECTION_FAILED,
      expectedStatus: 500,
      expectRetryable: false,
    })
  })

  test('RippleError retryable via options sets status 503', () => {
    const error = new RippleError(
      RippleErrorCodes.CONNECTION_FAILED,
      'Connection failed',
      { retryable: true }
    )

    expect(error.retryable).toBe(true)
    expect(error.status).toBe(503)
    assertGravitoException(error, {
      expectedCode: RippleErrorCodes.CONNECTION_FAILED,
      expectedStatus: 503,
      expectRetryable: true,
    })
  })

  test('RippleErrorCodes follow dot-separated namespace convention', () => {
    for (const code of Object.values(RippleErrorCodes)) {
      expect(code).toMatch(/^ripple\..+/)
    }
  })
})
