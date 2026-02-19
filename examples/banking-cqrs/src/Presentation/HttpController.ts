import type { PlanetCore } from '@gravito/core'
import { z } from 'zod'
import { errorHandler } from '../Middleware/ErrorHandler'

/**
 * HTTP 上下文介面
 *
 * 抽象化 Hono/Photon 的 Context，使 Controller 不直接依賴框架型別。
 * 未來可替換底層 HTTP 引擎而不影響 Controller 邏輯。
 */
export interface HttpContext {
  req: {
    json(): Promise<unknown>
    param(name: string): string | undefined
    query(name: string): string | undefined
  }
  get(key: string): unknown
  json(data: unknown, status?: number): Response
}

/**
 * 標準 API 成功回應格式
 */
export interface ApiSuccessResponse<T = unknown> {
  readonly success: true
  readonly data?: T
  readonly [key: string]: unknown
}

/**
 * 標準 API 錯誤回應格式
 */
export interface ApiErrorResponse {
  readonly success: false
  readonly error: string
  readonly code: string
}

/**
 * HttpController 抽象基類
 *
 * 提供 Controller 層共用的基礎設施：
 * - JSON 回應快捷方法（immutable response 物件）
 * - Zod 驗證整合與統一錯誤格式
 * - 自動從 Context 取得 PlanetCore 與 DI 容器
 * - 統一錯誤處理委派
 *
 * **職責邊界：**
 * - Controller 負責：HTTP 請求解析、輸入驗證、呼叫 Action、回應格式化
 * - Controller 不負責：業務邏輯（由 Action 處理）、資料存取（由 Repository 處理）
 *
 * **設計原則：**
 * - 所有回應物件均為 readonly（不可變）
 * - Controller 方法無副作用（除了呼叫 Action）
 * - 驗證失敗統一回傳 400 + VALIDATION_ERROR
 *
 * @since 2.0.0
 */
export abstract class HttpController {
  /**
   * 從 HTTP Context 取得 PlanetCore 實例
   *
   * 用於存取 DI 容器以解析服務。
   */
  protected getCore(ctx: HttpContext): PlanetCore {
    return ctx.get('core') as PlanetCore
  }

  /**
   * 回傳成功的 JSON 回應
   *
   * 建立不可變的成功回應物件。
   *
   * @param ctx - HTTP 上下文
   * @param data - 回應資料
   * @param status - HTTP 狀態碼（預設 200）
   * @param extra - 額外的頂層欄位（如 accountId）
   */
  protected success(
    ctx: HttpContext,
    data?: unknown,
    status = 200,
    extra?: Record<string, unknown>
  ): Response {
    const body: ApiSuccessResponse = {
      success: true,
      ...(data !== undefined ? { data } : {}),
      ...extra,
    }
    return ctx.json(body, status)
  }

  /**
   * 回傳驗證錯誤的 JSON 回應
   *
   * 將 ZodError 轉換為統一的 API 錯誤格式。
   */
  protected validationError(ctx: HttpContext, err: z.ZodError): Response {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')

    return ctx.json(
      {
        success: false,
        error: `驗證失敗: ${message}`,
        code: 'VALIDATION_ERROR',
      } as ApiErrorResponse,
      400
    )
  }

  /**
   * 回傳查詢參數驗證錯誤
   */
  protected queryValidationError(ctx: HttpContext, err: z.ZodError): Response {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')

    return ctx.json(
      {
        success: false,
        error: `查詢參數驗證失敗: ${message}`,
        code: 'VALIDATION_ERROR',
      } as ApiErrorResponse,
      400
    )
  }

  /**
   * 委派給全域錯誤處理器
   *
   * 將領域層錯誤（Not Found、Insufficient Balance 等）
   * 轉換為對應的 HTTP 狀態碼。
   */
  protected handleError(err: Error, ctx: HttpContext): Response {
    return errorHandler(err, ctx)
  }

  /**
   * 安全執行 Controller 方法的包裝器
   *
   * 提供統一的 try-catch 錯誤處理流程：
   * 1. 執行 handler 函式
   * 2. ZodError → 400 驗證錯誤
   * 3. 其他 Error → 委派給 errorHandler
   *
   * @param ctx - HTTP 上下文
   * @param handler - 實際的處理函式
   */
  protected async execute(ctx: HttpContext, handler: () => Promise<Response>): Promise<Response> {
    try {
      return await handler()
    } catch (err) {
      if (err instanceof z.ZodError) {
        return this.validationError(ctx, err)
      }
      return this.handleError(err as Error, ctx)
    }
  }
}
