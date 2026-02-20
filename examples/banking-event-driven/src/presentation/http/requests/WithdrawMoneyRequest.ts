import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for withdrawing funds from an account.
 */
export class WithdrawMoneyRequest extends FormRequest {
  schema = z.object({
    /** The amount to withdraw in cents. Must be a positive integer. */
    amountCents: z.number().int().positive(),
  })
}
