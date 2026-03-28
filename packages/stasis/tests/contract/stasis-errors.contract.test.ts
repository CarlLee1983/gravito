import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException, StorageException } from '@gravito/core'
import { StasisError } from '../../src/errors/StasisError'
import { StasisErrorCodes } from '../../src/errors/codes'

describe('StasisError contract', () => {
  it('extends StorageException', () => {
    const error = new StasisError(404, StasisErrorCodes.STORE_NOT_FOUND, {
      message: 'store not found',
    })
    expect(error).toBeInstanceOf(StorageException)
  })

  it('extends InfrastructureException', () => {
    const error = new StasisError(404, StasisErrorCodes.STORE_NOT_FOUND, {
      message: 'store not found',
    })
    expect(error).toBeInstanceOf(InfrastructureException)
  })

  it('extends GravitoException', () => {
    const error = new StasisError(404, StasisErrorCodes.STORE_NOT_FOUND, {
      message: 'store not found',
    })
    expect(error).toBeInstanceOf(GravitoException)
  })

  it('extends Error', () => {
    const error = new StasisError(404, StasisErrorCodes.STORE_NOT_FOUND, {
      message: 'store not found',
    })
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct .name', () => {
    const error = new StasisError(400, StasisErrorCodes.EMPTY_CACHE_KEY, {
      message: 'Cache key cannot be empty.',
    })
    expect(error.name).toBe('StasisError')
  })

  it('has correct .code', () => {
    const error = new StasisError(400, StasisErrorCodes.EMPTY_CACHE_KEY, {
      message: 'Cache key cannot be empty.',
    })
    expect(error.code).toBe('stasis.empty_cache_key')
  })

  it('has correct .status', () => {
    const error = new StasisError(501, StasisErrorCodes.TAGS_NOT_SUPPORTED, {
      message: 'tags not supported',
    })
    expect(error.status).toBe(501)
  })

  it('has correct .retryable (default false)', () => {
    const error = new StasisError(400, StasisErrorCodes.EMPTY_CACHE_KEY, {
      message: 'Cache key cannot be empty.',
    })
    expect(error.retryable).toBe(false)
  })

  it('error codes use stasis. namespace', () => {
    for (const code of Object.values(StasisErrorCodes)) {
      expect(code).toMatch(/^stasis\./)
    }
  })
})
