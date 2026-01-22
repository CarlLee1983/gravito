import { z } from 'zod'

// Define a standardized error response schema
const ApiErrorSchema = z.object({
  code: z.string().describe('Internal error code'),
  message: z.string().describe('Human readable error message'),
  details: z.record(z.any()).optional().describe('Additional error context'),
  timestamp: z.string().datetime(),
})

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
})

export const RiskyResourceContract = {
  path: '/risky-items',
  tags: ['Error Handling Demo'],
  operations: {
    show: {
      summary: 'Get item with potential errors',
      params: {
        id: z.string().min(1),
      },
      output: ItemSchema,
      errors: {
        // Simple string description for standard HTTP errors
        404: 'Item not found in the database',

        // Complex schema for business logic errors
        403: ApiErrorSchema,

        // Another complex schema for validation errors
        422: z.object({
          errors: z.array(
            z.object({
              field: z.string(),
              message: z.string(),
            })
          ),
        }),

        // Critical system error
        500: z.object({
          fatal: z.boolean(),
          requestId: z.string(),
        }),
      },
    },
  },
}
