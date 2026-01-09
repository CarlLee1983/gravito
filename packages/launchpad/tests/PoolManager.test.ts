import { describe, expect, it, mock } from 'bun:test'
import { PoolManager } from '../src/Application/PoolManager'
import { Mission } from '../src/Domain/Mission'
import { RocketStatus } from '../src/Domain/RocketStatus'

describe('PoolManager (Application Service)', () => {
  // Mock Docker Adapter
  const mockDocker: any = {
    createBaseContainer: mock(() => Promise.resolve('container-id-123')),
    removeContainer: mock(() => Promise.resolve()),
  }

  // Simple In-memory Repository Mock
  const rockets: any[] = []
  const mockRepo: any = {
    save: mock((r) => {
      const idx = rockets.findIndex((x) => x.id === r.id)
      if (idx >= 0) {
        rockets[idx] = r
      } else {
        rockets.push(r)
      }
      return Promise.resolve()
    }),
    findAll: mock(() => Promise.resolve(rockets)),
    findIdle: mock(() =>
      Promise.resolve(rockets.find((r) => r.status === RocketStatus.IDLE) || null)
    ),
  }

  const manager = new PoolManager(mockDocker, mockRepo)

  it('應該能正確熱機並指派任務', async () => {
    // Warmup
    await manager.warmup(2)
    expect(rockets.length).toBe(2)
    expect(mockDocker.createBaseContainer).toHaveBeenCalledTimes(2)

    // Assign Mission
    const mission = Mission.create({
      id: 'pr-1',
      repoUrl: 'url',
      branch: 'b',
      commitSha: 's',
    })

    const assignedRocket = await manager.assignMission(mission)
    expect(assignedRocket.status).toBe(RocketStatus.PREPARING)
    expect(assignedRocket.currentMission?.id).toBe('pr-1')

    // Ignite before recycle (Must be ORBITING to splashDown)
    assignedRocket.ignite()
    expect(assignedRocket.status).toBe(RocketStatus.ORBITING)

    // Recycle
    await manager.recycle('pr-1')
    expect(assignedRocket.status).toBe(RocketStatus.IDLE)
    expect(assignedRocket.currentMission).toBeNull()
  })
})
