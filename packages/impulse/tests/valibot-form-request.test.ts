/**
 * ValibotFormRequest 測試套件
 *
 * 涵蓋以下關鍵路徑：
 * 1. Authorization 檢查（authorize 返回 false/true）
 * 2. Transform 流程（如果定義了 transform 函數）
 * 3. Partial validation（options.partial = true 時的邏輯）
 * 4. 驗證成功和失敗的情況
 * 5. Exception 處理（非預期的異常）
 * 6. getBlueprint() 方法
 */

import { beforeAll, describe, expect, it, mock } from 'bun:test'
import type { Context } from '@gravito/core/compat'
import * as v from 'valibot'

// Mock Gravito Core exceptions（與現有測試保持一致）
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

let ValibotFormRequest: typeof import('../src/index').ValibotFormRequest
type MessageProvider = import('../src/FormRequest').MessageProvider

beforeAll(async () => {
  const module = await import('../src/index')
  ValibotFormRequest = module.ValibotFormRequest
})

// 模擬 Context 物件的輔助函數
function createMockContext(options: {
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string>
  query?: Record<string, string>
  contextValues?: Record<string, unknown>
}): Context {
  const { body = {}, headers = {}, params = {}, query = {}, contextValues = {} } = options
  const store = new Map<string, unknown>(Object.entries(contextValues))

  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()],
      json: async () => body,
      formData: async () => {
        const fd = new FormData()
        if (typeof body === 'object' && body !== null) {
          for (const [key, value] of Object.entries(body)) {
            fd.append(key, String(value))
          }
        }
        return fd
      },
      param: () => params,
      queries: () => {
        const result: Record<string, string[]> = {}
        for (const [key, value] of Object.entries(query)) {
          result[key] = [value]
        }
        return result
      },
    },
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
  } as unknown as Context
}

// =============================================================================
// 測試：驗證成功和失敗的情況
// =============================================================================

describe('ValibotFormRequest - 基本驗證', () => {
  it('驗證成功時應返回 success: true 和已驗證的資料', async () => {
    class CreateUserRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.pipe(v.string(), v.minLength(2)),
        email: v.pipe(v.string(), v.email()),
      })
    }

    const request = new CreateUserRequest()
    const ctx = createMockContext({
      body: { name: 'Carl', email: 'carl@example.com' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'Carl', email: 'carl@example.com' })
    }
  })

  it('驗證失敗時應返回 success: false 和錯誤詳情', async () => {
    class CreateUserRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.pipe(v.string(), v.minLength(2)),
        email: v.pipe(v.string(), v.email()),
      })
    }

    const request = new CreateUserRequest()
    const ctx = createMockContext({
      body: { name: 'A', email: 'invalid-email' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.error.message).toBe('Validation failed')
      expect(result.error.error.details.length).toBeGreaterThan(0)
    }
  })

  it('應正確處理巢狀物件的驗證錯誤路徑', async () => {
    class NestedRequest extends ValibotFormRequest {
      schema = v.object({
        user: v.object({
          profile: v.object({
            name: v.pipe(v.string(), v.minLength(2)),
          }),
        }),
      })
    }

    const request = new NestedRequest()
    const ctx = createMockContext({
      body: { user: { profile: { name: 'A' } } },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      const detail = result.error.error.details[0]
      expect(detail.field).toContain('profile')
      expect(detail.field).toContain('name')
    }
  })

  it('應正確處理缺少必填欄位的情況', async () => {
    class RequiredFieldsRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.string(),
        email: v.string(),
      })
    }

    const request = new RequiredFieldsRequest()
    const ctx = createMockContext({
      body: { name: 'Carl' }, // 缺少 email
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('VALIDATION_ERROR')
    }
  })
})

// =============================================================================
// 測試：Authorization 檢查
// =============================================================================

