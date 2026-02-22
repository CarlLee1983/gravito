import { z } from 'zod'

export const RegisterRequest = z.object({
  name: z.string().min(1, '名稱是必須的'),
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string().min(6, '密碼至少需要 6 個字符'),
  passwordConfirmation: z.string(),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: '密碼不相符',
  path: ['passwordConfirmation'],
})

export type RegisterRequest = z.infer<typeof RegisterRequest>
