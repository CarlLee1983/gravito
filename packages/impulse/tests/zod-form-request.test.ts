/**
 * ZodFormRequest 補充測試
 *
 * 專門測試 ZodFormRequest.ts 中未覆蓋的路徑：
 * - Authorization 分支（第 47-62 行）
 * - Transform 流程（第 69 行）
 * - Partial validation 選項（第 73-75 行）
 * - Exception 處理（第 112-130 行）
 * - getBlueprint() 方法
 */
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { ZodFormRequest } from '../src/core/ZodFormRequest'
import type { MessageProvider } from '../src/FormRequest'

// =============================================================================
// 模擬 Context
// =============================================================================

function createMockContext(data: unknown = {}) {
  let parsedBody: unknown
  return {
    req: {
      json: async () => data,
      header: (name: string) => {
        if (name.toLowerCase() === 'content-type') {
          return 'application/json'
        }
        return null
      },
    },
    get: (key: string) => {
      if (key === '__parsedBody') return parsedBody
      return null
    },
    set: (key: string, value: unknown) => {
      if (key === '__parsedBody') parsedBody = value
    },
  } as any
}

// =============================================================================
// Authorization 分支測試
// =============================================================================

describe('ZodFormRequest Authorization', () => {
  it('should return AUTHORIZATION_ERROR with authorizationMessage when authorize returns false', async () => {
    class AuthWithCustomMessage extends ZodFormRequest {
      schema = z.object({ data: z.string() })

      authorize() {
        return false
      }

      authorizationMessage() {
        return 'Custom authorization failed message'
      }
    }

    const request = new AuthWithCustomMessage()
    const ctx = createMockContext({ data: 'test' })
    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('AUTHORIZATION_ERROR')
      expect(result.error.error.message).toBe('Custom authorization failed message')
    }
  })

  it('should use messageProvider.getUnauthorizedMessage when no authorizationMessage', async () => {
    const customProvider: MessageProvider = {
      getMessage: () => '',
      getValidationFailedMessage: () => 'Validation failed',
      getUnauthorizedMessage: () => 'Provider unauthorized message',
    }

    class AuthWithProvider extends ZodFormRequest {
      schema = z.object({ data: z.string() })
      options = { messageProvider: customProvider }

      authorize() {
        return false
      }
    }

    const request = new AuthWithProvider()
    const ctx = createMockContext({ data: 'test' })
    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('AUTHORIZATION_ERROR')
      expect(result.error.error.message).toBe('Provider unauthorized message')
    }
  })

  it('should use default "Unauthorized" message when no custom message or provider', async () => {
    class AuthNoCustomMessage extends ZodFormRequest {
      schema = z.object({ data: z.string() })

      authorize() {
        return false
      }
    }

    const request = new AuthNoCustomMessage()
    const ctx = createMockContext({ data: 'test' })
    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('AUTHORIZATION_ERROR')
      expect(result.error.error.message).toBe('Unauthorized')
    }
  })

  it('should support async authorize function', async () => {
    class AsyncAuthRequest extends ZodFormRequest {
      schema = z.object({ data: z.string() })

      async authorize() {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return false
      }
    }

    const request = new AsyncAuthRequest()
    const ctx = createMockContext({ data: 'test' })
    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('AUTHORIZATION_ERROR')
    }
  })
})

// =============================================================================
// Transform 流程測試
// =============================================================================

describe('ZodFormRequest Transform', () => {
  it('should apply transform before validation', async () => {
    class TransformRequest extends ZodFormRequest {
      schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
      })

      transform(data: unknown) {
        const d = data as { name?: string; email?: string }
        return {
          ...d,
          name: d.name?.trim().toUpperCase(),
          email: d.email?.toLowerCase(),
        }
      }
    }

    const request = new TransformRequest()
    const ctx = createMockContext({
      name: '  carl  ',
      email: 'CARL@EXAMPLE.COM',
    })
    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('CARL')
      expect(result.data.email).toBe('carl@example.com')
    }
  })

  it('should run transform before schema validation catches errors', async () => {
    class TransformFixRequest extends ZodFormRequest {
      schema = z.object({
        count: z.number().min(0),
      })

      transform(data: unknown) {
        const d = data as { count?: number }
        return {
          count: (d.count || 0) + 10,
        }
      }
    }

    const request = new TransformFixRequest()
    const ctx = createMockContext({ count: 32 })
    const result = await request.validate(ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.count).toBe(42)
    }
  })
})

// =============================================================================
// Partial Validation 測試
// =============================================================================