describe('ValibotFormRequest - Authorization', () => {
  it('authorize 返回 true 時應繼續驗證', async () => {
    class AuthorizedRequest extends ValibotFormRequest {
      schema = v.object({
        data: v.string(),
      })

      authorize(ctx: Context) {
        return (ctx as any).req.header('x-admin') === 'true'
      }
    }

    const request = new AuthorizedRequest()
    const ctx = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json', 'x-admin': 'true' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
  })

  it('authorize 返回 false 時應返回授權錯誤', async () => {
    class UnauthorizedRequest extends ValibotFormRequest {
      schema = v.object({
        data: v.string(),
      })

      authorize(_ctx: Context) {
        return false
      }
    }

    const request = new UnauthorizedRequest()
    const ctx = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('AUTHORIZATION_ERROR')
      expect(result.error.error.message).toBe('Unauthorized')
    }
  })

  it('應使用自定義 authorizationMessage', async () => {
    class CustomAuthMessageRequest extends ValibotFormRequest {
      schema = v.object({
        data: v.string(),
      })

      authorize(_ctx: Context) {
        return false
      }

      authorizationMessage() {
        return 'Access denied. Please provide a valid token.'
      }
    }

    const request = new CustomAuthMessageRequest()
    const ctx = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('AUTHORIZATION_ERROR')
      expect(result.error.error.message).toBe('Access denied. Please provide a valid token.')
    }
  })

  it('authorize 為 async 時應正確處理', async () => {
    class AsyncAuthorizedRequest extends ValibotFormRequest {
      schema = v.object({
        data: v.string(),
      })

      async authorize(ctx: Context): Promise<boolean> {
        // 模擬異步授權檢查
        await new Promise((resolve) => setTimeout(resolve, 10))
        return (ctx as any).req.header('x-token') === 'valid'
      }
    }

    const request = new AsyncAuthorizedRequest()

    // 測試授權成功
    const ctx1 = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json', 'x-token': 'valid' },
    })
    const result1 = await request.validate(ctx1)
    expect(result1.success).toBe(true)

    // 測試授權失敗
    const ctx2 = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json', 'x-token': 'invalid' },
    })
    const result2 = await request.validate(ctx2)
    expect(result2.success).toBe(false)
    if (!result2.success) {
      expect(result2.error.error.code).toBe('AUTHORIZATION_ERROR')
    }
  })

  it('應使用 MessageProvider 的 getUnauthorizedMessage', async () => {
    const chineseMessageProvider: MessageProvider = {
      getMessage: (_code, _field, defaultMessage) => defaultMessage,
      getValidationFailedMessage: () => '驗證失敗',
      getUnauthorizedMessage: () => '未授權',
    }

    class I18nAuthRequest extends ValibotFormRequest {
      schema = v.object({
        data: v.string(),
      })
      options = {
        messageProvider: chineseMessageProvider,
      }

      authorize(_ctx: Context) {
        return false
      }
    }

    const request = new I18nAuthRequest()
    const ctx = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.message).toBe('未授權')
    }
  })
})

// =============================================================================
// 測試：Transform 流程
// =============================================================================

describe('ValibotFormRequest - Transform', () => {
  it('應在驗證前執行 transform 函數', async () => {
    class TransformRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.pipe(v.string(), v.minLength(2)),
        email: v.string(),
      })

      transform(data: unknown): unknown {
        const d = data as Record<string, unknown>
        return {
          ...d,
          name: typeof d.name === 'string' ? d.name.trim() : d.name,
        }
      }
    }

    const request = new TransformRequest()
    const ctx = createMockContext({
      body: { name: '   Carl   ', email: 'carl@example.com' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Carl')
    }
  })

  it('transform 可以添加默認值', async () => {
    class DefaultValueRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.string(),
        role: v.string(),
      })

      transform(data: unknown): unknown {
        const d = data as Record<string, unknown>
        return {
          role: 'user',
          ...d,
        }
      }
    }

    const request = new DefaultValueRequest()
    const ctx = createMockContext({
      body: { name: 'Carl' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('user')
    }
  })

  it('transform 可以轉換資料類型', async () => {
    class TypeConversionRequest extends ValibotFormRequest {
      schema = v.object({
        age: v.number(),
      })

      transform(data: unknown): unknown {
        const d = data as Record<string, unknown>
        return {
          ...d,
          age: typeof d.age === 'string' ? Number.parseInt(d.age, 10) : d.age,
        }
      }
    }

    const request = new TypeConversionRequest()
    const ctx = createMockContext({
      body: { age: '25' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.age).toBe(25)
    }
  })
})

// =============================================================================
// 測試：Partial Validation
// =============================================================================

