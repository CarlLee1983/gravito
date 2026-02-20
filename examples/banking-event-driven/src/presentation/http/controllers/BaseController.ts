import type { GravitoContext } from '@gravito/core'
import type { FormRequest } from '@gravito/impulse'

export abstract class BaseController {
  /**
   * 封裝 Request 驗證邏輯，讓 Route 層保持乾淨。
   * 如果驗證失敗，會拋出包含詳細錯誤訊息的 Error。
   */
  protected async validate<T>(
    c: GravitoContext,
    RequestClass: new () => FormRequest<T>
  ): Promise<any> {
    const req = new RequestClass()
    const result = await req.validate(c)

    if (!result.success) {
      const details = result.error.error.details
      if (details && details.length > 0) {
        const messages = details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
        throw new Error(`Validation failed: ${messages}`)
      }
      throw new Error(result.error.error.message || 'Validation failed')
    }

    return result.data
  }
}
