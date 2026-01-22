import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  createdAt: z.string().datetime(),
})

export const CreateUserSchema = UserSchema.pick({
  name: true,
  email: true,
  role: true,
})

export const UpdateUserSchema = CreateUserSchema.partial()
