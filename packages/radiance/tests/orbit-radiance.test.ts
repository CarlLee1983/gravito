import { describe, expect, it, mock } from 'bun:test'
import { BroadcastManager } from '../src/BroadcastManager'
import { OrbitRadiance } from '../src/OrbitRadiance'

const createCore = () => {
  const instances = new Map<string, unknown>()
  const core = {
    container: {
      make: (key: string) => instances.get(key),
      instance: (key: string, instance: unknown) => instances.set(key, instance),
    },
    events: {
      setBroadcastManager: mock(() => {}),
    },
    logger: {
      info: mock(() => {}),
    },
  }
  return { core, instances }
}

describe('OrbitRadiance', () => {
  it('configures and installs drivers', async () => {
    const { core, instances } = createCore()
    const orbit = OrbitRadiance.configure({
      driver: 'websocket',
      config: { getConnections: () => [] },
    })

    await orbit.install(core as any)

    expect(instances.get('broadcast')).toBeInstanceOf(BroadcastManager)
    expect(core.events.setBroadcastManager).toHaveBeenCalled()
  })

  it('injects redis client when available', async () => {
    const { core, instances } = createCore()
    const publish = mock(async () => 1)
    instances.set('redis', { publish })

    const orbit = new OrbitRadiance({
      driver: 'redis',
      config: {},
    })

    await orbit.install(core as any)
    expect(instances.get('broadcast')).toBeInstanceOf(BroadcastManager)
  })

  it('throws on unsupported driver', async () => {
    const { core } = createCore()
    const orbit = new OrbitRadiance({
      driver: 'pusher' as any,
      config: {} as any,
    })

    ;(orbit as any).options.driver = 'unknown' as any
    await expect(orbit.install(core as any)).rejects.toThrow('Unsupported broadcast driver')
  })
})
