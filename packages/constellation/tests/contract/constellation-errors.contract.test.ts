import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException, StorageException } from '@gravito/core'
import { ConstellationError } from '../../src/errors/ConstellationError'
import { ConstellationErrorCodes } from '../../src/errors/codes'

describe('ConstellationError contract', () => {
  it('extends StorageException', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_READ_FAILED, {
      message: 'read failed',
    })
    expect(error).toBeInstanceOf(StorageException)
  })

  it('extends InfrastructureException', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_READ_FAILED, {
      message: 'read failed',
    })
    expect(error).toBeInstanceOf(InfrastructureException)
  })

  it('extends GravitoException', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_READ_FAILED, {
      message: 'read failed',
    })
    expect(error).toBeInstanceOf(GravitoException)
  })

  it('extends Error', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_READ_FAILED, {
      message: 'read failed',
    })
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct .name', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_READ_FAILED, {
      message: 'read failed',
    })
    expect(error.name).toBe('ConstellationError')
  })

  it('has correct .code', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_READ_FAILED, {
      message: 'read failed',
    })
    expect(error.code).toBe('constellation.storage_read_failed')
  })

  it('has correct .status', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_READ_FAILED, {
      message: 'read failed',
    })
    expect(error.status).toBe(503)
  })

  it('has correct .retryable (default false)', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_READ_FAILED, {
      message: 'read failed',
    })
    expect(error.retryable).toBe(false)
  })

  it('supports retryable: true', () => {
    const error = new ConstellationError(503, ConstellationErrorCodes.STORAGE_WRITE_FAILED, {
      message: 'write failed',
      retryable: true,
    })
    expect(error.retryable).toBe(true)
  })

  it('error codes use constellation. namespace', () => {
    for (const code of Object.values(ConstellationErrorCodes)) {
      expect(code).toMatch(/^constellation\./)
    }
  })

  it('has correct .message', () => {
    const error = new ConstellationError(400, ConstellationErrorCodes.INVALID_FILENAME, {
      message: 'Invalid sitemap filename.',
    })
    expect(error.message).toBe('Invalid sitemap filename.')
  })
})
