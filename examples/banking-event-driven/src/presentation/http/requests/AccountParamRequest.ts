import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for requests containing an account ID in the URL parameters.
 */
export class AccountParamRequest extends FormRequest {
  source = 'param' as const

  schema = z.object({
    /** The unique ID of the account, must be a valid UUID. */
    id: z.string().uuid(),
  })
}
