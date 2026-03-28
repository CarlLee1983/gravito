import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException, StorageException } from '@gravito/core'
import { NebulaS3Error } from '../../src/errors/NebulaS3Error'
import { NebulaS3ErrorCodes } from '../../src/errors/codes'

describe('NebulaS3Error contract', () => {
  it('extends StorageException', () => {
    const error = new NebulaS3Error(503, NebulaS3ErrorCodes.WRITE_STREAM_FAILED, {
      message: 'write failed',
    })
    expect(error).toBeInstanceOf(StorageException)
  })

  it('extends InfrastructureException', () => {
    const error = new NebulaS3Error(503, NebulaS3ErrorCodes.WRITE_STREAM_FAILED, {
      message: 'write failed',
    })
    expect(error).toBeInstanceOf(InfrastructureException)
  })

  it('extends GravitoException', () => {
    const error = new NebulaS3Error(503, NebulaS3ErrorCodes.WRITE_STREAM_FAILED, {
      message: 'write failed',
    })
    expect(error).toBeInstanceOf(GravitoException)
  })

  it('extends Error', () => {
    const error = new NebulaS3Error(503, NebulaS3ErrorCodes.WRITE_STREAM_FAILED, {
      message: 'write failed',
    })
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct .name', () => {
    const error = new NebulaS3Error(404, NebulaS3ErrorCodes.FILE_NOT_FOUND, {
      message: 'not found',
    })
    expect(error.name).toBe('NebulaS3Error')
  })

  it('has correct .code', () => {
    const error = new NebulaS3Error(404, NebulaS3ErrorCodes.FILE_NOT_FOUND, {
      message: 'not found',
    })
    expect(error.code).toBe('nebula_s3.file_not_found')
  })

  it('has correct .status', () => {
    const error = new NebulaS3Error(404, NebulaS3ErrorCodes.FILE_NOT_FOUND, {
      message: 'not found',
    })
    expect(error.status).toBe(404)
  })

  it('supports retryable: true', () => {
    const error = new NebulaS3Error(503, NebulaS3ErrorCodes.WRITE_STREAM_FAILED, {
      message: 'stream failed',
      retryable: true,
    })
    expect(error.retryable).toBe(true)
  })

  it('error codes use nebula_s3. namespace', () => {
    for (const code of Object.values(NebulaS3ErrorCodes)) {
      expect(code).toMatch(/^nebula_s3\./)
    }
  })
})
