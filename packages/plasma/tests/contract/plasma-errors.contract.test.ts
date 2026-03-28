import { describe, expect, it } from 'bun:test'
import { CacheException, InfrastructureException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import { RedisError } from '../../src/errors'
import { CacheErrorCodes } from '../../src/errors/codes'

describe('RedisError contract', () => {
  it('satisfies GravitoException contract', () => {
    const orig = new Error('orig')
    const err = new RedisError('cmd failed', CacheErrorCodes.COMMAND_FAILED, 'GET', orig)

    assertGravitoException(err, {
      expectedCode: 'redis.command_failed',
      expectedStatus: 503,
      expectedInstanceOf: [CacheException, InfrastructureException],
      expectRetryable: false,
      expectCause: true,
    })
  })

  it('preserves command field', () => {
    const err = new RedisError('cmd failed', CacheErrorCodes.COMMAND_FAILED, 'GET', new Error('orig'))
    expect(err.command).toBe('GET')
  })

  it('preserves originalError via .cause', () => {
    const orig = new Error('ECONNREFUSED')
    const err = new RedisError('cmd failed', CacheErrorCodes.COMMAND_FAILED, 'GET', orig)
    expect(err.cause).toBe(orig)
  })

  it('RedisError with CONNECTION_FAILED is retryable', () => {
    const err = RedisError.connectionFailed('host down', new Error('ECONNREFUSED'))

    assertGravitoException(err, {
      expectedCode: 'redis.connection_failed',
      expectedStatus: 503,
      expectRetryable: true,
    })
  })

  it('name is RedisError (not Error or CacheException)', () => {
    const err = new RedisError('test', CacheErrorCodes.COMMAND_FAILED)
    expect(err.name).toBe('RedisError')
  })

  it('instanceof chain holds across class boundaries', () => {
    const err = RedisError.connectionFailed('test')
    expect(err).toBeInstanceOf(RedisError)
    expect(err).toBeInstanceOf(CacheException)
    expect(err).toBeInstanceOf(InfrastructureException)
    expect(err).toBeInstanceOf(Error)
  })
})
