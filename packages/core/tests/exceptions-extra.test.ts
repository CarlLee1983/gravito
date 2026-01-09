import { describe, expect, it } from 'bun:test'
import { AuthenticationException } from '../src/exceptions/AuthenticationException'
import { AuthorizationException } from '../src/exceptions/AuthorizationException'
import { ModelNotFoundException } from '../src/exceptions/ModelNotFoundException'

describe('exception classes', () => {
  it('AuthenticationException sets defaults', () => {
    const err = new AuthenticationException()
    expect(err.status).toBe(401)
    expect(err.code).toBe('UNAUTHENTICATED')
    expect(err.message).toBe('Unauthenticated.')
    expect(err.i18nKey).toBe('errors.authentication.unauthenticated')
  })

  it('AuthorizationException sets defaults', () => {
    const err = new AuthorizationException()
    expect(err.status).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
    expect(err.message).toBe('This action is unauthorized.')
    expect(err.i18nKey).toBe('errors.authorization.forbidden')
  })

  it('ModelNotFoundException stores model and id', () => {
    const err = new ModelNotFoundException('User', 42)
    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('User not found.')
    expect(err.model).toBe('User')
    expect(err.id).toBe(42)
    expect(err.i18nParams?.model).toBe('User')
    expect(err.i18nParams?.id).toBe('42')
  })
})
