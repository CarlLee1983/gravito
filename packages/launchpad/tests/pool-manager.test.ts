import { describe, expect, test } from 'bun:test'
import { PoolManager } from '../src/Application/PoolManager'
import { Mission } from '../src/Domain/Mission'
import { RocketStatus } from '../src/Domain/RocketStatus'
import { InMemoryRocketRepository } from '../src/Infrastructure/Persistence/InMemoryRocketRepository'

class FakeDocker {
  created = 0
  async createBaseContainer(): Promise<string> {
    this.created += 1
    return `container-${this.created}`
  }
}

class FakeRefurbishUnit {
  calls = 0
  async refurbish(rocket: { splashDown: () => void; finishRefurbishment: () => void }) {
    this.calls += 1
    rocket.splashDown()
    rocket.finishRefurbishment()
  }
}

describe('PoolManager', () => {
  test('warms up the pool with base containers', async () => {
    const docker = new FakeDocker()
    const repo = new InMemoryRocketRepository()
    const pool = new PoolManager(docker as any, repo)

    await pool.warmup(2)
    const rockets = await repo.findAll()
    expect(rockets.length).toBe(2)
    expect(docker.created).toBe(2)

    await pool.warmup(1)
    expect((await repo.findAll()).length).toBe(2)
  })

  test('assigns missions to idle rockets or creates new ones', async () => {
    const docker = new FakeDocker()
    const repo = new InMemoryRocketRepository()
    const pool = new PoolManager(docker as any, repo)

    const mission = Mission.create({
      id: 'mission-2',
      repoUrl: 'https://example.com/repo.git',
      branch: 'dev',
      commitSha: 'def456',
    })

    await pool.warmup(1)
    const rocket = await pool.assignMission(mission)
    expect(rocket.status).toBe(RocketStatus.PREPARING)
    expect(docker.created).toBe(1)

    const repoRocket = await repo.findById(rocket.id)
    expect(repoRocket?.currentMission?.id).toBe('mission-2')

    const missionTwo = Mission.create({
      id: 'mission-3',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: '7890',
    })

    const newRocket = await pool.assignMission(missionTwo)
    expect(newRocket.id).not.toBe(rocket.id)
    expect(docker.created).toBe(2)
  })

  test('recycles rockets through refurbish flow', async () => {
    const docker = new FakeDocker()
    const repo = new InMemoryRocketRepository()
    const refurbishUnit = new FakeRefurbishUnit()
    const pool = new PoolManager(docker as any, repo, refurbishUnit as any)

    await pool.warmup(1)
    const mission = Mission.create({
      id: 'mission-4',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'abcd',
    })

    const rocket = await pool.assignMission(mission)
    rocket.ignite()

    await pool.recycle('mission-4')
    const stored = await repo.findById(rocket.id)
    expect(stored?.status).toBe(RocketStatus.IDLE)
    expect(refurbishUnit.calls).toBe(1)
  })
})
