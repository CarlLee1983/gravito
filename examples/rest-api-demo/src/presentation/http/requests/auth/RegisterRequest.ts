/**
 * Register Form Request
 *
 * 用戶註冊輸入驗證
 */

import { z } from 'zod'

export const registerSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email format')
      .toLowerCase()
      .trim(),

    name: z
      .string({ required_error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name must not exceed 255 characters')
      .trim(),

    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),

    password_confirmation: z.string({
      required_error: 'Password confirmation is required',
    }),

    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export class RegisterRequest {
  static schema() {
    return registerSchema
  }

  static validate(data: unknown): RegisterInput {
    return registerSchema.parse(data)
  }

  static safeValidate(data: unknown): {
    success: boolean
    data?: RegisterInput
    errors?: Record<string, string>
  } {
    const result = registerSchema.safeParse(data)

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
