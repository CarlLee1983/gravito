import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for freezing an account.
 */
export class FreezeAccountRequest extends FormRequest {
  schema = z.object({
    /** Optional reason for freezing the account. */
    reason: z.string().optional(),
  })
}
