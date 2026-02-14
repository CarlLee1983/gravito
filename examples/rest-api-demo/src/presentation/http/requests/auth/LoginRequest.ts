/**
 * Login Form Request
 *
 * 用戶登入輸入驗證
 */

import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

export class LoginRequest {
  static schema() {
    return loginSchema
  }

  static validate(data: unknown): LoginInput {
    return loginSchema.parse(data)
  }

  static safeValidate(data: unknown): {
    success: boolean
    data?: LoginInput
    errors?: Record<string, string>
  } {
    const result = loginSchema.safeParse(data)

    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }

    return { success: true, data: result.data }
  }
}
