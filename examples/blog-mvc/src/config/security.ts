import type { SecurityHeadersOptions } from '@gravito/core'

export function getSecurityConfig(isDev: boolean): SecurityHeadersOptions {
  const devOrigin = 'http://localhost:5174'
  const devCsp = isDev ? ` ${devOrigin} ws://localhost:5174` : ''

  return {
    contentSecurityPolicy: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'${devCsp}`,
      `style-src 'self' 'unsafe-inline'${devCsp} https://fonts.googleapis.com`,
      `img-src 'self' data: https:${devCsp}`,
      `connect-src 'self'${devCsp}`,
      `font-src 'self' https://fonts.gstatic.com`,
      `frame-src 'self'${devCsp}`, // Allow iframes from self (for Dev Mailbox)
      "object-src 'none'",
    ].join('; '),
    frameOptions: 'SAMEORIGIN', // Allow iframes from same origin
  }
}
