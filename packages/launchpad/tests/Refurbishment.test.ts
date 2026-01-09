import { describe, expect, it, mock } from 'bun:test'
import { RefurbishUnit } from '../src/Application/RefurbishUnit'
import { Mission } from '../src/Domain/Mission'
import { Rocket } from '../src/Domain/Rocket'
import { RocketStatus } from '../src/Domain/RocketStatus'

describe('RefurbishUnit (Rocket Recovery)', () => {
  it('應該能執行深度清理並將火箭重置為 IDLE', async () => {
    // 1. Setup
    const mockDocker: any = {
      executeCommand: mock(() => Promise.resolve({ exitCode: 0, stdout: '', stderr: '' })),
    }
    const unit = new RefurbishUnit(mockDocker)
    const rocket = new Rocket('r1', 'c1')

    // 模擬火箭正在運行
    rocket.assignMission(Mission.create({ id: 'pr-1', repoUrl: 'u', branch: 'b', commitSha: 's' }))
    rocket.ignite()
    expect(rocket.status).toBe(RocketStatus.ORBITING)

    // 2. Execute Refurbish
    await unit.refurbish(rocket)

    // 3. Verify
    expect(mockDocker.executeCommand).toHaveBeenCalled()
    expect(rocket.status).toBe(RocketStatus.IDLE)
    expect(rocket.currentMission).toBeNull()
  })

  it('如果清理失敗應該將火箭除役', async () => {
    const mockDocker: any = {
      executeCommand: mock(() => Promise.resolve({ exitCode: 1, stdout: '', stderr: 'Disk Full' })),
    }
    const unit = new RefurbishUnit(mockDocker)
    const rocket = new Rocket('r2', 'c2')
    rocket.assignMission(Mission.create({ id: 'pr-2', repoUrl: 'u', branch: 'b', commitSha: 's' }))
    rocket.ignite()

    await unit.refurbish(rocket)

    expect(rocket.status).toBe(RocketStatus.DECOMMISSIONED)
  })
})
