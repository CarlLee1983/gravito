import { describe, expect, it } from 'bun:test'
import { defineConfig, fromEnv } from '../src/config/defineConfig'

describe('defineConfig', () => {
  it('should return the config object', () => {
    const config = {
      default: 'postgres',
      connections: {
        postgres: {
          driver: 'postgres' as const,
          host: 'localhost',
          database: 'test',
        },
      },
    }
    expect(defineConfig(config)).toEqual(config)
  })
})

describe('fromEnv', () => {
  it('should load config from environment variables', () => {
    process.env.DB_CONNECTION = 'mysql'
    process.env.DB_HOST = '127.0.0.1'
    process.env.DB_PORT = '3306'
    process.env.DB_DATABASE = 'atlas_test'
    process.env.DB_USERNAME = 'root'
    process.env.DB_PASSWORD = 'password'

    const config = fromEnv('mysql')
    const conn = config.connections.mysql as any
    expect(config.default).toBe('mysql')
    expect(conn.host).toBe('127.0.0.1')
    expect(conn.port).toBe(3306)
    expect(conn.database).toBe('atlas_test')

    delete process.env.DB_CONNECTION
    delete process.env.DB_HOST
    delete process.env.DB_PORT
    delete process.env.DB_DATABASE
    delete process.env.DB_USERNAME
    delete process.env.DB_PASSWORD
  })

  it('should support custom prefix', () => {
    process.env.MYAPP_DB_DRIVER = 'postgres'
    const config = fromEnv('postgres', 'MYAPP')
    expect(config.connections.postgres.driver).toBe('postgres')
    delete process.env.MYAPP_DB_DRIVER
  })

  it('should load from DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dbname'
    const config = fromEnv('db')
    expect(config.connections.db.driver).toBe('postgres')
    expect(config.connections.db.database).toBe('dbname')
    delete process.env.DATABASE_URL
  })
})
