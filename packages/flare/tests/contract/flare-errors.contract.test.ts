/**
 * Contract tests for FlareError hierarchy
 *
 * Verifies that FlareError extends InfrastructureException from @gravito/core
 * and that error codes follow the flare. namespace convention.
 */

import { InfrastructureException } from '@gravito/core'
import { describe, expect, it } from 'bun:test'
import { FlareError } from '../../src/errors/FlareError'
import { FlareErrorCodes } from '../../src/errors/codes'

describe('FlareError contract', () => {
  it('extends InfrastructureException', () => {
    const error = new FlareError(FlareErrorCodes.SEND_FAILED, 'Failed to send notification')
    expect(error).toBeInstanceOf(InfrastructureException)
  })

  it('is instanceof FlareError', () => {
    const error = new FlareError(FlareErrorCodes.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded')
    expect(error).toBeInstanceOf(FlareError)
  })

  it('sets name to FlareError', () => {
    const error = new FlareError(FlareErrorCodes.TEMPLATE_NOT_DEFINED, 'Template not defined')
    expect(error.name).toBe('FlareError')
  })

  it('stores the error code', () => {
    const error = new FlareError(FlareErrorCodes.SEND_FAILED, 'test message')
    expect(error.code).toBe('flare.send_failed')
  })

  it('all error codes use flare. namespace', () => {
    for (const code of Object.values(FlareErrorCodes)) {
      expect(code).toMatch(/^flare\./)
    }
  })

  it('sets retryable flag when provided', () => {
    const error = new FlareError(FlareErrorCodes.SEND_FAILED, 'test', { retryable: true })
    expect(error.retryable).toBe(true)
    expect(error.status).toBe(503)
  })

  it('defaults retryable to false', () => {
    const error = new FlareError(FlareErrorCodes.SEND_FAILED, 'test')
    expect(error.retryable).toBe(false)
    expect(error.status).toBe(500)
  })
})
