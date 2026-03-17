import { describe, expect, it, mock } from 'bun:test'
import { BatchUpdateBuilder } from '../../src/utils/BatchUpdateBuilder'

describe('BatchUpdateBuilder', () => {
  it('rejects unsafe table names', () => {
    const connection = {
      raw: mock(async () => ({ rowCount: 0 })),
    }

    expect(() => new BatchUpdateBuilder(connection as any, 'users; DROP TABLE audit')).toThrow(
      /Invalid table name/
    )
  })

  it('rejects unsafe column names in where clauses', () => {
    const connection = {
      raw: mock(async () => ({ rowCount: 0 })),
    }

    const builder = new BatchUpdateBuilder(connection as any, 'users')
    expect(() => builder.where('email; DELETE FROM users', '=', 'a@example.com')).toThrow(
      /Invalid column name/
    )
  })

  it('rejects unsafe operators', () => {
    const connection = {
      raw: mock(async () => ({ rowCount: 0 })),
    }

    const builder = new BatchUpdateBuilder(connection as any, 'users')
    expect(() => builder.where('email', 'IS NULL; DROP TABLE users', null)).toThrow(
      /Invalid operator/
    )
  })

  it('builds parameterized update queries with validated identifiers', async () => {
    const connection = {
      raw: mock(async () => ({ rowCount: 2 })),
    }

    const builder = new BatchUpdateBuilder(connection as any, 'users')
    builder.where('status', '=', 'pending')

    const result = await builder.update({ status: 'active', updated_at: '2026-03-17' })

    expect(connection.raw).toHaveBeenCalledWith(
      'UPDATE users SET status = $1, updated_at = $2 WHERE status = $3',
      ['active', '2026-03-17', 'pending']
    )
    expect(result.affectedRows).toBe(2)
  })
})
