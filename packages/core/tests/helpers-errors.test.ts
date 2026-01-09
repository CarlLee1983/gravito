import { describe, expect, it } from 'bun:test'
import { BunContext } from '../src/adapters/bun/BunContext'
import { createErrorBag, errors, jsonFail, jsonSuccess, old } from '../src/helpers'

describe('helpers: errors and responses', () => {
  it('creates an error bag with helpers', () => {
    const bag = createErrorBag({
      email: ['Invalid'],
      name: ['Required', 'Too short'],
    })

    expect(bag.has('email')).toBe(true)
    expect(bag.first('name')).toBe('Required')
    expect(bag.first()).toBe('Invalid')
    expect(bag.get('name')).toEqual(['Required', 'Too short'])
    expect(bag.any()).toBe(true)
    expect(bag.count()).toBe(3)
  })

  it('reads flashed errors and old input from session', () => {
    const ctx = {
      get: (key: string) => {
        if (key === 'session') {
          return {
            getFlash: (flashKey: string) => {
              if (flashKey === 'errors') {
                return { email: ['Invalid'] }
              }
              if (flashKey === '_old_input') {
                return { email: 'test@example.com' }
              }
              return {}
            },
          }
        }
        return undefined
      },
    }

    const bag = errors(ctx as any)
    expect(bag.first('email')).toBe('Invalid')
    expect(old(ctx as any, 'email')).toBe('test@example.com')
    expect(old(ctx as any, 'missing', 'fallback')).toBe('fallback')
  })

  it('builds json responses for success and failure', async () => {
    const ctx = BunContext.create(new Request('http://localhost'))

    const okRes = jsonSuccess(ctx, { ok: true }, 201)
    expect(okRes.status).toBe(201)
    expect(await okRes.json()).toEqual({ success: true, data: { ok: true } })

    const failRes = jsonFail(ctx, 'Bad', 400, 'BAD_REQUEST', { field: 'email' })
    expect(failRes.status).toBe(400)
    expect(await failRes.json()).toEqual({
      success: false,
      error: { message: 'Bad', code: 'BAD_REQUEST', details: { field: 'email' } },
    })
  })
})
