export default {
  name: process.env.APP_NAME || 'Event Registration System',
  env: process.env.APP_ENV || 'development',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL || 'http://localhost:3000',
  port: parseInt(process.env.APP_PORT || '3000', 10),
  key: process.env.APP_KEY || '',
}
