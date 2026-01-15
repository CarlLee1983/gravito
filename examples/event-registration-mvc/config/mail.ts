export default {
  default: process.env.MAIL_MAILER || 'smtp',
  mailers: {
    smtp: {
      transport: 'smtp',
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT || '1025', 10),
      encryption: process.env.MAIL_ENCRYPTION || null,
      username: process.env.MAIL_USERNAME || null,
      password: process.env.MAIL_PASSWORD || null,
    },
    log: {
      transport: 'log',
    },
  },
  from: {
    address: process.env.MAIL_FROM_ADDRESS || 'noreply@event-registration.local',
    name: process.env.MAIL_FROM_NAME || process.env.APP_NAME || 'Event Registration System',
  },
}
