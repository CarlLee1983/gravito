import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for retrieving transaction history with pagination.
 */
export class GetTransactionHistoryRequest extends FormRequest {
  source = 'query' as const

  schema = z.object({
    /** Maximum number of history records to return (1-100, default: 20). */
    limit: z.coerce.number().int().min(1).max(100).default(20),
    /** Number of history records to skip (default: 0). */
    offset: z.coerce.number().int().min(0).default(0),
  })
}
