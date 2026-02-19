/**
 * 驗證違規項目
 *
 * 描述單一欄位的驗證錯誤。
 */
export interface Violation {
  /** 發生錯誤的欄位名稱 */
  readonly field: string
  /** 人類可讀的錯誤訊息（繁體中文） */
  readonly message: string
}

/**
 * 驗證錯誤
 *
 * 當 Command 驗證失敗時拋出的結構化錯誤。
 * 包含所有違規項目，方便上層統一處理。
 *
 * @example
 * ```typescript
 * throw new ValidationError('CreateAccountCommand', [
 *   { field: 'accountId', message: '帳戶 ID 不得為空' },
 *   { field: 'currency', message: '幣別必須為 3 位大寫英文字母' },
 * ])
 * ```
 */
export class ValidationError extends Error {
  /** 觸發驗證的 Command 名稱 */
  readonly commandName: string
  /** 所有違規項目（唯讀陣列） */
  readonly violations: readonly Violation[]

  constructor(commandName: string, violations: readonly Violation[]) {
    const summary = violations.map((v) => `[${v.field}] ${v.message}`).join('; ')
    super(`驗證失敗（${commandName}）：${summary}`)
    this.name = 'ValidationError'
    this.commandName = commandName
    this.violations = violations
  }
}
