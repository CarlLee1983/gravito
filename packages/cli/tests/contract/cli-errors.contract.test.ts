import { describe, expect, it } from 'bun:test'
import { GravitoException, SystemException } from '@gravito/core'
import { CliError } from '../../src/errors/CliError'
import { CliErrorCodes } from '../../src/errors/codes'

describe('CliError contract', () => {
  it('extends SystemException and GravitoException', () => {
    const err = new CliError(500, CliErrorCodes.EXECUTION_FAILED, {
      message: 'test error',
    })
    expect(err).toBeInstanceOf(CliError)
    expect(err).toBeInstanceOf(SystemException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('has correct name, code, and status', () => {
    const err = new CliError(404, CliErrorCodes.COMMAND_NOT_FOUND, {
      message: 'command not found',
    })
    expect(err.name).toBe('CliError')
    expect(err.code).toBe('cli.command_not_found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('command not found')
  })

  it('supports all defined error codes with cli. prefix', () => {
    const codes = Object.values(CliErrorCodes)
    for (const code of codes) {
      expect(code).toMatch(/^cli\./)
    }
  })

  it('is safe across ESM/CJS boundaries (Object.setPrototypeOf)', () => {
    const err = new CliError(422, CliErrorCodes.PARSE_ERROR, {
      message: 'parse error',
    })
    expect(err instanceof CliError).toBe(true)
    expect(err instanceof SystemException).toBe(true)
  })
})
