import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { column, DB, deferred, Model, MonthlyPartitionStrategy, Schema } from '../../../src'

describe('Transparent Partitioning Routing', () => {
  beforeAll(async () => {
    DB.addConnection('default', {
      driver: 'sqlite',
      database: ':memory:',
    })
  })

  afterAll(async () => {
    await DB.disconnectAll()
  })

  class ActivityLog extends Model {
    static table = 'activity_logs'
    static partitionStrategy = new MonthlyPartitionStrategy()
    static partitionKey = 'createdAt'
    static partitionTemplate = (table: any) => {
      table.id()
      table.string('event')
      table.dateTime('createdAt')
    }

    @column({ isPrimary: true })
    declare id: number

    @column()
    declare event: string

    @column.dateTime()
    declare createdAt: Date
  }

  it('should automatically route save() to the correct partition', async () => {
    const log = ActivityLog.make({
      event: 'login',
      createdAt: new Date('2026-03-15T10:00:00Z'),
    })

    // This should trigger auto-provisioning of activity_logs_202603
    await log.save()

    expect(log.id).toBeDefined()

    // Verify it's in the correct physical table
    const db = DB.connection()
    const rows = await db.table('activity_logs_202603').get()
    expect(rows.length).toBe(1)
    expect(rows[0].event).toBe('login')
  })

  it('should automatically route query().where() to the correct partition', async () => {
    const testDate = new Date('2026-04-20T10:00:00Z')

    // Create data explicitly in a new partition
    await ActivityLog.partition(testDate).insert({
      event: 'logout',
      createdAt: testDate,
    })

    // Query WITHOUT calling .partition()
    const logs = await ActivityLog.query().where('createdAt', testDate).get()

    expect(logs.length).toBe(1)
    expect(logs[0].event).toBe('logout')
    expect((logs[0] as any).tableName).toBe('activity_logs_202604')
  })

  it('should support mixed horizontal and vertical partitioning transparently', async () => {
    class ComplexLog extends Model {
      static table = 'complex_logs'
      static extensionTable = 'complex_details'
      static partitionStrategy = new MonthlyPartitionStrategy()
      static partitionKey = 'createdAt'
      static partitionTemplate = (table: any) => {
        table.id()
        table.string('event')
        table.dateTime('createdAt')
      }

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare event: string

      @column.dateTime()
      declare createdAt: Date

      @deferred()
      declare payload: string
    }

    // Provision extension table (static for all partitions in this simplified design)
    await Schema.create('complex_details', (table) => {
      table.integer('id').primary()
      table.text('payload')
    })

    const testDate = new Date('2026-05-01T00:00:00Z')

    const log = ComplexLog.make({
      event: 'deep_event',
      createdAt: testDate,
      payload: 'very large data',
    })

    await log.save()

    // Query transparently
    const found = await ComplexLog.query().where('createdAt', testDate).withDeferred().first()

    expect(found).toBeDefined()
    expect((found as any).event).toBe('deep_event')
    expect((found as any).payload).toBe('very large data')
    expect((found as any).tableName).toBe('complex_logs_202605')
  })
})
