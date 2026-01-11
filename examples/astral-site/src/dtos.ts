import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

/**
 * User Response DTO
 */
export const UserDTO = z.object({
  id: z.number(),
  name: z.string().describe('The full name of the user'),
  email: z.string().email(),
  createdAt: z.string().datetime(),
})

/**
 * Create User Request
 */
export class CreateUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(2).describe('Name must be at least 2 chars'),
    email: z.string().email(),
  })
}
