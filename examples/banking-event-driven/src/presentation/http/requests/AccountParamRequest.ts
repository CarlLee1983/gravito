import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class AccountParamRequest extends FormRequest {
  source = 'param' as const

  schema = z.object({
    id: z.string().uuid(),
  })
}
