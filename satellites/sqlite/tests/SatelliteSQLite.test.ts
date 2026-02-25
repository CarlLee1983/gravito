import { describe, expect, it } from 'bun:test'
import { SatelliteSQLite } from '../src/SatelliteSQLite'
import { SQLiteService } from '../src/services/SQLiteService'

describe('SatelliteSQLite', () => {
  it('should create satellite instance', () => {
    const satellite = SatelliteSQLite.configure({
      dbPath: '/app/data/test.db',
    })
    expect(satellite).toBeDefined()
    expect(satellite.name).toBe('satellite:sqlite')
  })

  it('should install and expose service', async () => {
    const satellite = SatelliteSQLite.configure({
      dbPath: '/app/data/test.db',
    })
    const ctx = {}

    await satellite.install(ctx)

    expect((ctx as any).sqlite).toBeInstanceOf(SQLiteService)
  })

  it('should use custom expose key', async () => {
    const satellite = SatelliteSQLite.configure({
      dbPath: '/app/data/test.db',
      exposeAs: 'db',
    })
    const ctx = {}

    await satellite.install(ctx)

    expect((ctx as any).db).toBeInstanceOf(SQLiteService)
    expect((ctx as any).sqlite).toBeUndefined()
  })

  it('should cleanup on uninstall', async () => {
    const satellite = SatelliteSQLite.configure({
      dbPath: '/app/data/test.db',
    })
    const ctx = {}

    await satellite.install(ctx)
    expect(satellite.getService()).not.toBeNull()

    await satellite.uninstall()
    expect(satellite.getService()).toBeNull()
  })

  it('should validate database path', async () => {
    const satellite = SatelliteSQLite.configure({
      dbPath: '/app/data/test.db',
      xenonConfig: {
        allowedPaths: ['/app/data/**'],
      },
    })
    const ctx = {}

    await satellite.install(ctx)
    const service = (ctx as any).sqlite as SQLiteService
    expect(service).toBeDefined()
  })

  it('should configure xenon security', async () => {
    const satellite = SatelliteSQLite.configure({
      dbPath: '/app/data/test.db',
      xenonConfig: {
        allowedPaths: ['/app/data/**'],
        blockedPaths: ['/etc/**'],
      },
    })
    const ctx = {}

    await satellite.install(ctx)
    const service = (ctx as any).sqlite as SQLiteService
    const config = service.getConfig()
    expect(config.dbPath).toBe('/app/data/test.db')
  })
})
