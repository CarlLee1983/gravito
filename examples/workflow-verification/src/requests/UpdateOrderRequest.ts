import { FormRequest } from '@gravito/impulse'
import { BaseOrderSchema } from './schemas'

export class UpdateOrderRequest extends FormRequest {
  /**
   * For updates:
   * 1. Reuse BaseOrderSchema
   * 2. Make all fields optional (.partial())
   * 3. Omit fields that cannot be updated (e.g. productId, paymentToken)
   */
  schema = BaseOrderSchema.pick({
    quantity: true,
    email: true,
  }).partial()

  async authorize(): Promise<boolean> {
    return true
  }
}
