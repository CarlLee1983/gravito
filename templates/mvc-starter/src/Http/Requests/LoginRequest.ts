import { z } from 'zod'

export const LoginRequest = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string().min(6, '密碼至少需要 6 個字符'),
})

export type LoginRequest = z.infer<typeof LoginRequest>
