import { describe, expect, test } from 'bun:test'
import { Rocket } from '../src/Domain/Rocket'
import { RocketStatus } from '../src/Domain/RocketStatus'
import { InMemoryRocketRepository } from '../src/Infrastructure/Persistence/InMemoryRocketRepository'

describe('InMemoryRocketRepository', () => {
  test('stores and retrieves rockets', async () => {
    const repo = new InMemoryRocketRepository()
    const rocket = new Rocket('rocket-20', 'container-20')

    await repo.save(rocket)
    expect(await repo.findById('rocket-20')).toBe(rocket)
    expect((await repo.findAll()).length).toBe(1)

    await repo.delete('rocket-20')
    expect(await repo.findById('rocket-20')).toBeNull()
  })

  test('finds idle rockets', async () => {
    const repo = new InMemoryRocketRepository()
    const idle = new Rocket('rocket-idle', 'container-idle')
    const busy = new Rocket('rocket-busy', 'container-busy')
    busy.assignMission({ id: 'mission', repoUrl: '', branch: '', commitSha: '' } as any)

    await repo.save(idle)
    await repo.save(busy)

    const found = await repo.findIdle()
    expect(found?.status).toBe(RocketStatus.IDLE)
  })
})