describe('ZodFormRequest Partial Validation', () => {
  it('should apply partial validation when options.partial is true', async () => {
    class UpdateUserRequest extends ZodFormRequest {
      schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        age: z.number().min(0),
      })
    }

    const request = new UpdateUserRequest()
    const ctx = createMockContext({ name: 'Carl' })

    // 沒有 partial 選項時，缺少 email 和 age 應該失敗
    const fullResult = await request.validate(ctx, { partial: false })
    expect(fullResult.success).toBe(false)

    // 有 partial 選項時，只有 name 應該成功
    const partialResult = await request.validate(ctx, { partial: true })
    expect(partialResult.success).toBe(true)
    if (partialResult.success) {
      // Zod partial() 使所有欄位變成 optional，驗證只返回提供的欄位
      expect(partialResult.data).toBeDefined()
    }
  })

  it('should still validate provided fields in partial mode', async () => {
    class PartialValidationRequest extends ZodFormRequest {
      schema = z.object({
        name: z.string().min(5),
        email: z.string().email(),
      })
    }

    const request = new PartialValidationRequest()
    const ctx = createMockContext({ name: 'AB' }) // 太短

    // partial 模式下，min 檢查仍然會執行
    const result = await request.validate(ctx, { partial: true })
    // Zod partial 只讓欄位變成 optional，但如果提供了值，仍會驗證
    // 如果值太短會失敗
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.details.length).toBeGreaterThan(0)
    }
  })
})

// =============================================================================
// Exception 處理測試
// =============================================================================

describe('ZodFormRequest Exception Handling', () => {
  it('should handle Error thrown during getData', async () => {
    class ThrowErrorRequest extends ZodFormRequest {
      schema = z.object({ data: z.string() })

      async getData() {
        throw new Error('getData failed')
      }
    }

    const request = new ThrowErrorRequest()
    const ctx = createMockContext({})
    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.error.details[0].field).toBe('general')
      expect(result.error.error.details[0].message).toBe('getData failed')
    }
  })

  it('should handle non-Error thrown during getData', async () => {
    class ThrowNonErrorRequest extends ZodFormRequest {
      schema = z.object({ data: z.string() })

      async getData() {
        throw 'string error' // 非 Error 物件
      }
    }

    const request = new ThrowNonErrorRequest()
    const ctx = createMockContext({})
    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.error.details[0].field).toBe('general')
      expect(result.error.error.details[0].message).toBe('Unknown error')
    }
  })

  it('should handle Error thrown during transform', async () => {
    class TransformThrowRequest extends ZodFormRequest {
      schema = z.object({ data: z.string() })

      transform() {
        throw new Error('Transform failed')
      }
    }

    const request = new TransformThrowRequest()
    const ctx = createMockContext({ data: 'test' })
    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.error.details[0].message).toBe('Transform failed')
    }
  })

  it('should use messageProvider for error message in catch block', async () => {
    const customProvider: MessageProvider = {
      getMessage: () => '',
      getValidationFailedMessage: () => 'Custom validation error',
      getUnauthorizedMessage: () => '',
    }

    class ProviderErrorRequest extends ZodFormRequest {
      schema = z.object({ data: z.string() })
      options = { messageProvider: customProvider }

      async getData() {
        throw new Error('Something went wrong')
      }
    }

    const request = new ProviderErrorRequest()
    const ctx = createMockContext({})
    const result = await request.validate(ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.error.message).toBe('Custom validation error')
    }
  })
})

// =============================================================================
// getBlueprint 測試
// =============================================================================

describe('ZodFormRequest getBlueprint', () => {
  it('should generate blueprint from Zod schema', () => {
    class BlueprintRequest extends ZodFormRequest {
      schema = z.object({
        name: z.string().min(2).max(50),
        email: z.string().email(),
        age: z.number().int().min(0).optional(),
      })
    }

    const request = new BlueprintRequest()
    const blueprint = request.getBlueprint()

    expect(blueprint.source).toBe('json')
    expect(blueprint.rules.name.type).toBe('string')
    expect(blueprint.rules.name.min).toBe(2)
    expect(blueprint.rules.name.max).toBe(50)
    expect(blueprint.rules.email.format).toBe('email')
    expect(blueprint.rules.age.type).toBe('number')
    expect(blueprint.rules.age.required).toBe(false)
    expect(blueprint.rules.age.integer).toBe(true)
  })

  it('should use custom source in blueprint', () => {
    class QueryBlueprintRequest extends ZodFormRequest {
      source = 'query' as const
      schema = z.object({
        q: z.string(),
        page: z.number().default(1),
      })
    }

    const request = new QueryBlueprintRequest()
    const blueprint = request.getBlueprint()

    expect(blueprint.source).toBe('query')
    expect(blueprint.rules.page.default).toBe(1)
    expect(blueprint.rules.page.required).toBe(false)
  })
})
