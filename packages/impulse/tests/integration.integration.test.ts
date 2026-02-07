import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Photon } from '@gravito/photon'
import { z } from 'zod'

// Mock Gravito Core exceptions (same as index.test.ts)
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

let FormRequest: typeof import('../src/FormRequest').FormRequest
let validateRequest: typeof import('../src/FormRequest').validateRequest

beforeAll(async () => {
  const module = await import('../src/FormRequest')
  FormRequest = module.FormRequest
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

describe('Integration Tests', () => {
  // 1. Transform Data
  it('should transform data before validation', async () => {
    class TransformRequest extends FormRequest {
      schema = z.object({
        tags: z.array(z.string()),
        slug: z.string(),
      })

      transform(data: unknown) {
        const d = data as { tags?: string; title?: string }
        return {
          tags: d.tags ? d.tags.split(',') : [],
          slug: d.title ? d.title.toLowerCase().replace(/\s+/g, '-') : '',
        }
      }
    }

    const app = createApp()
    app.post('/transform', validateRequest(TransformRequest), (c) => {
      return c.json({ data: c.get('validated') })
    })

    const res = await app.request('/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: 'a,b,c', title: 'Hello World' }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: any }
    expect(json.data.tags).toEqual(['a', 'b', 'c'])
    expect(json.data.slug).toBe('hello-world')
  })

  // 2. Async Authorization
  it('should handle async authorization', async () => {
    class AsyncAuthRequest extends FormRequest {
      schema = z.object({ id: z.string() })

      async authorize(ctx: any) {
        // Simulate DB call
        await new Promise((resolve) => setTimeout(resolve, 10))
        return ctx.req.header('X-User') === 'admin'
      }
    }

    const app = createApp()
    app.post('/async-auth', validateRequest(AsyncAuthRequest), (c) => {
      return c.json({ success: true })
    })

    // Unauthorized
    const res1 = await app.request('/async-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '1' }),
    })
    expect(res1.status).toBe(403)

    // Authorized
    const res2 = await app.request('/async-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User': 'admin' },
      body: JSON.stringify({ id: '1' }),
    })
    expect(res2.status).toBe(200)
  })

  // 3. Form Data Source
  it('should validate multipart form data', async () => {
    class UploadRequest extends FormRequest {
      source = 'form' as const
      schema = z.object({
        username: z.string(),
        role: z.string().default('user'),
      })
    }

    const app = createApp()
    app.post('/upload', validateRequest(UploadRequest), (c) => {
      return c.json({ data: c.get('validated') })
    })

    const formData = new FormData()
    formData.append('username', 'carl')
    // Missing role, should use default

    const res = await app.request('/upload', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: any }
    expect(json.data.username).toBe('carl')
    expect(json.data.role).toBe('user')
  })

  // 4. Route Param Source
  it('should validate route parameters', async () => {
    class ParamRequest extends FormRequest {
      source = 'param' as const
      schema = z.object({
        id: z.coerce.number().min(1),
      })
    }

    const app = createApp()
    app.get('/users/:id', validateRequest(ParamRequest), (c) => {
      const { id } = c.get('validated') as { id: number }
      return c.json({ id })
    })

    // Valid param
    const res1 = await app.request('/users/123')
    expect(res1.status).toBe(200)
    expect((await res1.json()).id).toBe(123)

    // Invalid param
    const res2 = await app.request('/users/abc')
    expect(res2.status).toBe(422) // Coercion fails or becomes NaN which might fail number check
  })

  // 5. Invalid Schema Handling (Edge Case)
  it('should throw error for unsupported schema', async () => {
    class BrokenRequest extends FormRequest {
      schema = { bad: 'schema' } as any
    }

    const app = createApp()
    app.post('/broken', validateRequest(BrokenRequest), (c) => c.json({ ok: true }))

    // This should trigger the "Unknown schema type" error in SchemaValidatorFactory
    // But since it's async middleware, it might result in 500
    const res = await app.request('/broken', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Unsupported schema type')
  })
})
