import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for initiating a fund transfer between accounts.
 */
export class InitiateTransferRequest extends FormRequest {
  schema = z.object({
    /** The source account ID to debit. Must be a valid UUID. */
    fromAccountId: z.string().uuid(),
    /** The recipient account ID to credit. Must be a valid UUID. */
    toAccountId: z.string().uuid(),
    /** The transfer amount in cents. Must be a positive integer. */
    amountCents: z.number().int().positive(),
  })
}
