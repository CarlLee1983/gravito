import { describe, expect, it } from 'bun:test'
import { GravitoException, SystemException } from '@gravito/core'
import { PrismError } from '../../src/errors/PrismError'
import { PrismErrorCodes } from '../../src/errors/codes'

describe('PrismError contract', () => {
  it('extends SystemException and GravitoException', () => {
    const err = new PrismError(500, PrismErrorCodes.RENDER_ERROR, {
      message: 'test error',
    })
    expect(err).toBeInstanceOf(PrismError)
    expect(err).toBeInstanceOf(SystemException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('has correct name, code, and status', () => {
    const err = new PrismError(404, PrismErrorCodes.VIEW_NOT_FOUND, {
      message: 'view not found',
    })
    expect(err.name).toBe('PrismError')
    expect(err.code).toBe('prism.view_not_found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('view not found')
  })

  it('supports all defined error codes with prism. prefix', () => {
    const codes = Object.values(PrismErrorCodes)
    for (const code of codes) {
      expect(code).toMatch(/^prism\./)
    }
  })

  it('is safe across ESM/CJS boundaries (Object.setPrototypeOf)', () => {
    const err = new PrismError(500, PrismErrorCodes.TEMPLATE_COMPILE_ERROR, {
      message: 'compile error',
    })
    expect(err instanceof PrismError).toBe(true)
    expect(err instanceof SystemException).toBe(true)
  })
})
