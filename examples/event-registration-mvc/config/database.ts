const config = {
  default: process.env.DB_CONNECTION || 'sqlite',
  connections: {
    sqlite: {
      driver: 'sqlite',
      database:
        process.env.DB_DATABASE || new URL('../database/database.sqlite', import.meta.url).pathname,
    },
    pgsql: {
      driver: 'pgsql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_DATABASE || 'event_registration',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
    },
  },
}

export default config
