import { describe, expect, test } from 'bun:test'
import { GravitoException, InfrastructureException, QueueException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import { QuasarError, QuasarErrorCodes } from '../../src/errors/QuasarError'

describe('QuasarError contract', () => {
  test('QuasarError satisfies GravitoException contract', () => {
    const error = new QuasarError(
      QuasarErrorCodes.PIPELINE_FAILED,
      'Redis pipeline failed'
    )

    assertGravitoException(error, {
      expectedCode: QuasarErrorCodes.PIPELINE_FAILED,
      expectedStatus: 500,
      expectedInstanceOf: [QueueException, InfrastructureException, GravitoException],
    })
  })

  test('QuasarError is instanceof QueueException, InfrastructureException, GravitoException', () => {
    const error = new QuasarError(QuasarErrorCodes.CONNECTION_FAILED, 'Connection failed')

    expect(error).toBeInstanceOf(QuasarError)
    expect(error).toBeInstanceOf(QueueException)
    expect(error).toBeInstanceOf(InfrastructureException)
    expect(error).toBeInstanceOf(GravitoException)
    expect(error).toBeInstanceOf(Error)
  })

  test('QuasarError message includes code prefix for backward compat', () => {
    const error = new QuasarError(QuasarErrorCodes.PIPELINE_FAILED, 'Redis pipeline failed')

    expect(error.message).toContain(QuasarErrorCodes.PIPELINE_FAILED)
    expect(error.message).toContain('Redis pipeline failed')
  })

  test('QuasarError preserves cause', () => {
    const cause = new Error('underlying redis error')
    const error = new QuasarError(QuasarErrorCodes.CONNECTION_FAILED, 'Connection failed', cause)

    expect(error.cause).toBe(cause)
    assertGravitoException(error, {
      expectedCode: QuasarErrorCodes.CONNECTION_FAILED,
      expectedStatus: 500,
      expectCause: true,
    })
  })

  test('QuasarError name is set correctly', () => {
    const error = new QuasarError(QuasarErrorCodes.UNKNOWN, 'Unknown error')

    expect(error.name).toBe('QuasarError')
    expect(error.name).not.toBe('Error')
  })

  test('QuasarError retryable flag via options', () => {
    const retryableError = new QuasarError(
      QuasarErrorCodes.CONNECTION_FAILED,
      'Connection failed',
      undefined,
      { retryable: true }
    )

    assertGravitoException(retryableError, {
      expectedCode: QuasarErrorCodes.CONNECTION_FAILED,
      expectedStatus: 503,
      expectRetryable: true,
    })
  })

  test('QuasarErrorCodes follow dot-separated namespace convention', () => {
    for (const code of Object.values(QuasarErrorCodes)) {
      expect(code).toMatch(/^quasar\..+/)
    }
  })
})
