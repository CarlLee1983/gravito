import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException, StorageException } from '@gravito/core'
import { NebulaError } from '../../src/errors/NebulaError'
import { NebulaErrorCodes } from '../../src/errors/codes'

describe('NebulaError contract', () => {
  it('extends StorageException', () => {
    const error = new NebulaError(503, NebulaErrorCodes.WRITE_STREAM_FAILED, {
      message: 'write failed',
    })
    expect(error).toBeInstanceOf(StorageException)
  })

  it('extends InfrastructureException', () => {
    const error = new NebulaError(503, NebulaErrorCodes.WRITE_STREAM_FAILED, {
      message: 'write failed',
    })
    expect(error).toBeInstanceOf(InfrastructureException)
  })

  it('extends GravitoException', () => {
    const error = new NebulaError(503, NebulaErrorCodes.WRITE_STREAM_FAILED, {
      message: 'write failed',
    })
    expect(error).toBeInstanceOf(GravitoException)
  })

  it('extends Error', () => {
    const error = new NebulaError(503, NebulaErrorCodes.WRITE_STREAM_FAILED, {
      message: 'write failed',
    })
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct .name', () => {
    const error = new NebulaError(503, NebulaErrorCodes.FILE_NOT_FOUND, {
      message: 'file not found',
    })
    expect(error.name).toBe('NebulaError')
  })

  it('has correct .code', () => {
    const error = new NebulaError(404, NebulaErrorCodes.FILE_NOT_FOUND, {
      message: 'file not found',
    })
    expect(error.code).toBe('nebula.file_not_found')
  })

  it('has correct .status', () => {
    const error = new NebulaError(501, NebulaErrorCodes.OPERATION_NOT_SUPPORTED, {
      message: 'not supported',
    })
    expect(error.status).toBe(501)
  })

  it('has correct .retryable (default false)', () => {
    const error = new NebulaError(404, NebulaErrorCodes.FILE_NOT_FOUND, {
      message: 'file not found',
    })
    expect(error.retryable).toBe(false)
  })

  it('supports retryable: true for stream failures', () => {
    const error = new NebulaError(503, NebulaErrorCodes.WRITE_STREAM_FAILED, {
      message: 'stream failed',
      retryable: true,
    })
    expect(error.retryable).toBe(true)
  })

  it('error codes use nebula. namespace', () => {
    for (const code of Object.values(NebulaErrorCodes)) {
      expect(code).toMatch(/^nebula\./)
    }
  })
})
