import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class OpenAccountRequest extends FormRequest {
  schema = z.object({
    ownerId: z.string().uuid(),
    ownerName: z.string().min(2),
    currency: z.string().length(3).default('TWD'),
    initialDepositCents: z.number().int().min(0).default(0),
  })
}
