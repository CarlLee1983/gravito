import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException } from '@gravito/core'
import { DarkMatterError } from '../../src/errors/DarkMatterError'
import { DarkMatterErrorCodes } from '../../src/errors/codes'

describe('DarkMatterError contract', () => {
  it('extends InfrastructureException', () => {
    const error = new DarkMatterError(503, DarkMatterErrorCodes.NOT_CONNECTED, {
      message: 'not connected',
    })
    expect(error).toBeInstanceOf(InfrastructureException)
  })

  it('extends GravitoException', () => {
    const error = new DarkMatterError(503, DarkMatterErrorCodes.NOT_CONNECTED, {
      message: 'not connected',
    })
    expect(error).toBeInstanceOf(GravitoException)
  })

  it('extends Error', () => {
    const error = new DarkMatterError(503, DarkMatterErrorCodes.NOT_CONNECTED, {
      message: 'not connected',
    })
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct .name', () => {
    const error = new DarkMatterError(503, DarkMatterErrorCodes.CONNECTION_FAILED, {
      message: 'connection failed',
    })
    expect(error.name).toBe('DarkMatterError')
  })

  it('has correct .code', () => {
    const error = new DarkMatterError(503, DarkMatterErrorCodes.CONNECTION_FAILED, {
      message: 'connection failed',
    })
    expect(error.code).toBe('dark_matter.connection_failed')
  })

  it('has correct .status', () => {
    const error = new DarkMatterError(503, DarkMatterErrorCodes.NOT_CONNECTED, {
      message: 'not connected',
    })
    expect(error.status).toBe(503)
  })

  it('supports retryable: true for connection failures', () => {
    const error = new DarkMatterError(503, DarkMatterErrorCodes.CONNECTION_FAILED, {
      message: 'connection failed',
      retryable: true,
    })
    expect(error.retryable).toBe(true)
  })

  it('error codes use dark_matter. namespace', () => {
    for (const code of Object.values(DarkMatterErrorCodes)) {
      expect(code).toMatch(/^dark_matter\./)
    }
  })
})
