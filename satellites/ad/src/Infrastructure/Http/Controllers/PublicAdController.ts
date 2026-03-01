import type { DeliverAdUseCase } from '../../../Application/UseCases/DeliverAdUseCase'
import { AdError } from '../../../Domain/Errors/AdError'
import { DeliverAdSchema } from '../Validation/AdRequestSchemas'

/**
 * Hono Context 最小介面
 */
interface HonoContext {
  req: {
    json(): Promise<unknown>
    param(name: string): string | undefined
    query(name: string): string | undefined
  }
  json(data: unknown, status?: number): unknown
}

/**
 * 成功回應格式
 */
function success<T>(data: T) {
  return { success: true as const, data }
}

/**
 * 錯誤回應格式
 */
function failure(code: string, message: string) {
  return { success: false as const, error: { code, message } }
}

/**
 * 公開廣告投放控制器
 *
 * 提供廣告投放端點：
 * - POST /api/v1/ads/delivery          -> deliver
 * - GET  /api/v1/ads/slots/:slotSlug   -> deliverBySlot
 */
export class PublicAdController {
  constructor(private readonly deliverAdUseCase: DeliverAdUseCase) {}

  /**
   * 廣告投放（POST 請求）
   *
   * 根據版位和數量投放廣告。
   */
  async deliver(ctx: HonoContext): Promise<unknown> {
    try {
      const body = await ctx.req.json()
      const parsed = DeliverAdSchema.safeParse(body)

      if (!parsed.success) {
        return ctx.json(failure('VALIDATION_ERROR', formatZodErrors(parsed.error)), 400)
      }

      const result = await this.deliverAdUseCase.execute(parsed.data)
      return ctx.json(success(result), 200)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * 依版位投放廣告（GET 請求）
   *
   * 從路由參數取得版位，從 query 取得數量。
   */
  async deliverBySlot(ctx: HonoContext): Promise<unknown> {
    try {
      const slotSlug = ctx.req.param('slotSlug') ?? ''
      const countStr = ctx.req.query('count')
      const count = countStr ? Number.parseInt(countStr, 10) : undefined

      // 使用相同的 schema 驗證輸入
      const parsed = DeliverAdSchema.safeParse({
        slotSlug,
        count,
      })

      if (!parsed.success) {
        return ctx.json(failure('VALIDATION_ERROR', formatZodErrors(parsed.error)), 400)
      }

      const result = await this.deliverAdUseCase.execute(parsed.data)
      return ctx.json(success(result), 200)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * 統一錯誤處理
   */
  private handleError(ctx: HonoContext, error: unknown): unknown {
    if (error instanceof AdError) {
      return ctx.json(failure(error.code, error.message), error.statusCode)
    }

    const message = error instanceof Error ? error.message : '未知錯誤'
    return ctx.json(failure('INTERNAL_ERROR', message), 500)
  }
}

/**
 * 格式化 Zod 驗證錯誤訊息
 */
function formatZodErrors(error: {
  issues?: Array<{ message: string; path?: PropertyKey[] }>
}): string {
  if (!error.issues || error.issues.length === 0) {
    return '驗證失敗'
  }
  return error.issues
    .map((issue) => {
      const path = issue.path?.map(String).join('.') ?? ''
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('; ')
}
