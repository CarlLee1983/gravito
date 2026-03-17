import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Photon } from '@gravito/photon'
import { FormRequest, Impulse, ZodFormRequest, z } from '../src/index'

// Mock Gravito Core exceptions
class GravitoException extends Error {
  public readonly status: number
  public readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

class AuthorizationException extends GravitoException {
  constructor(message = 'This action is unauthorized.') {
    super(403, 'FORBIDDEN', message)
  }
}

class ValidationException extends GravitoException {
  public readonly errors: Array<{ field: string; message: string; code?: string }>
  public redirectTo?: string
  public input?: unknown

  constructor(errors: Array<{ field: string; message: string; code?: string }>, message?: string) {
    super(422, 'VALIDATION_ERROR', message ?? 'Validation failed')
    this.errors = errors
  }

  withRedirect(url: string): this {
    this.redirectTo = url
    return this
  }

  withInput(input: unknown): this {
    this.input = input
    return this
  }
}

mock.module('@gravito/core', () => ({
  AuthorizationException,
  GravitoException,
  ValidationException,
}))

let validateRequest: typeof import('../src/FormRequest').validateRequest

beforeAll(async () => {
  const module = await import('../src/FormRequest')
  validateRequest = module.validateRequest
})

const createApp = () => {
  const app = new Photon()
  app.onError((err, c) => {
    if (err instanceof AuthorizationException) {
      return c.json({ error: err.message }, 403)
    }
    if (err instanceof ValidationException) {
      return c.json({ error: err.errors }, 422)
    }
    return c.json({ error: err.message }, 500)
  })
  return app
}

describe('v1.1 Features', () => {
  // 1. Partial Validation (PATCH support)
  it('should support partial validation for PATCH requests', async () => {
    class UserUpdateRequest extends ZodFormRequest {
      schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
      })
    }

    const app = createApp()
    app.patch('/users/:id', validateRequest(UserUpdateRequest), (c: any) => {
      return c.json({ data: c.get('validated') })
    })

    // Valid partial update (only name)
    const res1 = await app.request('/users/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(res1.status).toBe(200)
    const json1 = (await res1.json()) as any
    expect(json1.data.name).toBe('Updated')
    expect(json1.data.email).toBeUndefined()

    // Invalid partial update (name too short)
    const res2 = await app.request('/users/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A' }),
    })
    expect(res2.status).toBe(422)
  })

  it('should support manual partial validation via options', async () => {
    class ManualPartialRequest extends ZodFormRequest {
      schema = z.object({
        age: z.number().min(18),
        city: z.string(),
      })
    }

    const app = createApp()
    app.post('/partial', validateRequest(ManualPartialRequest, { partial: true }), (c: any) => {
      return c.json({ data: c.get('validated') })
    })

    const res = await app.request('/partial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: 25 }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.data.age).toBe(25)
    expect(json.data.city).toBeUndefined()
  })

  it('should support partial validation for classic FormRequest on PATCH', async () => {
    class ClassicPatchRequest extends FormRequest {
      schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
      })
    }

    const app = createApp()
    app.patch('/classic/:id', validateRequest(ClassicPatchRequest), (c: any) => {
      return c.json({ data: c.get('validated') })
    })

    const res = await app.request('/classic/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.data.name).toBe('Updated')
    expect(json.data.email).toBeUndefined()
  })

  // 2. Cache Clearing (HMR support)
  it('should clear all caches via Impulse.clearAllCaches()', () => {
    expect(typeof Impulse.clearAllCaches).toBe('function')
    Impulse.clearAllCaches()
  })
})
