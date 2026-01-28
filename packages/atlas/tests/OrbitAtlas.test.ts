import { describe, expect, it, mock } from 'bun:test'
import { DB } from '../src/DB'
import { OrbitAtlas } from '../src/OrbitAtlas'

describe('OrbitAtlas', () => {
  it('should install and configure DB', async () => {
    const orbit = new OrbitAtlas()
    const mockCore = {
      config: {
        get: mock(() => ({
          default: 'test',
          connections: {
            test: {
              driver: 'sqlite',
              database: ':memory:',
            },
          },
        })),
      },
      logger: {
        info: mock(),
        warn: mock(),
      },
    }

    await orbit.install(mockCore as any)

    expect(mockCore.config.get).toHaveBeenCalledWith('database')
    expect(mockCore.logger.info).toHaveBeenCalledWith('[OrbitAtlas] Database configured.')
    expect(DB.connection('test').getConfig().driver).toBe('sqlite')
  })

  it('should warn if no config found', async () => {
    const orbit = new OrbitAtlas()
    const mockCore = {
      config: {
        get: mock(() => null),
      },
      logger: {
        warn: mock(),
        info: mock(),
      },
    }

    await orbit.install(mockCore as any)

    expect(mockCore.logger.warn).toHaveBeenCalledWith(
      '[OrbitAtlas] No database configuration found.'
    )
  })
})
