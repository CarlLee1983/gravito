import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for requests containing a transfer ID in the URL parameters.
 */
export class TransferParamRequest extends FormRequest {
  source = 'param' as const

  schema = z.object({
    /** The unique ID of the transfer, must be a valid UUID. */
    id: z.string().uuid(),
  })
}
