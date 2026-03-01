import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { DB } from '../../../src/DB'
import { Model } from '../../../src/orm/model/Model'
import { MonthlyPartitionStrategy } from '../../../src/partitioning/PartitionStrategy'

describe('Table Partitioning Strategy', () => {
  beforeAll(() => {
    DB.addConnection('default', {
      driver: 'sqlite',
      database: ':memory:',
    })
  })

  afterAll(async () => {
    await DB.disconnectAll()
  })

  it('should resolve table name correctly using partition method', () => {
    class ActivityLog extends Model {
      static table = 'activity_logs'
      static partitionStrategy = new MonthlyPartitionStrategy()
    }

    const testDate = new Date('2026-03-15T00:00:00Z')
    const queryBuilder = ActivityLog.partition(testDate)

    const compiled = queryBuilder.toSql()
    const sqlString = typeof compiled === 'string' ? compiled : compiled.sql
    expect(sqlString).toContain('activity_logs_202603')
  })

  it('should throw error if partitionStrategy is missing', () => {
    class MissingStrategyModel extends Model {
      static table = 'no_strategy'
    }

    expect(() => {
      MissingStrategyModel.partition(new Date())
    }).toThrow('Model MissingStrategyModel does not have a partitionStrategy defined')
  })

  it('should correctly hydrate models from partitioned table queries', async () => {
    class ActivityLog extends Model {
      static table = 'activity_logs'
      static partitionStrategy = new MonthlyPartitionStrategy()
    }

    // Create the physical partitioned table
    const dbConnection = DB.connection()
    await dbConnection.raw(`
      CREATE TABLE activity_logs_202603 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action VARCHAR(255)
      )
    `)

    await dbConnection.table('activity_logs_202603').insert({ action: 'login' })

    const testDate = new Date('2026-03-01T00:00:00Z')

    // Test partitioned get()
    const logs = await ActivityLog.partition(testDate).get()
    expect(logs.length).toBe(1)
    expect(logs[0]).toBeInstanceOf(ActivityLog)
    expect((logs[0] as any).action).toBe('login')
    expect((logs[0] as any).tableName).toBe('activity_logs_202603')

    // Test partitioned first()
    const singleLog = await ActivityLog.partition(testDate).where('action', 'login').first()
    expect(singleLog).toBeInstanceOf(ActivityLog)
    expect((singleLog as any).action).toBe('login')
    expect((singleLog as any).tableName).toBe('activity_logs_202603')
  })
})
