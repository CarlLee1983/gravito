import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { DB } from '../src/DB'
import { SchemaSniffer } from '../src/orm/schema/SchemaSniffer'

const CONNECTION_NAME = `sniffer_${Math.random().toString(36).slice(2)}`
const NATIVE_CONNECTION = `native_sniffer_${Math.random().toString(36).slice(2)}`

describe('SchemaSniffer', () => {
  beforeAll(async () => {
    DB.addConnection(CONNECTION_NAME, {
      driver: 'sqlite',
      database: ':memory:',
      useNativeDriver: false,
    })

    DB.addConnection(NATIVE_CONNECTION, {
      driver: 'sqlite',
      database: ':memory:',
      useNativeDriver: true,
    })

    const sql = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        age INTEGER DEFAULT 18,
        created_at TIMESTAMP
      )
    `

    await DB.connection(CONNECTION_NAME).getDriver().execute(sql)
    await DB.connection(NATIVE_CONNECTION).getDriver().execute(sql)
  })

  afterAll(async () => {
    await DB.disconnect(CONNECTION_NAME)
    await DB.disconnect(NATIVE_CONNECTION)
  })

  it('should sniff table columns correctly (Standard Driver)', async () => {
    const sniffer = new SchemaSniffer(CONNECTION_NAME)
    const schema = await sniffer.sniff('users')

    expect(schema.table).toBe('users')
    expect(schema.primaryKey).toEqual(['id'])
    expect(schema.columns.get('id')?.type).toBe('integer')
  })

  it('should sniff table columns correctly (Native Driver)', async () => {
    const sniffer = new SchemaSniffer(NATIVE_CONNECTION)
    const schema = await sniffer.sniff('users')

    expect(schema.table).toBe('users')
    expect(schema.primaryKey).toEqual(['id'])
    expect(schema.columns.get('id')?.type).toBe('integer')
    expect(schema.columns.get('name')?.nullable).toBe(false)
  })
})
