export default {
  csrf: {
    enabled: true,
    tokenLength: 32,
    cookieName: 'XSRF-TOKEN',
    headerName: 'X-XSRF-TOKEN',
  },
  cors: {
    enabled: true,
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  },
  session: {
    driver: process.env.SESSION_DRIVER || 'cookie',
    lifetime: parseInt(process.env.SESSION_LIFETIME || '120', 10),
    cookieName: 'event_registration_session',
    secure: process.env.APP_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
}
