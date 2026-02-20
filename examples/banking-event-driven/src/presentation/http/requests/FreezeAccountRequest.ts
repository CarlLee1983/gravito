import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class FreezeAccountRequest extends FormRequest {
  schema = z.object({
    reason: z.string().optional(),
  })
}
