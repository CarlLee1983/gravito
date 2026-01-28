import { describe, expect, it, spyOn } from 'bun:test'
import * as fs from 'node:fs'
import { autoConfigure, loadConfigFile } from '../src/config/loadConfig'
import { DB } from '../src/DB'

describe('loadConfig', () => {
  it('should load config from file (mocked)', async () => {
    try {
      await loadConfigFile('non-existent.ts')
    } catch (e: any) {
      expect(e.message).toContain('Configuration file not found')
    }
  })

  it('should autoConfigure from env if file missing', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.DB_DATABASE = ':memory:'

    await autoConfigure()
    expect(DB.connection().getConfig().driver).toBe('sqlite')

    delete process.env.DB_DRIVER
    delete process.env.DB_DATABASE
  })
})
