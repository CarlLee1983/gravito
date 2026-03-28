import { describe, expect, it } from 'bun:test'
import { GravitoException, SystemException } from '@gravito/core'
import { CosmosError } from '../../src/errors/CosmosError'
import { CosmosErrorCodes } from '../../src/errors/codes'

describe('CosmosError contract', () => {
  it('satisfies GravitoException contract', () => {
    const err = new CosmosError(500, CosmosErrorCodes.MISSING_TRANSLATION, {
      message: 'Missing translation: common.welcome',
    })

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(SystemException)
    expect(err).toBeInstanceOf(CosmosError)

    expect(err.code).toBe('cosmos.missing_translation')
    expect(err.status).toBe(500)
    expect(typeof err.code).toBe('string')
    expect(typeof err.status).toBe('number')
    expect(err.name).toBe('CosmosError')
    expect(err.name).not.toBe('Error')
  })

  it('extends SystemException (not DomainException or AuthException)', () => {
    const err = new CosmosError(500, CosmosErrorCodes.LOADER_FAILED)
    expect(err).toBeInstanceOf(SystemException)
  })

  it('preserves message', () => {
    const err = new CosmosError(500, CosmosErrorCodes.MISSING_TRANSLATION, {
      message: 'Missing translation: test.key',
    })
    expect(err.message).toBe('Missing translation: test.key')
  })

  it('preserves cause', () => {
    const cause = new Error('original error')
    const err = new CosmosError(500, CosmosErrorCodes.LOADER_FAILED, { cause })
    expect(err.cause).toBe(cause)
  })

  it('instanceof chain holds for all error codes', () => {
    const codes = Object.values(CosmosErrorCodes)
    for (const code of codes) {
      const err = new CosmosError(500, code)
      expect(err).toBeInstanceOf(CosmosError)
      expect(err).toBeInstanceOf(SystemException)
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(Error)
      expect(err.code).toBe(code)
    }
  })

  it('all error codes are cosmos.* namespaced', () => {
    const codes = Object.values(CosmosErrorCodes)
    for (const code of codes) {
      expect(code).toMatch(/^cosmos\./)
    }
  })

  it('CosmosErrorCodes covers expected domains', () => {
    expect(CosmosErrorCodes.MISSING_TRANSLATION).toBe('cosmos.missing_translation')
    expect(CosmosErrorCodes.LOADER_FAILED).toBe('cosmos.loader_failed')
    expect(CosmosErrorCodes.UNSUPPORTED_FORMAT).toBe('cosmos.unsupported_format')
    expect(CosmosErrorCodes.FILE_NOT_FOUND).toBe('cosmos.file_not_found')
    expect(CosmosErrorCodes.FILE_READ_FAILED).toBe('cosmos.file_read_failed')
    expect(CosmosErrorCodes.HTTP_ERROR).toBe('cosmos.http_error')
    expect(CosmosErrorCodes.EDGE_RUNTIME_UNSUPPORTED).toBe('cosmos.edge_runtime_unsupported')
    expect(CosmosErrorCodes.KV_PUT_UNSUPPORTED).toBe('cosmos.kv_put_unsupported')
    expect(CosmosErrorCodes.KV_DELETE_UNSUPPORTED).toBe('cosmos.kv_delete_unsupported')
  })
})
