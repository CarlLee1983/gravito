import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for depositing money into an account.
 */
export class DepositMoneyRequest extends FormRequest {
  schema = z.object({
    /** The amount to deposit in cents. Must be a positive integer. */
    amountCents: z.number().int().positive(),
  })
}
