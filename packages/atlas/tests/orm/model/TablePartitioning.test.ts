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

  it('should allow defining a partitionTemplate', () => {
    class TemplateModel extends Model {
      static table = 'templated_logs'
      static partitionTemplate = (table: any) => {
        table.id()
        table.string('message')
      }
    }

    expect(TemplateModel.partitionTemplate).toBeDefined()
    expect(typeof TemplateModel.partitionTemplate).toBe('function')
  })

  it('should auto-provision partition table on first write', async () => {
    class AutoLog extends Model {
      static table = 'auto_logs'
      static partitionStrategy = new MonthlyPartitionStrategy()
      static partitionTemplate = (table: any) => {
        table.id()
        table.string('event')
        table.timestamps()
      }
    }

    const testDate = new Date('2026-04-01T00:00:00Z')
    const tableName = 'auto_logs_202604'

    // Verify table does not exist
    const db = DB.connection()
    try {
      await db.raw(`SELECT * FROM ${tableName}`)
      expect().fail('Table should not exist yet')
    } catch (_e) {
      // Expected
    }

    // Perform insert - this should trigger auto-provisioning
    await AutoLog.partition(testDate).insert({ event: 'auto_provisioned' })

    // Verify table now exists and data is there
    const rows = await db.table(tableName).get()
    expect(rows.length).toBe(1)
    expect(rows[0].event).toBe('auto_provisioned')
  })

  it('should auto-provision partition table on first read (even if empty)', async () => {
    class AutoReadLog extends Model {
      static table = 'auto_read_logs'
      static partitionStrategy = new MonthlyPartitionStrategy()
      static partitionTemplate = (table: any) => {
        table.id()
        table.string('event')
      }
    }

    const testDate = new Date('2026-05-01T00:00:00Z')
    const tableName = 'auto_read_logs_202605'

    // Perform query - this should trigger auto-provisioning
    const logs = await AutoReadLog.partition(testDate).get()
    expect(logs.length).toBe(0)

    // Verify table now exists
    const db = DB.connection()
    const tableExists = await db.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    )
    expect(tableExists.rows.length).toBe(1)
  })

  it('should support cross-partition union queries', async () => {
    class MultiLog extends Model {
      static table = 'multi_logs'
      static partitionStrategy = new MonthlyPartitionStrategy()
      static partitionTemplate = (table: any) => {
        table.id()
        table.string('event')
      }
    }

    const jan = new Date('2026-01-01T00:00:00Z')
    const feb = new Date('2026-02-01T00:00:00Z')

    // Provision tables and data
    await MultiLog.partition(jan).insert({ event: 'event_jan' })
    await MultiLog.partition(feb).insert({ event: 'event_feb' })

    // Query both partitions using array
    const logs = await MultiLog.partition([jan, feb]).orderBy('event', 'asc').get()

    expect(logs.length).toBe(2)
    expect(logs[0].event).toBe('event_feb') // because 'f' > 'e'? wait, asc: jan then feb.
    expect(logs[0].event).toBe('event_feb') // oh, 'feb' vs 'jan'
    expect(logs[1].event).toBe('event_jan')
    // Wait, 'event_feb' < 'event_jan'? No, 'f' comes after 'e'.
    // 'event_feb' vs 'event_jan'. 'f' is char code 102, 'j' is 106. So feb should be first in ASC. Correct.
  })

  it('should support union queries with bindings', async () => {
    class BindingsLog extends Model {
      static table = 'bindings_logs'
      static partitionStrategy = new MonthlyPartitionStrategy()
      static partitionTemplate = (table: any) => {
        table.id()
        table.string('event')
        table.integer('level')
      }
    }

    const jan = new Date('2026-01-01T00:00:00Z')
    const feb = new Date('2026-02-01T00:00:00Z')

    await BindingsLog.partition(jan).insert([
      { event: 'e1', level: 10 },
      { event: 'e2', level: 20 },
    ])
    await BindingsLog.partition(feb).insert([
      { event: 'e3', level: 30 },
      { event: 'e4', level: 40 },
    ])

    const q1 = BindingsLog.partition(jan).where('level', '>', 15)
    const q2 = BindingsLog.partition(feb).where('level', '<', 35)

    const logs = await q1.unionAll(q2).orderBy('level', 'asc').get()

    expect(logs.length).toBe(2)
    expect(logs[0].level).toBe(20) // from jan
    expect(logs[1].level).toBe(30) // from feb
  })

  it('should auto-provision multiple tables in a union query', async () => {
    class MultiAutoLog extends Model {
      static table = 'multi_auto'
      static partitionStrategy = new MonthlyPartitionStrategy()
      static partitionTemplate = (table: any) => {
        table.id()
        table.string('event')
      }
    }

    const march = new Date('2026-03-01T00:00:00Z')
    const april = new Date('2026-04-01T00:00:00Z')

    // Both tables do not exist
    const logs = await MultiAutoLog.partition([march, april]).get()
    expect(logs.length).toBe(0)

    // Verify both exist
    const db = DB.connection()
    const tables = await db.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('multi_auto_202603', 'multi_auto_202604')"
    )
    expect(tables.rows.length).toBe(2)
  })
})
