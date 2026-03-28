import { describe, it } from 'bun:test'
import { InfrastructureException, StreamException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import { StreamError, StreamErrorCodes } from '../../src/errors'

describe('StreamError contract', () => {
  it('satisfies GravitoException contract', () => {
    const cause = new Error('kafka disconnected')
    const err = new StreamError(503, StreamErrorCodes.KAFKA_CONNECTION_FAILED, {
      message: 'kafka disconnected',
      cause,
      retryable: true,
    })
    assertGravitoException(err, {
      expectedCode: 'stream.kafka.connection_failed',
      expectedStatus: 503,
      expectedInstanceOf: [StreamException, InfrastructureException],
      expectRetryable: true,
      expectCause: true,
    })
  })

  it('non-retryable errors have retryable=false', () => {
    const err = new StreamError(500, StreamErrorCodes.CONFIGURATION_ERROR, {
      message: 'bad config',
      retryable: false,
    })
    assertGravitoException(err, {
      expectedCode: 'stream.configuration_error',
      expectedStatus: 500,
      expectedInstanceOf: [StreamException, InfrastructureException],
      expectRetryable: false,
    })
  })

  it('has name set to StreamError (not generic Error)', () => {
    const err = new StreamError(500, StreamErrorCodes.DRIVER_NOT_FOUND, {
      message: 'driver not found',
    })
    assertGravitoException(err, {
      expectedCode: 'stream.driver_not_found',
      expectedStatus: 500,
    })
  })

  it('ESM/CJS boundary safety: instanceof works correctly', () => {
    const err = new StreamError(503, StreamErrorCodes.KAFKA_TIMEOUT, {
      message: 'kafka timeout',
      retryable: true,
    })
    assertGravitoException(err, {
      expectedCode: 'stream.kafka.timeout',
      expectedStatus: 503,
      expectedInstanceOf: [StreamException, InfrastructureException],
      expectRetryable: true,
    })
  })
})
