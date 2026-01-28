import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { DB } from '../src/DB'
import { SchemaSniffer } from '../src/orm/schema/SchemaSniffer'

const CONNECTION_NAME = `sniffer_${Math.random().toString(36).slice(2)}`

describe('SchemaSniffer', () => {
  beforeAll(async () => {
    DB.addConnection(CONNECTION_NAME, {
      driver: 'sqlite',
      database: ':memory:',
    })
    await DB.connection(CONNECTION_NAME)
      .getDriver()
      .execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        age INTEGER DEFAULT 18,
        created_at TIMESTAMP
      )
    `)
  })

  afterAll(async () => {
    await DB.disconnect(CONNECTION_NAME)
  })

  it('should sniff table columns correctly', async () => {
    const sniffer = new SchemaSniffer(CONNECTION_NAME)
    const schema = await sniffer.sniff('users')

    expect(schema.table).toBe('users')
    expect(schema.primaryKey).toEqual(['id'])

    const id = schema.columns.get('id')
    expect(id?.type).toBe('integer')
    expect(id?.primary).toBe(true)
    expect(id?.autoIncrement).toBe(true)

    const name = schema.columns.get('name')
    expect(name?.type).toBe('string')
    expect(name?.nullable).toBe(false)

    const email = schema.columns.get('email')
    expect(email?.unique).toBe(true)

    const age = schema.columns.get('age')
    expect(age?.default).toBe('18')
  })
})
