import type { ErrorCategory } from './types'
import { isRetryableCategory } from '../../errors'

export { isRetryableCategory }

/**
 * 根據錯誤訊息與型別分類 Kafka 操作錯誤。
 *
 * 錯誤分類：
 * - `transient`（影響電路斷路器）：連線失敗、逾時、網路錯誤
 * - `serialization`（不影響電路）：JSON parse 失敗、序列化錯誤
 * - `business_logic`（不影響電路）：回調拋出的一般錯誤
 * - `permanent`（不影響電路）：其他永久性失敗
 *
 * 使用者應根據錯誤分類決定是否影響電路斷路器狀態。
 * 只有 `transient` 錯誤才應遞增電路的失敗計數。
 *
 * @public
 */
export class ErrorCategorizer {
  /**
   * 將錯誤分類為標準分類之一。
   *
   * 分類規則（優先順序）：
   * 1. `transient` - ECONNREFUSED, ETIMEDOUT, ECONNRESET, 網路相關
   * 2. `serialization` - SyntaxError, JSON.parse 相關
   * 3. `business_logic` - 回調拋出的一般 Error（isBusinessLogic 為 true）
   * 4. `permanent` - 其他所有錯誤
   */
  categorize(error: Error, isBusinessLogic = false): ErrorCategory {
    // 檢查瞬間性錯誤（網路相關）
    const message = error.message.toLowerCase()
    const code = (error as NodeJS.ErrnoException).code

    // ECONNREFUSED 可能的來源：連線被拒
    if (code === 'ECONNREFUSED' || message.includes('econnrefused')) {
      return 'transient'
    }

    // ETIMEDOUT 可能的來源：連線逾時
    if (code === 'ETIMEDOUT' || message.includes('etimedout') || message.includes('timeout')) {
      return 'transient'
    }

    // ECONNRESET 可能的來源：連線被重置
    if (code === 'ECONNRESET' || message.includes('econnreset')) {
      return 'transient'
    }

    // 其他網路錯誤
    if (
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('failed to connect') ||
      message.includes('disconnected')
    ) {
      return 'transient'
    }

    // 檢查序列化錯誤（JSON.parse 相關）
    if (error instanceof SyntaxError || message.includes('json') || message.includes('parse')) {
      return 'serialization'
    }

    // 檢查業務邏輯錯誤（回調拋出）
    if (isBusinessLogic) {
      return 'business_logic'
    }

    // 其他一切都是永久性錯誤
    return 'permanent'
  }

  /**
   * 檢查某個分類的錯誤是否應影響電路斷路器。
   *
   * 只有 `transient` 分類應遞增電路的失敗計數。
   * 其他分類（`serialization`, `business_logic`, `permanent`）
   * 應直接跳過電路斷路器邏輯。
   */
  shouldAffectCircuit(category: ErrorCategory): boolean {
    return category === 'transient'
  }

  /**
   * 根據錯誤直接判斷是否應影響電路（便利方法）。
   */
  shouldRecordInCircuit(error: Error, isBusinessLogic = false): boolean {
    const category = this.categorize(error, isBusinessLogic)
    return this.shouldAffectCircuit(category)
  }
}
