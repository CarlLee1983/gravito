/**
 * Contract tests for EchoError hierarchy
 *
 * Verifies that EchoError extends InfrastructureException from @gravito/core
 * and that error codes follow the echo. namespace convention.
 */

import { InfrastructureException } from '@gravito/core'
import { describe, expect, it } from 'bun:test'
import { EchoError } from '../../src/errors/EchoError'
import { EchoErrorCodes } from '../../src/errors/codes'

describe('EchoError contract', () => {
  it('extends InfrastructureException', () => {
    const error = new EchoError(EchoErrorCodes.UNKNOWN_PROVIDER, 'Unknown provider type: test')
    expect(error).toBeInstanceOf(InfrastructureException)
  })

  it('is instanceof EchoError', () => {
    const error = new EchoError(EchoErrorCodes.KEY_ROTATION_NOT_ENABLED, 'Key rotation disabled')
    expect(error).toBeInstanceOf(EchoError)
  })

  it('sets name to EchoError', () => {
    const error = new EchoError(EchoErrorCodes.NO_DELIVERY_ATTEMPTS, 'No delivery attempts')
    expect(error.name).toBe('EchoError')
  })

  it('stores the error code', () => {
    const error = new EchoError(EchoErrorCodes.UNKNOWN_PROVIDER, 'test message')
    expect(error.code).toBe('echo.unknown_provider')
  })

  it('all error codes use echo. namespace', () => {
    for (const code of Object.values(EchoErrorCodes)) {
      expect(code).toMatch(/^echo\./)
    }
  })

  it('sets retryable flag when provided', () => {
    const error = new EchoError(EchoErrorCodes.UNKNOWN_PROVIDER, 'test', { retryable: true })
    expect(error.retryable).toBe(true)
    expect(error.status).toBe(503)
  })

  it('defaults retryable to false', () => {
    const error = new EchoError(EchoErrorCodes.UNKNOWN_PROVIDER, 'test')
    expect(error.retryable).toBe(false)
    expect(error.status).toBe(500)
  })
})
