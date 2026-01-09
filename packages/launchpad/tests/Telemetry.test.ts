import { describe, expect, it, mock } from 'bun:test'
import { MissionControl } from '../src/Application/MissionControl'
import { Mission } from '../src/Domain/Mission'

describe('MissionControl Telemetry', () => {
  it('發射時應該能正確啟動日誌串流與效能監控', async () => {
    const mockRocket = {
      id: 'r1',
      containerId: 'c1',
      status: 'PREPARING',
      assignDomain: mock(() => {}),
      assignMission: mock(() => {}),
      ignite: mock(() => {}),
    }

    const mockPool: any = {
      assignMission: mock(() => Promise.resolve(mockRocket)),
    }

    const mockInjector: any = {
      deploy: mock(() => Promise.resolve()),
    }

    const mockDocker: any = {
      getExposedPort: mock(() => Promise.resolve(3000)),
      streamLogs: mock((_id, cb) => {
        cb('hello world') // 模擬一條日誌
      }),
      getStats: mock(() => Promise.resolve({ cpu: '10%', memory: '100MB' })),
    }

    const ctrl = new MissionControl(mockPool, mockInjector, mockDocker)
    const telemetryLogs: any[] = []

    await ctrl.launch(
      Mission.create({ id: 'pr-1', repoUrl: 'url', branch: 'b', commitSha: 's' }),
      (type, data) => telemetryLogs.push({ type, data })
    )

    expect(mockPool.assignMission).toHaveBeenCalled()
    expect(mockInjector.deploy).toHaveBeenCalled()
    expect(mockDocker.streamLogs).toHaveBeenCalledWith('c1', expect.any(Function))

    // 驗證是否收到模擬日誌
    expect(telemetryLogs).toContainEqual({
      type: 'log',
      data: { rocketId: 'r1', text: 'hello world' },
    })
  })
})
