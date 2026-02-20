import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for opening a new bank account.
 */
export class OpenAccountRequest extends FormRequest {
  schema = z.object({
    /** Unique identifier for the account owner. */
    ownerId: z.string().uuid(),
    /** Display name of the owner (min 2 characters). */
    ownerName: z.string().min(2),
    /** Account currency code (3 letters, default: TWD). */
    currency: z.string().length(3).default('TWD'),
    /** Initial starting balance in cents (default: 0). */
    initialDepositCents: z.number().int().min(0).default(0),
  })
}
