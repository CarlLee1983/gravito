import type { CreateAccountCommand } from '../../Commands/CreateAccount/CreateAccountCommand'
import type { CommandValidator, ValidationResult } from '../CommandValidator'
import type { Violation } from '../ValidationError'

/** 帳戶 ID 格式：英數字、連字號、底線，長度 1~50 */
const ACCOUNT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/

/** 幣別格式：3 位大寫英文字母 */
const CURRENCY_PATTERN = /^[A-Z]{3}$/

/**
 * CreateAccountCommand 驗證器
 *
 * 驗證規則：
 * - accountId：不得為空、符合格式（英數字及 -_，長度 1~50）
 * - ownerName：不得為空、長度 1~100
 * - currency：必須為 3 位大寫英文字母（如 TWD、USD、EUR）
 */
export class CreateAccountCommandValidator implements CommandValidator<CreateAccountCommand> {
  validate(command: CreateAccountCommand): ValidationResult {
    const violations: Violation[] = []

    // 驗證 accountId
    if (!command.accountId || command.accountId.trim().length === 0) {
      violations.push({ field: 'accountId', message: '帳戶 ID 不得為空' })
    } else if (!ACCOUNT_ID_PATTERN.test(command.accountId)) {
      violations.push({
        field: 'accountId',
        message: '帳戶 ID 僅允許英數字、連字號（-）及底線（_），長度 1~50 字元',
      })
    }

    // 驗證 ownerName
    if (!command.ownerName || command.ownerName.trim().length === 0) {
      violations.push({ field: 'ownerName', message: '戶名不得為空' })
    } else if (command.ownerName.trim().length > 100) {
      violations.push({ field: 'ownerName', message: '戶名長度不得超過 100 字元' })
    }

    // 驗證 currency
    if (!command.currency || command.currency.trim().length === 0) {
      violations.push({ field: 'currency', message: '幣別不得為空' })
    } else if (!CURRENCY_PATTERN.test(command.currency)) {
      violations.push({
        field: 'currency',
        message: '幣別必須為 3 位大寫英文字母（如 TWD、USD、EUR）',
      })
    }

    return { isValid: violations.length === 0, violations }
  }
}
