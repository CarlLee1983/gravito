import { describe, expect, it, mock } from 'bun:test'
import { BroadcastManager } from '../src/BroadcastManager'
import { OrbitRadiance } from '../src/OrbitRadiance'

const createCore = () => {
  const services = new Map<string, unknown>()
  const core = {
    services,
    events: {
      setBroadcastManager: mock(() => {}),
    },
    logger: {
      info: mock(() => {}),
    },
  }
  return core
}

describe('OrbitRadiance', () => {
  it('configures and installs drivers', async () => {
    const core = createCore()
    const orbit = OrbitRadiance.configure({
      driver: 'websocket',
      config: { getConnections: () => [] },
    })

    await orbit.install(core as any)

    expect(core.services.get('broadcast')).toBeInstanceOf(BroadcastManager)
    expect(core.events.setBroadcastManager).toHaveBeenCalled()
  })

  it('injects redis client when available', async () => {
    const core = createCore()
    const publish = mock(async () => 1)
    core.services.set('redis', { publish })

    const orbit = new OrbitRadiance({
      driver: 'redis',
      config: {},
    })

    await orbit.install(core as any)
    expect(core.services.get('broadcast')).toBeInstanceOf(BroadcastManager)
  })

  it('throws on unsupported driver', async () => {
    const core = createCore()
    const orbit = new OrbitRadiance({
      driver: 'pusher' as any,
      config: {} as any,
    })

    orbit.options.driver = 'unknown' as any
    await expect(orbit.install(core as any)).rejects.toThrow('Unsupported broadcast driver')
  })
})
