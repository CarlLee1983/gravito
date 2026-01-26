import { describe, expect, it, jest } from 'bun:test'
import { FluxEngine } from '../src/engine/FluxEngine'
import { OrbitFlux } from '../src/orbit/OrbitFlux'

describe('OrbitFlux Integration', () => {
  it('should initialize correctly with default options', async () => {
    const orbit = new OrbitFlux()
    const instances = new Map<string, any>()
    const mockCore = {
      container: {
        instance: (key: string, val: any) => instances.set(key, val),
        make: (key: string) => instances.get(key),
      },
      hooks: { doAction: () => {} },
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    }

    await orbit.install(mockCore as any)
    const engine = orbit.getEngine()
    expect(engine).toBeInstanceOf(FluxEngine)
    expect(instances.get('flux')).toBe(engine)
  })

  it('should handle storage initialization failure', async () => {
    const orbit = new OrbitFlux({
      storage: 'sqlite',
      dbPath: '/invalid/path/database.db',
    })

    const mockCore = {
      container: { instance: () => {}, make: () => {} },
      hooks: { doAction: () => {} },
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: jest.fn(),
      },
    }

    try {
      await orbit.install(mockCore as any)
    } catch {}
  })

  it('should cleanup on shutdown', async () => {
    const orbit = new OrbitFlux()
    const mockCore = {
      container: { instance: () => {}, make: () => {} },
      hooks: { doAction: () => {} },
      logger: { info: () => {} },
    }
    await orbit.install(mockCore as any)

    const engine = orbit.getEngine()
    const closeSpy = jest.spyOn(engine as any, 'close')

    await orbit.cleanup()
    expect(closeSpy).toHaveBeenCalled()
  })
})
