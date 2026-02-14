/**
 * Create Order Form Request
 *
 * 訂單建立輸入驗證
 */

import { z } from 'zod'

export const createOrderSchema = z.object({
  userId: z.string({ required_error: 'User ID is required' }).uuid('User ID must be a valid UUID'),

  items: z
    .array(
      z.object({
        productId: z
          .string({ required_error: 'Product ID is required' })
          .uuid('Product ID must be a valid UUID'),
        quantity: z
          .number({ invalid_type_error: 'Quantity must be a number' })
          .int('Quantity must be an integer')
          .positive('Quantity must be greater than 0'),
      })
    )
    .min(1, 'At least one item is required')
    .max(100, 'Cannot order more than 100 items'),

  shippingAddress: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name must not exceed 255 characters'),

    email: z.string({ required_error: 'Email is required' }).email('Invalid email format'),

    phone: z
      .string({ required_error: 'Phone is required' })
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),

    address: z
      .string({ required_error: 'Address is required' })
      .min(5, 'Address must be at least 5 characters')
      .max(500, 'Address must not exceed 500 characters'),

    city: z
      .string({ required_error: 'City is required' })
      .min(2, 'City must be at least 2 characters'),

    state: z
      .string({ required_error: 'State is required' })
      .min(2, 'State must be at least 2 characters'),

    postalCode: z
      .string({ required_error: 'Postal code is required' })
      .regex(/^[0-9]{5,10}$/, 'Invalid postal code format'),

    country: z
      .string({ required_error: 'Country is required' })
      .length(2, 'Country code must be 2 characters'),
  }),

  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export class CreateOrderRequest {
  static schema() {
    return createOrderSchema
  }

  static validate(data: unknown): CreateOrderInput {
    return createOrderSchema.parse(data)
  }

  static safeValidate(data: unknown): {
    success: boolean
    data?: CreateOrderInput
    errors?: Record<string, string>
  } {
    const result = createOrderSchema.safeParse(data)

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
