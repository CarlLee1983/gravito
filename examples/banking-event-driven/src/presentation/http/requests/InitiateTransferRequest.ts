import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class InitiateTransferRequest extends FormRequest {
  schema = z.object({
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
    amountCents: z.number().int().positive(),
  })
}
