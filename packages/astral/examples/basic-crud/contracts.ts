import { z } from 'zod'
import { CreateUserSchema, UpdateUserSchema, UserSchema } from './schemas'

// Define the contract
export const UserContract = {
  path: '/users',
  tags: ['Users'],
  operations: {
    index: {
      summary: 'List users',
      description: 'Retrieve a list of all registered users.',
      output: z.array(UserSchema),
    },
    show: {
      summary: 'Get user details',
      params: {
        id: z.string().uuid(),
      },
      output: UserSchema,
      errors: {
        404: 'User not found',
      },
    },
    store: {
      summary: 'Create user',
      input: CreateUserSchema,
      output: UserSchema,
      status: 201,
    },
    update: {
      summary: 'Update user',
      params: {
        id: z.string().uuid(),
      },
      input: UpdateUserSchema,
      output: UserSchema,
    },
    destroy: {
      summary: 'Delete user',
      params: {
        id: z.string().uuid(),
      },
      status: 204,
    },
  },
}
