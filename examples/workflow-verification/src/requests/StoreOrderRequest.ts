import { FormRequest } from '@gravito/impulse'
import { BaseOrderSchema } from './schemas'

export class StoreOrderRequest extends FormRequest {
  // Use the base schema as is for creation (all fields required)
  schema = BaseOrderSchema

  async authorize(): Promise<boolean> {
    return true
  }
}