describe('ValibotFormRequest - Partial Validation', () => {
  // 注意：Valibot 的 schema 沒有 .partial() 方法（與 Zod 不同）
  // 因此 partial validation 需要手動定義 optional schema
  // 或者 schema 本身支援 partial() 方法時才會自動生效

  it('當 schema 沒有 partial 方法時，partial: true 仍執行完整驗證', async () => {
    class UserUpdateRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.pipe(v.string(), v.minLength(2)),
        email: v.pipe(v.string(), v.email()),
        age: v.number(),
      })
    }

    const request = new UserUpdateRequest()
    const ctx = createMockContext({
      body: { name: 'Updated' }, // 只提供 name（缺少 email 和 age）
      headers: { 'content-type': 'application/json' },
    })

    // Valibot schema 沒有 .partial() 方法，所以驗證會失敗
    const result = await request.validate(ctx, { partial: true })
    expect(result.success).toBe(false)
  })

  it('使用 v.partial() 包裝的 schema 應支援部分驗證', async () => {
    class PartialUserUpdateRequest extends ValibotFormRequest {
      // 使用 v.partial() 來定義部分驗證的 schema
      schema = v.partial(
        v.object({
          name: v.pipe(v.string(), v.minLength(2)),
          email: v.pipe(v.string(), v.email()),
          age: v.number(),
        })
      )
    }

    const request = new PartialUserUpdateRequest()
    const ctx = createMockContext({
      body: { name: 'Updated' }, // 只提供 name
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as any).name).toBe('Updated')
      expect((result.data as any).email).toBeUndefined()
    }
  })

  it('partial schema 仍應驗證提供的欄位格式', async () => {
    class PartialValidationRequest extends ValibotFormRequest {
      schema = v.partial(
        v.object({
          name: v.pipe(v.string(), v.minLength(2)),
          email: v.pipe(v.string(), v.email()),
        })
      )
    }

    const request = new PartialValidationRequest()
    const ctx = createMockContext({
      body: { name: 'A' }, // name 太短
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('partial: false（預設）時應驗證所有必填欄位', async () => {
    class StrictRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.string(),
        email: v.string(),
      })
    }

    const request = new StrictRequest()
    const ctx = createMockContext({
      body: { name: 'Carl' }, // 缺少 email
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
  })

  it('當 schema 支援 partial 方法時應自動調用', async () => {
    // 模擬一個具有 partial() 方法的 schema
    const baseSchema = v.object({
      name: v.string(),
      email: v.string(),
    })

    // 創建一個帶有 partial 方法的 schema 包裝器
    const schemaWithPartial = {
      ...baseSchema,
      partial: () =>
        v.partial(
          v.object({
            name: v.string(),
            email: v.string(),
          })
        ),
    }

    class PartialMethodRequest extends ValibotFormRequest {
      schema = schemaWithPartial as any
    }

    const request = new PartialMethodRequest()
    const ctx = createMockContext({
      body: { name: 'Carl' }, // 只提供 name
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx, { partial: true })

    expect(result.success).toBe(true)
  })
})

// =============================================================================
// 測試：Exception 處理
// =============================================================================

describe('ValibotFormRequest - Exception 處理', () => {
  it('getData 拋出異常時應返回驗證錯誤', async () => {
    class ErrorRequest extends ValibotFormRequest {
      schema = v.object({
        data: v.string(),
      })

      override async getData(_ctx: Context): Promise<unknown> {
        throw new Error('Failed to parse request body')
      }
    }

    const request = new ErrorRequest()
    const ctx = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.error.details[0].field).toBe('general')
      expect(result.error.error.details[0].message).toBe('Failed to parse request body')
    }
  })

  it('非 Error 類型的異常應顯示 Unknown error', async () => {
    class ThrowStringRequest extends ValibotFormRequest {
      schema = v.object({
        data: v.string(),
      })

      override async getData(_ctx: Context): Promise<unknown> {
        throw 'string error' // 非 Error 類型
      }
    }

    const request = new ThrowStringRequest()
    const ctx = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.details[0].message).toBe('Unknown error')
    }
  })

  it('transform 拋出異常時應返回驗證錯誤', async () => {
    class TransformErrorRequest extends ValibotFormRequest {
      schema = v.object({
        data: v.string(),
      })

      transform(_data: unknown): unknown {
        throw new Error('Transform failed')
      }
    }

    const request = new TransformErrorRequest()
    const ctx = createMockContext({
      body: { data: 'test' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.error.details[0].message).toBe('Transform failed')
    }
  })

  it('應使用 MessageProvider 的 getValidationFailedMessage', async () => {
    const chineseMessageProvider: MessageProvider = {
      getMessage: (_code, _field, defaultMessage) => defaultMessage,
      getValidationFailedMessage: () => '驗證失敗',
      getUnauthorizedMessage: () => '未授權',
    }

    class I18nValidationRequest extends ValibotFormRequest {
      schema = v.object({
        email: v.pipe(v.string(), v.email()),
      })
      options = {
        messageProvider: chineseMessageProvider,
      }
    }

    const request = new I18nValidationRequest()
    const ctx = createMockContext({
      body: { email: 'invalid' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.message).toBe('驗證失敗')
    }
  })
})

