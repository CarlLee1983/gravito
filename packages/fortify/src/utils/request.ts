import type { GravitoContext } from '@gravito/core'

export interface ClientInfo {
  ip: string
  userAgent: string
}

export function getClientInfo(context: GravitoContext): ClientInfo {
  const ip =
    context.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    context.req.header('x-real-ip') ||
    context.req.header('cf-connecting-ip') ||
    'unknown'

  const userAgent = context.req.header('user-agent') || 'unknown'

  return { ip, userAgent }
}
