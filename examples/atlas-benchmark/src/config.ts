import { DB } from '@gravito/atlas'

export const CONFIG = {
  postgres: {
    driver: 'postgres' as const,
    host: process.env.DB_HOST_PG || 'localhost',
    port: Number.parseInt(process.env.DB_PORT_PG || '5432'),
    username: 'gravito',
    password: 'password',
    database: 'atlas_bench',
  },
  mysql: {
    driver: 'mysql' as const,
    host: process.env.DB_HOST_MYSQL || 'localhost',
    port: Number.parseInt(process.env.DB_PORT_MYSQL || '3306'),
    username: 'gravito',
    password: 'password',
    database: 'atlas_bench',
  },
  mariadb: {
    driver: 'mariadb' as const,
    host: process.env.DB_HOST_MARIA || 'localhost',
    port: Number.parseInt(process.env.DB_PORT_MARIA || '3306'),
    username: 'gravito',
    password: 'password',
    database: 'atlas_bench',
  },
  sqlite: {
    driver: 'sqlite' as const,
    database: ':memory:',
  },
}

export function setupDB(driver: keyof typeof CONFIG, useNative = false) {
  const config = { ...CONFIG[driver], useNativeDriver: useNative }
  DB.addConnection('default', config as any)
  DB.setDefaultConnection('default')
}