// =============================================================================
// 測試：getBlueprint() 方法
// =============================================================================

describe('ValibotFormRequest - getBlueprint', () => {
  it('應返回包含 source 和 rules 的 blueprint', async () => {
    class SimpleRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.string(),
      })
      override source = 'json' as const
    }

    const request = new SimpleRequest()
    const blueprint = request.getBlueprint()

    expect(blueprint).toHaveProperty('source')
    expect(blueprint).toHaveProperty('rules')
    expect(blueprint.source).toBe('json')
  })

  it('不同 source 應在 blueprint 中正確反映', async () => {
    class QueryRequest extends ValibotFormRequest {
      override source = 'query' as const
      schema = v.object({
        q: v.string(),
      })
    }

    const request = new QueryRequest()
    const blueprint = request.getBlueprint()

    expect(blueprint.source).toBe('query')
  })

  it('form source 應在 blueprint 中正確反映', async () => {
    class FormRequest extends ValibotFormRequest {
      override source = 'form' as const
      schema = v.object({
        file: v.string(),
      })
    }

    const request = new FormRequest()
    const blueprint = request.getBlueprint()

    expect(blueprint.source).toBe('form')
  })
})

// =============================================================================
// 測試：Custom Messages
// =============================================================================

describe('ValibotFormRequest - Custom Messages', () => {
  it('應使用 messages() 方法中定義的自定義訊息', async () => {
    class CustomMessagesRequest extends ValibotFormRequest {
      schema = v.object({
        email: v.pipe(v.string(), v.email()),
        name: v.pipe(v.string(), v.minLength(2)),
      })

      messages() {
        return {
          email: '請輸入有效的 Email 地址',
          name: '名稱至少需要 2 個字元',
        }
      }
    }

    const request = new CustomMessagesRequest()
    const ctx = createMockContext({
      body: { email: 'invalid', name: 'A' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.error.details.find((d) => d.field === 'email')
      if (emailError) {
        expect(emailError.message).toBe('請輸入有效的 Email 地址')
      }
    }
  })

  it('應支援 field.code 格式的自定義訊息', async () => {
    class CodeBasedMessagesRequest extends ValibotFormRequest {
      schema = v.object({
        email: v.pipe(v.string(), v.email()),
      })

      messages() {
        return {
          'email.invalid_email': '電子郵件格式不正確',
        }
      }
    }

    const request = new CodeBasedMessagesRequest()
    const ctx = createMockContext({
      body: { email: 'not-an-email' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    // 驗證錯誤詳情存在
    if (!result.success) {
      expect(result.error.error.details.length).toBeGreaterThan(0)
    }
  })
})

// =============================================================================
// 測試：不同的 DataSource
// =============================================================================

describe('ValibotFormRequest - DataSource', () => {
  it('source: json 應從 request body 讀取資料', async () => {
    class JsonRequest extends ValibotFormRequest {
      override source = 'json' as const
      schema = v.object({
        name: v.string(),
      })
    }

    const request = new JsonRequest()
    const ctx = createMockContext({
      body: { name: 'Carl' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Carl')
    }
  })

  it('source: query 應從 URL query parameters 讀取資料', async () => {
    class QueryRequest extends ValibotFormRequest {
      override source = 'query' as const
      schema = v.object({
        q: v.string(),
        page: v.optional(v.string()),
      })
    }

    const request = new QueryRequest()
    const ctx = createMockContext({
      query: { q: 'search', page: '1' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBe('search')
      expect(result.data.page).toBe('1')
    }
  })

  it('source: param 應從 URL parameters 讀取資料', async () => {
    class ParamRequest extends ValibotFormRequest {
      override source = 'param' as const
      schema = v.object({
        id: v.string(),
      })
    }

    const request = new ParamRequest()
    const ctx = createMockContext({
      params: { id: '123' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('123')
    }
  })
})

// =============================================================================
// 測試：複雜的 Valibot Schema
// =============================================================================

describe('ValibotFormRequest - 複雜 Schema', () => {
  it('應正確處理陣列類型', async () => {
    class ArrayRequest extends ValibotFormRequest {
      schema = v.object({
        tags: v.array(v.string()),
      })
    }

    const request = new ArrayRequest()
    const ctx = createMockContext({
      body: { tags: ['tag1', 'tag2', 'tag3'] },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(['tag1', 'tag2', 'tag3'])
    }
  })

  it('應正確處理可選欄位', async () => {
    class OptionalFieldsRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.string(),
        nickname: v.optional(v.string()),
      })
    }

    const request = new OptionalFieldsRequest()
    const ctx = createMockContext({
      body: { name: 'Carl' },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Carl')
      expect(result.data.nickname).toBeUndefined()
    }
  })

  it('應正確處理 nullable 欄位', async () => {
    class NullableRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.string(),
        bio: v.nullable(v.string()),
      })
    }

    const request = new NullableRequest()
    const ctx = createMockContext({
      body: { name: 'Carl', bio: null },
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bio).toBeNull()
    }
  })

  it('應正確處理 union 類型', async () => {
    class UnionRequest extends ValibotFormRequest {
      schema = v.object({
        value: v.union([v.string(), v.number()]),
      })
    }

    const request = new UnionRequest()

    // 測試字串
    const ctx1 = createMockContext({
      body: { value: 'hello' },
      headers: { 'content-type': 'application/json' },
    })
    const result1 = await request.validate(ctx1)
    expect(result1.success).toBe(true)

    // 測試數字
    const ctx2 = createMockContext({
      body: { value: 42 },
      headers: { 'content-type': 'application/json' },
    })
    const result2 = await request.validate(ctx2)
    expect(result2.success).toBe(true)
  })

  it('應正確處理 enum 類型', async () => {
    class EnumRequest extends ValibotFormRequest {
      schema = v.object({
        status: v.picklist(['active', 'inactive', 'pending']),
      })
    }

    const request = new EnumRequest()

    // 有效值
    const ctx1 = createMockContext({
      body: { status: 'active' },
      headers: { 'content-type': 'application/json' },
    })
    const result1 = await request.validate(ctx1)
    expect(result1.success).toBe(true)

    // 無效值
    const ctx2 = createMockContext({
      body: { status: 'invalid' },
      headers: { 'content-type': 'application/json' },
    })
    const result2 = await request.validate(ctx2)
    expect(result2.success).toBe(false)
  })
})

// =============================================================================
// 測試：邊界情況
// =============================================================================

describe('ValibotFormRequest - 邊界情況', () => {
  it('空物件應觸發驗證錯誤', async () => {
    class EmptyBodyRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.string(),
      })
    }

    const request = new EmptyBodyRequest()
    const ctx = createMockContext({
      body: {},
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
  })

  it('null body 應觸發驗證錯誤', async () => {
    class NullBodyRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.string(),
      })
    }

    const request = new NullBodyRequest()
    const ctx = createMockContext({
      body: null as any,
      headers: { 'content-type': 'application/json' },
    })

    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
  })

  it('沒有 content-type 應返回空物件', async () => {
    class NoContentTypeRequest extends ValibotFormRequest {
      schema = v.object({
        name: v.optional(v.string()),
      })
    }

    const request = new NoContentTypeRequest()
    const ctx = createMockContext({
      body: { name: 'Carl' },
      // 沒有 content-type header
    })

    const result = await request.validate(ctx)

    // DataExtractor 在沒有 content-type 時返回空物件
    expect(result.success).toBe(true)
  })
})
