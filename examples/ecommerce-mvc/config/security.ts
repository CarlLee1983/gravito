/**
 * Security Configuration
 */

export const securityConfig = {
  csp: {
    default: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    enabled: process.env.APP_CSP !== 'false',
  },
  hsts: {
    maxAge: Number.parseInt(process.env.APP_HSTS_MAX_AGE ?? '15552000', 10),
    includeSubDomains: true,
    enabled: process.env.NODE_ENV === 'production',
  },
  bodyLimit: {
    maxSize: Number.parseInt(process.env.APP_BODY_LIMIT ?? '1048576', 10),
    requireContentLength: process.env.APP_BODY_REQUIRE_LENGTH === 'true',
  },
}
