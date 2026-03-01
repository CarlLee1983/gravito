import { AdMapper } from '../../../Application/DTOs/AdMapper'
import type { CreateAdUseCase } from '../../../Application/UseCases/CreateAdUseCase'
import type { DeleteAdUseCase } from '../../../Application/UseCases/DeleteAdUseCase'
import type { ListAdsUseCase } from '../../../Application/UseCases/ListAdsUseCase'
import type { ToggleAdStatusUseCase } from '../../../Application/UseCases/ToggleAdStatusUseCase'
import type { UpdateAdUseCase } from '../../../Application/UseCases/UpdateAdUseCase'
import type { IAdRepository } from '../../../Domain/Contracts/IAdRepository'
import { AdError } from '../../../Domain/Errors/AdError'
import {
  CreateAdSchema,
  ListAdsQuerySchema,
  ToggleStatusSchema,
  UpdateAdSchema,
} from '../Validation/AdRequestSchemas'

/**
 * Hono Context 最小介面
 *
 * 避免直接依賴 Hono 套件，方便測試注入 mock。
 */
interface HonoContext {
  req: {
    json(): Promise<unknown>
    param(name: string): string | undefined
    query(name: string): string | undefined
    queries(): Record<string, string | string[]>
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
 * 管理後台廣告控制器
 *
 * 提供廣告 CRUD 六個端點：
 * - POST   /api/admin/v1/ads          -> create
 * - GET    /api/admin/v1/ads          -> list
 * - GET    /api/admin/v1/ads/:id      -> show
 * - PUT    /api/admin/v1/ads/:id      -> update
 * - PATCH  /api/admin/v1/ads/:id/status -> toggleStatus
 * - DELETE /api/admin/v1/ads/:id      -> destroy
 */
export class AdminAdController {
  constructor(
    private readonly createAdUseCase: CreateAdUseCase,
    private readonly listAdsUseCase: ListAdsUseCase,
    private readonly updateAdUseCase: UpdateAdUseCase,
    private readonly toggleAdStatusUseCase: ToggleAdStatusUseCase,
    private readonly deleteAdUseCase: DeleteAdUseCase,
    private readonly adRepository: IAdRepository
  ) {}

  /**
   * 建立廣告
   */
  async create(ctx: HonoContext): Promise<unknown> {
    try {
      const body = await ctx.req.json()
      const parsed = CreateAdSchema.safeParse(body)

      if (!parsed.success) {
        return ctx.json(failure('VALIDATION_ERROR', formatZodErrors(parsed.error)), 400)
      }

      const result = await this.createAdUseCase.execute(parsed.data)
      return ctx.json(success(result), 201)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * 查詢廣告列表
   */
  async list(ctx: HonoContext): Promise<unknown> {
    try {
      const rawParams = ctx.req.queries()
      // 將陣列值取第一個元素，確保單值
      const queryParams: Record<string, string> = {}
      for (const [key, val] of Object.entries(rawParams)) {
        queryParams[key] = Array.isArray(val) ? (val[0] ?? '') : val
      }
      const parsed = ListAdsQuerySchema.safeParse(queryParams)

      if (!parsed.success) {
        return ctx.json(failure('VALIDATION_ERROR', formatZodErrors(parsed.error)), 400)
      }

      const result = await this.listAdsUseCase.execute(parsed.data)
      return ctx.json(success(result), 200)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * 查詢單一廣告
   */
  async show(ctx: HonoContext): Promise<unknown> {
    try {
      const id = ctx.req.param('id') ?? ''
      const ad = await this.adRepository.findById(id)

      if (!ad) {
        return ctx.json(failure('AD_NOT_FOUND', `廣告未找到: ${id}`), 404)
      }

      return ctx.json(success(AdMapper.toDTO(ad)), 200)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * 更新廣告
   */
  async update(ctx: HonoContext): Promise<unknown> {
    try {
      const id = ctx.req.param('id') ?? ''
      const body = await ctx.req.json()
      const parsed = UpdateAdSchema.safeParse(body)

      if (!parsed.success) {
        return ctx.json(failure('VALIDATION_ERROR', formatZodErrors(parsed.error)), 400)
      }

      const result = await this.updateAdUseCase.execute({
        adId: id,
        ...parsed.data,
      })
      return ctx.json(success(result), 200)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * 切換廣告狀態
   */
  async toggleStatus(ctx: HonoContext): Promise<unknown> {
    try {
      const id = ctx.req.param('id') ?? ''
      const body = await ctx.req.json()
      const parsed = ToggleStatusSchema.safeParse(body)

      if (!parsed.success) {
        return ctx.json(failure('VALIDATION_ERROR', formatZodErrors(parsed.error)), 400)
      }

      const result = await this.toggleAdStatusUseCase.execute({
        adId: id,
        action: parsed.data.action,
      })
      return ctx.json(success(result), 200)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * 刪除廣告
   */
  async destroy(ctx: HonoContext): Promise<unknown> {
    try {
      const id = ctx.req.param('id') ?? ''
      const result = await this.deleteAdUseCase.execute({ adId: id })
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
