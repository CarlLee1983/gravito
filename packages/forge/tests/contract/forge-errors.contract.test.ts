import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException } from '@gravito/core'
import { ForgeError } from '../../src/errors/ForgeError'
import { ForgeErrorCodes } from '../../src/errors/codes'

describe('ForgeError contract', () => {
  it('extends InfrastructureException', () => {
    const error = new ForgeError(415, ForgeErrorCodes.UNSUPPORTED_MIME_TYPE, {
      message: 'unsupported type',
    })
    expect(error).toBeInstanceOf(InfrastructureException)
  })

  it('extends GravitoException', () => {
    const error = new ForgeError(415, ForgeErrorCodes.UNSUPPORTED_MIME_TYPE, {
      message: 'unsupported type',
    })
    expect(error).toBeInstanceOf(GravitoException)
  })

  it('extends Error', () => {
    const error = new ForgeError(415, ForgeErrorCodes.UNSUPPORTED_MIME_TYPE, {
      message: 'unsupported type',
    })
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct .name', () => {
    const error = new ForgeError(400, ForgeErrorCodes.MISSING_OUTPUT_PATH, {
      message: 'output required',
    })
    expect(error.name).toBe('ForgeError')
  })

  it('has correct .code', () => {
    const error = new ForgeError(415, ForgeErrorCodes.UNSUPPORTED_MIME_TYPE, {
      message: 'unsupported type',
    })
    expect(error.code).toBe('forge.unsupported_mime_type')
  })

  it('has correct .status', () => {
    const error = new ForgeError(507, ForgeErrorCodes.DISK_SPACE_INSUFFICIENT, {
      message: 'disk full',
    })
    expect(error.status).toBe(507)
  })

  it('error codes use forge. namespace', () => {
    for (const code of Object.values(ForgeErrorCodes)) {
      expect(code).toMatch(/^forge\./)
    }
  })
})
