import { z } from '@gravito/impulse'

/**
 * Base Order Schema
 * Shared validation rules for Order domain
 */
export const BaseOrderSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  email: z.string().email(),
  paymentToken: z.string().min(1),
})

export type OrderSchema = z.infer<typeof BaseOrderSchema>
