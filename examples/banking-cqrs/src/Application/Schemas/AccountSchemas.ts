/**
 * Account-related Zod Schemas
 *
 * Provides input validation for all account-related API endpoints.
 * Uses Zod for compile-time type safety and runtime validation.
 *
 * **Features:**
 * - Type inference via z.infer<>
 * - Custom error messages in Traditional Chinese
 * - Default values for optional fields
 * - Amount validation (positive, 2 decimal places)
 * - Currency code validation (3 characters, ISO 4217)
 *
 * @since 1.0.0
 */

import { z } from 'zod'

/**
 * Create Account Input
 *
 * Validates request body for POST /api/accounts
 */
export const createAccountSchema = z.object({
  ownerName: z.string().min(1, '帳戶名不能為空').max(100, '帳戶名不能超過 100 字元'),
  currency: z
    .string()
    .length(3, '貨幣代碼必須為 3 字元，例如 TWD、USD、JPY')
    .toUpperCase()
    .default('TWD'),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>

/**
 * Deposit Funds Input
 *
 * Validates request body for POST /api/accounts/:id/deposit
 */
export const depositSchema = z.object({
  amount: z
    .number()
    .positive('金額必須為正數')
    .multipleOf(0.01, '金額最多只能有兩位小數')
    .max(9999999.99, '金額不能超過 9,999,999.99'),
  currency: z.string().length(3, '貨幣代碼必須為 3 字元').toUpperCase().optional().default('TWD'),
})

export type DepositInput = z.infer<typeof depositSchema>

/**
 * Withdraw Funds Input
 *
 * Validates request body for POST /api/accounts/:id/withdraw
 */
export const withdrawSchema = z.object({
  amount: z.number().positive('提款金額必須為正數').multipleOf(0.01, '金額最多只能有兩位小數'),
  currency: z.string().length(3, '貨幣代碼必須為 3 字元').toUpperCase().optional().default('TWD'),
})

export type WithdrawInput = z.infer<typeof withdrawSchema>

/**
 * Transfer Funds Input
 *
 * Validates request body for POST /api/accounts/:id/transfer
 */
export const transferSchema = z.object({
  toAccountId: z.string().uuid('接收帳戶 ID 必須為有效的 UUID'),
  amount: z
    .number()
    .positive('轉帳金額必須為正數')
    .multipleOf(0.01, '金額最多只能有兩位小數')
    .max(100000, '單次轉帳不能超過 100,000 元'),
  currency: z.string().length(3, '貨幣代碼必須為 3 字元').toUpperCase().optional().default('TWD'),
})

export type TransferInput = z.infer<typeof transferSchema>

/**
 * Query Parameters for Transaction History
 *
 * Validates query parameters for GET /api/accounts/:id/transactions
 */
export const transactionHistoryParamsSchema = z.object({
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z.number().int('limit 必須為整數').min(1, 'limit 最小為 1').max(1000, 'limit 最大為 1000')
    )
    .optional()
    .default('10')
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val)),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int('offset 必須為整數').min(0, 'offset 最小為 0'))
    .optional()
    .default('0')
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val)),
})

export type TransactionHistoryParams = z.infer<typeof transactionHistoryParamsSchema>

/**
 * Safe Zod Parse with Error Handling
 *
 * Wraps Zod parse to throw user-friendly errors
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws Error with detailed validation messages
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      throw new Error(`輸入驗證失敗: ${messages.join('; ')}`)
    }
    throw err
  }
}
