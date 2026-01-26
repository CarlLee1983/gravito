import { z } from 'zod'

export const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
})

export const TokenSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number(),
})

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
})

export const AuthContract = {
  path: '/auth',
  tags: ['Authentication'],
  operations: {
    login: {
      summary: 'User Login',
      description: 'Authenticate user and return an access token.',
      input: LoginSchema,
      output: TokenSchema,
      status: 200,
      examples: {
        request: {
          'demo-user': {
            summary: 'Demo User Credentials',
            value: { username: 'demo', password: 'password123' },
          },
        },
      },
    },
    me: {
      summary: 'Get Current User Profile',
      description: 'Retrieve the profile of the currently authenticated user.',
      security: [{ BearerAuth: [] }],
      output: UserProfileSchema,
      errors: {
        401: 'Unauthorized - Invalid or missing token',
      },
    },
  },
}
