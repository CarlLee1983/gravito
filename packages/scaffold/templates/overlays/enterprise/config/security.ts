import { defineConfig } from '@gravito/core/security'

export default defineConfig({
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;",
  },
  cors: {
    allowed_methods: ['*'],
    allowed_origins: ['*'], // Configure this in production
    allowed_headers: ['*'],
    exposed_headers: [],
    max_age: 0,
    supports_credentials: false,
  },
})
