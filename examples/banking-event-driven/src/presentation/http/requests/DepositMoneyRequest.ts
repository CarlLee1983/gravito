import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class DepositMoneyRequest extends FormRequest {
  schema = z.object({
    amountCents: z.number().int().positive(),
  })
}
