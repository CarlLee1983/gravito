import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Photon } from '@gravito/photon'
import { z } from 'zod'

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

let DefaultMessageProvider: typeof import('../src/FormRequest').DefaultMessageProvider
let FormRequest: typeof import('../src/FormRequest').FormRequest
let validateRequest: typeof import('../src/FormRequest').validateRequest
type MessageProvider = import('../src/FormRequest').MessageProvider

beforeAll(async () => {
  const module = await import('../src/FormRequest')
  DefaultMessageProvider = module.DefaultMessageProvider
  FormRequest = module.FormRequest
  validateRequest = module.validateRequest

  StoreUserRequest = class extends FormRequest {
    schema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email format'),
      age: z.number().min(18).optional(),
    })
  }

  QuerySearchRequest = class extends FormRequest {
    source = 'query' as const
    schema = z.object({
      q: z.string().min(1),
      page: z.coerce.number().default(1),
    })
  }

  AuthorizedRequest = class extends FormRequest {
    schema = z.object({
      data: z.string(),
    })

    authorize(ctx: any) {
      return ctx.req.header('X-Admin') === 'true'
    }
  }

  CustomAuthMessageRequest = class extends FormRequest {
    schema = z.object({
      data: z.string(),
    })

    authorize(ctx: any) {
      return ctx.req.header('X-Token') === 'secret'
    }

    authorizationMessage() {
      return 'Access denied. Please provide a valid token.'
    }
  }

  CustomMessagesRequest = class extends FormRequest {
    schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    messages() {
      return {
        'email.invalid_string': '請輸入有效的 Email 地址',
        'name.too_small': '名稱至少需要 2 個字元',
      }
    }
  }
})

const createApp = () => {
  const app = new Photon()
  app.onError((err, c) => {
    if (err instanceof AuthorizationException) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        403
      )
    }

    if (err instanceof ValidationException) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.errors,
          },
        },
        422
      )
    }

    if (err instanceof GravitoException) {
      return c.json({ error: err.message }, err.status)
    }

    console.error(err)
    return c.json({ error: err.message }, 500)
  })
  return app
}

// =============================================================================
// Test Request Classes
// =============================================================================

let StoreUserRequest: new () => InstanceType<typeof FormRequest>
let QuerySearchRequest: new () => InstanceType<typeof FormRequest>
let AuthorizedRequest: new () => InstanceType<typeof FormRequest>
let CustomAuthMessageRequest: new () => InstanceType<typeof FormRequest>
let CustomMessagesRequest: new () => InstanceType<typeof FormRequest>

// i18n Message Provider for testing
class ChineseMessageProvider implements MessageProvider {
  getMessage(code: string, field: string, defaultMessage: string): string {
    const messages: Record<string, string> = {
      'email.invalid_string': '電子郵件格式不正確',
      'name.too_small': '名稱太短',
    }
    const key = `${field}.${code}`
    return messages[key] ?? defaultMessage
  }

  getValidationFailedMessage(): string {
    return '驗證失敗'
  }

  getUnauthorizedMessage(): string {
    return '未授權'
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('FormRequest', () => {
  // Phase 1: Basic validation
  it('should validate JSON body successfully', async () => {
    const app = createApp()
    app.post('/users', validateRequest(StoreUserRequest), (c) => {
      const data = c.get('validated')
      return c.json({ success: true, data })
    })

    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Carl', email: 'carl@example.com' }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { name: string } }
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('Carl')
  })

  it('should return validation errors for invalid data', async () => {
    const app = createApp()
    app.post('/users', validateRequest(StoreUserRequest), (c) => {
      return c.json({ success: true })
    })

    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'invalid' }),
    })

    expect(res.status).toBe(422)
    const json = (await res.json()) as { success: boolean; error: { code: string } }
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('should validate query parameters', async () => {
    const app = createApp()
    app.get('/search', validateRequest(QuerySearchRequest), (c) => {
      const data = c.get('validated') as { q: string; page: number }
      return c.json({ query: data.q, page: data.page })
    })

    const res = await app.request('/search?q=hello&page=2')

    expect(res.status).toBe(200)
    const json = (await res.json()) as { query: string; page: number }
    expect(json.query).toBe('hello')
    expect(json.page).toBe(2)
  })

  // Phase 3: Authorization
  it('should reject unauthorized requests', async () => {
    const app = createApp()
    app.post('/admin', validateRequest(AuthorizedRequest), (c) => {
      return c.json({ success: true })
    })

    // Without X-Admin header
    const res1 = await app.request('/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    })

    expect(res1.status).toBe(403)
    const json1 = (await res1.json()) as { error: { code: string } }
    expect(json1.error.code).toBe('FORBIDDEN')

    // With X-Admin header
    const res2 = await app.request('/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin': 'true' },
      body: JSON.stringify({ data: 'test' }),
    })

    expect(res2.status).toBe(200)
  })

