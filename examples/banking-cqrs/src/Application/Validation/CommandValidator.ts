import type { Violation } from './ValidationError'

/**
 * 驗證結果
 *
 * 封裝驗證是否通過及所有違規項目。
 */
export interface ValidationResult {
  /** 驗證是否通過（無任何違規時為 true） */
  readonly isValid: boolean
  /** 所有違規項目（驗證通過時為空陣列） */
  readonly violations: readonly Violation[]
}

/**
 * Command 驗證器介面
 *
 * 所有驗證器必須實作此介面，以確保統一的驗證合約。
 *
 * @typeParam TCommand - 此驗證器負責驗證的 Command 型別
 *
 * @example
 * ```typescript
 * class CreateAccountCommandValidator implements CommandValidator<CreateAccountCommand> {
 *   validate(command: CreateAccountCommand): ValidationResult {
 *     const violations: Violation[] = []
 *     if (!command.accountId) {
 *       violations.push({ field: 'accountId', message: '帳戶 ID 不得為空' })
 *     }
 *     return { isValid: violations.length === 0, violations }
 *   }
 * }
 * ```
 */
export interface CommandValidator<TCommand> {
  /**
   * 驗證 Command 的所有欄位
   *
   * @param command - 待驗證的 Command 實例
   * @returns 驗證結果，包含是否通過及違規清單
   */
  validate(command: TCommand): ValidationResult
}

/**
 * 建立成功的驗證結果（無違規）
 */
export function validResult(): ValidationResult {
  return { isValid: true, violations: [] }
}

/**
 * 建立失敗的驗證結果
 *
 * @param violations - 違規項目陣列（不得為空）
 */
export function invalidResult(violations: readonly Violation[]): ValidationResult {
  return { isValid: false, violations }
}
