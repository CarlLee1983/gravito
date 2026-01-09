import { describe, expect, it } from 'bun:test'
import { MySQLDriver } from '../src/drivers/MySQLDriver'
import { PostgresDriver } from '../src/drivers/PostgresDriver'
import {
  ForeignKeyConstraintError,
  NotNullConstraintError,
  TableNotFoundError,
  UniqueConstraintError,
} from '../src/errors'

function makeMySqlConfig() {
  return {
    driver: 'mysql' as const,
    database: 'testdb',
    username: 'root',
    password: 'secret',
    ssl: true,
  }
}

describe('MySQLDriver', () => {
  it('connects with pool configuration and executes queries', async () => {
    let poolConfig: any = null
    let ended = false
    let released = 0
    let lastParams: unknown[] | undefined

    const connection = {
      execute: async (_sql: string, params?: unknown[]) => {
        lastParams = params
        return [{ insertId: 5, affectedRows: 1 }, undefined]
      },
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {
        released += 1
      },
    }

    const pool = {
      getConnection: async () => connection,
      end: async () => {
        ended = true
      },
    }

    const driver = new MySQLDriver(makeMySqlConfig())
    ;(driver as any).loadMySQLModule = async () => ({
      createPool: (config: unknown) => {
        poolConfig = config
        return pool
      },
    })

    await driver.connect()
    expect(poolConfig).toMatchObject({
      host: 'localhost',
      port: 3306,
      database: 'testdb',
      user: 'root',
      password: 'secret',
      charset: 'utf8mb4',
    })
    expect(poolConfig.ssl).toEqual({})

    const date = new Date('2024-01-01T12:34:56.000Z')
    const result = await driver.query('insert into t values (?, ?)', [undefined, date])
    expect(result.rows[0]).toMatchObject({ id: 5 })
    expect(lastParams).toEqual([null, '2024-01-01 12:34:56'])

    const exec = await driver.execute('update t set name = ?', ['ok'])
    expect(exec.affectedRows).toBe(1)

    await driver.disconnect()
    expect(ended).toBe(true)
    expect(released).toBeGreaterThan(0)
  })

  it('handles transactions and error mapping', async () => {
    const connection = {
      execute: async () => [{ insertId: 1, affectedRows: 1 }, undefined],
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    }

    const pool = {
      getConnection: async () => connection,
      end: async () => {},
    }

    const driver = new MySQLDriver(makeMySqlConfig())
    ;(driver as any).loadMySQLModule = async () => ({
      createPool: () => pool,
    })

    await driver.beginTransaction()
    expect(driver.inTransaction()).toBe(true)

    await driver.commit()
    expect(driver.inTransaction()).toBe(false)

    await driver.beginTransaction()
    await driver.rollback()
    expect(driver.inTransaction()).toBe(false)

    await expect(driver.beginTransaction()).resolves.toBeUndefined()
    await expect(driver.beginTransaction()).rejects.toThrow('Transaction already in progress')

    connection.execute = async () => {
      throw { errno: 1062, message: 'duplicate' }
    }
    await expect(driver.query('select * from t')).rejects.toBeInstanceOf(UniqueConstraintError)
  })
})

describe('PostgresDriver', () => {
  it('connects, queries, and executes with pool config', async () => {
    let poolConfig: any = null
    let ended = false
    let released = 0

    const client = {
      query: async () => ({
        rows: [{ id: 9 }],
        rowCount: 1,
        fields: [{ name: 'id', dataTypeID: 23, tableID: 1 }],
      }),
      release: () => {
        released += 1
      },
    }

    class FakePool {
      constructor(config: unknown) {
        poolConfig = config
      }
      async connect() {
        return client
      }
      async end() {
        ended = true
      }
    }

    const driver = new PostgresDriver({
      driver: 'postgres',
      database: 'testdb',
      username: 'postgres',
      password: 'secret',
      applicationName: 'atlas',
    })
    ;(driver as any).loadPgModule = async () => ({ Pool: FakePool })

    await driver.connect()
    expect(poolConfig).toMatchObject({
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'postgres',
      password: 'secret',
      application_name: 'atlas',
    })

    const queryResult = await driver.query('select * from t', [undefined])
    expect(queryResult.rows[0]).toMatchObject({ id: 9 })

    const executeResult = await driver.execute('insert into t values (?)', [1])
    expect(executeResult.insertId).toBe(9)

    await driver.disconnect()
    expect(ended).toBe(true)
    expect(released).toBeGreaterThan(0)
  })

  it('supports transactions and error mapping', async () => {
    let lastStatement = ''
    const client = {
      query: async (sql: string) => {
        lastStatement = sql
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [], rowCount: 0 }
        }
        throw { code: '23503', message: 'fk fail' }
      },
      release: () => {},
    }

    class FakePool {
      async connect() {
        return client
      }
      async end() {}
    }

    const driver = new PostgresDriver({
      driver: 'postgres',
      database: 'testdb',
      username: 'postgres',
      password: 'secret',
    })
    ;(driver as any).loadPgModule = async () => ({ Pool: FakePool })

    await driver.beginTransaction()
    expect(driver.inTransaction()).toBe(true)
    expect(lastStatement).toBe('BEGIN')

    await driver.commit()
    expect(lastStatement).toBe('COMMIT')

    await driver.beginTransaction()
    await driver.rollback()
    expect(lastStatement).toBe('ROLLBACK')

    await expect(driver.query('select * from t')).rejects.toBeInstanceOf(ForeignKeyConstraintError)

    client.query = async () => {
      throw { code: '23502', message: 'null' }
    }
    await expect(driver.execute('update t set name = $1')).rejects.toBeInstanceOf(
      NotNullConstraintError
    )

    client.query = async () => {
      throw { code: '42P01', message: 'missing' }
    }
    await expect(driver.execute('delete from t')).rejects.toBeInstanceOf(TableNotFoundError)

    client.query = async () => {
      throw { code: '23505', message: 'duplicate' }
    }
    await expect(driver.execute('insert into t values (1)')).rejects.toBeInstanceOf(
      UniqueConstraintError
    )
  })
})