  it('should use custom authorization message', async () => {
    const app = createApp()
    app.post('/protected', validateRequest(CustomAuthMessageRequest), (c) => {
      return c.json({ success: true })
    })

    const res = await app.request('/protected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    })

    expect(res.status).toBe(403)
    const json = (await res.json()) as { error: { message: string } }
    expect(json.error.message).toBe('Access denied. Please provide a valid token.')
  })

  // Phase 5: Custom messages
  it('should use custom messages from messages() method', async () => {
    const app = createApp()
    app.post('/custom', validateRequest(CustomMessagesRequest), (c) => {
      return c.json({ success: true })
    })

    const res = await app.request('/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', name: 'A' }),
    })

    expect(res.status).toBe(422)
    const json = (await res.json()) as {
      error: { details: Array<{ field: string; message: string }> }
    }

    const emailError = json.error.details.find((d) => d.field === 'email')
    expect(emailError?.message).toBe('請輸入有效的 Email 地址')
  })

  // Phase 5: i18n MessageProvider
  it('should use i18n MessageProvider', async () => {
    class I18nRequest extends FormRequest {
      schema = z.object({
        email: z.string().email(),
      })
      options = {
        messageProvider: new ChineseMessageProvider(),
      }
    }

    const app = createApp()
    app.post('/i18n', validateRequest(I18nRequest), (c) => {
      return c.json({ success: true })
    })

    const res = await app.request('/i18n', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid' }),
    })

    expect(res.status).toBe(422)
    const json = (await res.json()) as {
      error: { message: string; details: Array<{ message: string }> }
    }

    // Check that the "Validation failed" message is localized
    expect(json.error.message).toBe('驗證失敗')
    expect(json.error.details[0].message).toBe('電子郵件格式不正確')
  })

  it('should use i18n MessageProvider for unauthorized message', async () => {
    class I18nAuthRequest extends FormRequest {
      schema = z.object({ data: z.string() })
      options = {
        messageProvider: new ChineseMessageProvider(),
      }

      authorize() {
        return false
      }
    }

    const app = createApp()
    app.post('/i18n-auth', validateRequest(I18nAuthRequest), (c) => {
      return c.json({ success: true })
    })

    const res = await app.request('/i18n-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    })

    expect(res.status).toBe(403)
    const json = (await res.json()) as { error: { message: string } }
    expect(json.error.message).toBe('未授權')
  })

  it('should include field path in error details', async () => {
    class NestedRequest extends FormRequest {
      schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(2),
          }),
        }),
      })
    }

    const app = createApp()
    app.post('/nested', validateRequest(NestedRequest), (c) => {
      return c.json({ success: true })
    })

    const res = await app.request('/nested', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { profile: { name: 'A' } } }),
    })

    expect(res.status).toBe(422)
    const json = (await res.json()) as { error: { details: Array<{ field: string }> } }
    expect(json.error.details[0].field).toBe('user.profile.name')
  })

  it('DefaultMessageProvider should return default messages', () => {
    const provider = new DefaultMessageProvider()

    expect(provider.getMessage('code', 'field', 'default')).toBe('default')
    expect(provider.getValidationFailedMessage()).toBe('Validation failed')
    expect(provider.getUnauthorizedMessage()).toBe('Unauthorized')
  })
})

// =============================================================================
// Phase 4: Valibot Support Tests (using mock schema)
// =============================================================================

describe('FormRequest with Valibot-like schema', () => {
  it('should validate with Valibot-like schema using _run', async () => {
    // Mock Valibot-like schema
    const mockValibotSchema = {
      _run(dataset: { value: unknown }) {
        const data = dataset.value as { name?: string }
        if (!data.name || data.name.length < 2) {
          return {
            issues: [
              {
                path: [{ key: 'name' }],
                message: 'Name too short',
                type: 'min_length',
              },
            ],
          }
        }
        return { issues: [] }
      },
    }

    class ValibotRequest extends FormRequest {
      schema = mockValibotSchema as any
    }

    const app = createApp()
    app.post('/valibot', validateRequest(ValibotRequest), (c) => {
      return c.json({ success: true, data: c.get('validated') })
    })

    // Invalid
    const res1 = await app.request('/valibot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A' }),
    })

    expect(res1.status).toBe(422)
    const json1 = (await res1.json()) as {
      error: { details: Array<{ field: string; code: string }> }
    }
    expect(json1.error.details[0].field).toBe('name')
    expect(json1.error.details[0].code).toBe('min_length')

    // Valid
    const res2 = await app.request('/valibot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Carl' }),
    })

    expect(res2.status).toBe(200)
  })

  it('should validate with Valibot-like schema using parse (throws)', async () => {
    // Mock Valibot-like schema that throws
    const mockValibotSchema = {
      parse(data: unknown) {
        const d = data as { email?: string }
        if (!d.email?.includes('@')) {
          throw {
            issues: [
              {
                path: [{ key: 'email' }],
                message: 'Invalid email',
                type: 'email',
              },
            ],
          }
        }
        return data
      },
    }

    class ValibotParseRequest extends FormRequest {
      schema = mockValibotSchema as any
    }

    const app = createApp()
    app.post('/valibot-parse', validateRequest(ValibotParseRequest), (c) => {
      return c.json({ success: true })
    })

    // Invalid
    const res = await app.request('/valibot-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid' }),
    })

    expect(res.status).toBe(422)
    const json = (await res.json()) as { error: { details: Array<{ field: string }> } }
    expect(json.error.details[0].field).toBe('email')
  })
})
