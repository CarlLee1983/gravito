import { describe, expect, mock, test } from 'bun:test'
import { MissionControl } from '../src/Application/MissionControl'
import { Mission } from '../src/Domain/Mission'

function createRocket() {
  return {
    id: 'rocket-telemetry',
    containerId: 'container-telemetry',
    status: 'ORBITING',
    assignDomain: mock(() => {}),
  }
}

describe('MissionControl timers', () => {
  test('emits stats and schedules recycle', async () => {
    const rocket = createRocket()
    const mission = Mission.create({
      id: 'mission-telemetry',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'abc',
    })

    const poolManager = {
      assignMission: async () => rocket,
      recycle: mock(async () => {}),
    }
    const injector = {
      deploy: mock(async () => {}),
    }
    const docker = {
      streamLogs: mock(() => {}),
      getStats: mock(async () => ({ cpu: '5%', memory: '10MB' })),
      getExposedPort: mock(async () => 3000),
    }

    const originalSetInterval = global.setInterval
    const originalSetTimeout = global.setTimeout
    const originalClearInterval = global.clearInterval

    let intervalFn: (() => Promise<void>) | null = null
    const clearIntervalMock = mock(() => {})
    let timeoutPromise: Promise<void> | null = null

    global.setInterval = ((fn: () => Promise<void>) => {
      intervalFn = fn
      return 123 as any
    }) as any

    global.clearInterval = clearIntervalMock as any

    global.setTimeout = ((fn: () => Promise<void>) => {
      timeoutPromise = Promise.resolve(fn())
      return 456 as any
    }) as any

    const mc = new MissionControl(poolManager as any, injector as any, docker as any)
    const onTelemetry = mock(() => {})

    try {
      await mc.launch(mission, onTelemetry)

      expect(intervalFn).not.toBeNull()
      await intervalFn?.()
      expect(docker.getStats).toHaveBeenCalledWith(rocket.containerId)

      rocket.status = 'IDLE'
      await intervalFn?.()
      expect(clearIntervalMock).toHaveBeenCalled()

      await timeoutPromise
      expect(poolManager.recycle).toHaveBeenCalledWith('mission-telemetry')
    } finally {
      global.setInterval = originalSetInterval
      global.setTimeout = originalSetTimeout
      global.clearInterval = originalClearInterval
    }
  })
})
