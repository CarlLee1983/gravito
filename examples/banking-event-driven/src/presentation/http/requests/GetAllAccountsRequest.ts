import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * Validation schema for retrieving all accounts with pagination.
 */
export class GetAllAccountsRequest extends FormRequest {
  source = 'query' as const

  schema = z.object({
    /** Maximum number of records to return (1-100, default: 20). */
    limit: z.coerce.number().int().min(1).max(100).default(20),
    /** Number of records to skip (default: 0). */
    offset: z.coerce.number().int().min(0).default(0),
  })
}
