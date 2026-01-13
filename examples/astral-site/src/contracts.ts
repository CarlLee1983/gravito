import { astral } from '@gravito/astral'
import { CreateUserRequest, UserDTO } from './dtos'

export const UserContract = astral.resource('/api/users', {
  tags: ['User Management'],
  operations: {
    index: {
      summary: 'List all users',
      output: [UserDTO],
    },
    store: {
      summary: 'Create a new user',
      input: CreateUserRequest,
      output: UserDTO,
    },
  },
})
