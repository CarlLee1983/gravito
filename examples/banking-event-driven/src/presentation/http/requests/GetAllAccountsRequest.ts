import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class GetAllAccountsRequest extends FormRequest {
  source = 'query' as const

  schema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
}
