import { DB } from '@gravito/atlas'

export const CONFIG = {
  postgres: {
    driver: 'postgres' as const,
    host: process.env.DB_HOST_PG || 'postgres',
    port: 5432,
    username: 'gravito',
    password: 'password',
    database: 'atlas_bench',
  },
  mysql: {
    driver: 'mysql' as const,
    host: process.env.DB_HOST_MYSQL || 'mysql',
    port: 3306,
    username: 'gravito',
    password: 'password',
    database: 'atlas_bench',
  },
  mariadb: {
    driver: 'mariadb' as const,
    host: process.env.DB_HOST_MARIA || 'mariadb',
    port: 3306,
    username: 'gravito',
    password: 'password',
    database: 'atlas_bench',
  },
  sqlite: {
    driver: 'sqlite' as const,
    database: ':memory:',
  }
}

export function setupDB(driver: keyof typeof CONFIG) {
  // @ts-ignore
  DB.addConnection('default', CONFIG[driver])
  DB.setDefaultConnection('default')
}
