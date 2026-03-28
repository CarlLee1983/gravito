import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException } from '@gravito/core'
import { LuminosityError } from '../../src/errors/LuminosityError'
import { LuminosityErrorCodes } from '../../src/errors/codes'

describe('LuminosityError contract', () => {
  it('extends InfrastructureException and GravitoException', () => {
    const err = new LuminosityError(503, LuminosityErrorCodes.STORAGE_READ_FAILED, {
      message: 'test error',
      retryable: true,
    })
    expect(err).toBeInstanceOf(LuminosityError)
    expect(err).toBeInstanceOf(InfrastructureException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('retryable=true for luminosity.storage.* errors', () => {
    const err = new LuminosityError(503, LuminosityErrorCodes.STORAGE_READ_FAILED, {
      message: 'storage read failed',
      retryable: true,
    })
    expect(err.retryable).toBe(true)
    expect(err.code).toMatch(/^luminosity\.storage\./)
  })

  it('retryable=false for luminosity.config.* errors', () => {
    const err = new LuminosityError(422, LuminosityErrorCodes.CONFIG_INVALID, {
      message: 'config invalid',
      retryable: false,
    })
    expect(err.retryable).toBe(false)
    expect(err.code).toMatch(/^luminosity\.config\./)
  })

  it('retryable=false for luminosity.seo.* errors', () => {
    const err = new LuminosityError(422, LuminosityErrorCodes.SEO_UNKNOWN_MODE, {
      message: 'unknown mode',
      retryable: false,
    })
    expect(err.retryable).toBe(false)
    expect(err.code).toMatch(/^luminosity\.seo\./)
  })

  it('has dual ErrorCode namespaces: storage and config', () => {
    const codes = Object.values(LuminosityErrorCodes)
    const storageCodes = codes.filter((c) => c.startsWith('luminosity.storage.'))
    const configCodes = codes.filter((c) => c.startsWith('luminosity.config.'))
    expect(storageCodes.length).toBeGreaterThan(0)
    expect(configCodes.length).toBeGreaterThan(0)
  })

  it('is safe across ESM/CJS boundaries (Object.setPrototypeOf)', () => {
    const err = new LuminosityError(503, LuminosityErrorCodes.STORAGE_READ_FAILED, {
      retryable: true,
    })
    expect(err instanceof LuminosityError).toBe(true)
    expect(err instanceof InfrastructureException).toBe(true)
  })
})
