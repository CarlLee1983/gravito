import type { TransferFundsCommand } from '../../Commands/TransferFunds/TransferFundsCommand'
import type { CommandValidator, ValidationResult } from '../CommandValidator'
import type { Violation } from '../ValidationError'

/** 帳戶 ID 格式：英數字、連字號、底線，長度 1~50 */
const ACCOUNT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/

/** 幣別格式：3 位大寫英文字母 */
const CURRENCY_PATTERN = /^[A-Z]{3}$/

/** 單筆轉帳上限：10,000,000 分（即 100,000 TWD） */
const MAX_TRANSFER_CENTS = 10_000_000

/**
 * TransferFundsCommand 驗證器
 *
 * 驗證規則：
 * - fromAccountId：不得為空、符合格式（英數字及 -_，長度 1~50）
 * - toAccountId：不得為空、符合格式（英數字及 -_，長度 1~50）
 * - fromAccountId !== toAccountId：不得自轉帳
 * - amountCents：必須為正整數（> 0）
 * - amountCents <= 10,000,000：單筆上限 100,000 TWD
 * - currency：必須為 3 位大寫英文字母
 */
export class TransferFundsCommandValidator implements CommandValidator<TransferFundsCommand> {
  validate(command: TransferFundsCommand): ValidationResult {
    const violations: Violation[] = []

    // 驗證 fromAccountId
    if (!command.fromAccountId || command.fromAccountId.trim().length === 0) {
      violations.push({ field: 'fromAccountId', message: '來源帳戶 ID 不得為空' })
    } else if (!ACCOUNT_ID_PATTERN.test(command.fromAccountId)) {
      violations.push({
        field: 'fromAccountId',
        message: '來源帳戶 ID 僅允許英數字、連字號（-）及底線（_），長度 1~50 字元',
      })
    }

    // 驗證 toAccountId
    if (!command.toAccountId || command.toAccountId.trim().length === 0) {
      violations.push({ field: 'toAccountId', message: '目標帳戶 ID 不得為空' })
    } else if (!ACCOUNT_ID_PATTERN.test(command.toAccountId)) {
      violations.push({
        field: 'toAccountId',
        message: '目標帳戶 ID 僅允許英數字、連字號（-）及底線（_），長度 1~50 字元',
      })
    }

    // 驗證不得自轉帳（僅在兩個 ID 都合法時才比較）
    if (
      command.fromAccountId &&
      command.toAccountId &&
      ACCOUNT_ID_PATTERN.test(command.fromAccountId) &&
      ACCOUNT_ID_PATTERN.test(command.toAccountId) &&
      command.fromAccountId === command.toAccountId
    ) {
      violations.push({
        field: 'toAccountId',
        message: '目標帳戶不得與來源帳戶相同（不允許自轉帳）',
      })
    }

    // 驗證 amountCents
    if (!Number.isInteger(command.amountCents) || command.amountCents <= 0) {
      violations.push({
        field: 'amountCents',
        message: '轉帳金額必須為正整數（單位：分）',
      })
    } else if (command.amountCents > MAX_TRANSFER_CENTS) {
      violations.push({
        field: 'amountCents',
        message: `單筆轉帳金額不得超過 ${MAX_TRANSFER_CENTS.toLocaleString()} 分（${MAX_TRANSFER_CENTS / 100} TWD）`,
      })
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
