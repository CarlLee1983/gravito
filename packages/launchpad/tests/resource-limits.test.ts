import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { MissionQueue, PoolExhaustedException } from '../src/Application/MissionQueue'
import { PoolManager } from '../src/Application/PoolManager'
import { Mission } from '../src/Domain/Mission'
import type { Rocket } from '../src/Domain/Rocket'
import { RocketStatus } from '../src/Domain/RocketStatus'

describe('MissionQueue', () => {
  let queue: MissionQueue

  beforeEach(() => {
    queue = new MissionQueue(3, 1000)
  })

  test('should enqueue missions and track length', () => {
    const mission = Mission.create({
      id: 'pr-1',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc123',
    })

    const promise = queue.enqueue(mission)
    expect(queue.length).toBe(1)
    expect(promise).toBeInstanceOf(Promise)
  })

  test('should reject when queue is full', async () => {
    for (let i = 0; i < 3; i++) {
      queue.enqueue(
        Mission.create({
          id: `pr-${i}`,
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          commitSha: 'abc123',
        })
      )
    }

    const mission = Mission.create({
      id: 'pr-4',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc123',
    })

    await expect(queue.enqueue(mission)).rejects.toThrow(PoolExhaustedException)
  })

  test('should dequeue in FIFO order', () => {
    const m1 = Mission.create({
      id: 'pr-1',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc123',
    })
    const m2 = Mission.create({
      id: 'pr-2',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc123',
    })

    queue.enqueue(m1)
    queue.enqueue(m2)

    const first = queue.dequeue()
    expect(first?.mission.id).toBe('pr-1')

    const second = queue.dequeue()
    expect(second?.mission.id).toBe('pr-2')

    const empty = queue.dequeue()
    expect(empty).toBeNull()
  })

  test('should provide stats', async () => {
    queue.enqueue(
      Mission.create({
        id: 'pr-1',
        repoUrl: 'https://github.com/test/repo',
        branch: 'main',
        commitSha: 'abc123',
      })
    )

    // 等待一點時間讓時間戳有差異
    await new Promise((resolve) => setTimeout(resolve, 10))

    const stats = queue.getStats()
    expect(stats.length).toBe(1)
    expect(stats.maxSize).toBe(3)
    expect(stats.oldestWaitMs).toBeGreaterThanOrEqual(0)
  })
})

describe('PoolManager Resource Limits', () => {
  let mockDocker: any
  let mockRepo: any
  let rockets: Rocket[]

  beforeEach(() => {
    rockets = []
    mockDocker = {
      createBaseContainer: mock(() => Promise.resolve(`container-${Date.now()}`)),
      removeContainer: mock(() => Promise.resolve()),
      executeCommand: mock(() => Promise.resolve({ exitCode: 0, stdout: '', stderr: '' })),
      getExposedPort: mock(() => Promise.resolve(3000)),
      removeContainerByLabel: mock(() => Promise.resolve()),
      streamLogs: mock(() => {}),
      getStats: mock(() => Promise.resolve({ cpu: '0%', memory: '0MB' })),
    }
    mockRepo = {
      save: mock((r: Rocket) => {
        const index = rockets.findIndex((rocket) => rocket.id === r.id)
        if (index >= 0) {
          rockets[index] = r
        } else {
          rockets.push(r)
        }
        return Promise.resolve()
      }),
      findAll: mock(() => Promise.resolve(rockets)),
      findIdle: mock(() =>
        Promise.resolve(rockets.find((r) => r.status === RocketStatus.IDLE) || null)
      ),
      findById: mock((id: string) => Promise.resolve(rockets.find((r) => r.id === id) || null)),
      delete: mock(() => Promise.resolve()),
    }
  })

  test('should reject when maxRockets reached with reject strategy', async () => {
    const manager = new PoolManager(mockDocker, mockRepo, undefined, undefined, {
      maxRockets: 2,
      exhaustionStrategy: 'reject',
      warmupCount: 2,
    })

    await manager.warmup()
    expect(rockets.length).toBe(2)

    // 使用全部火箭
    const m1 = Mission.create({
      id: 'pr-1',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc1',
    })
    const m2 = Mission.create({
      id: 'pr-2',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc2',
    })

    await manager.assignMission(m1)
    await manager.assignMission(m2)

    // 第三個請求應該被拒絕
    const m3 = Mission.create({
      id: 'pr-3',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc3',
    })

    await expect(manager.assignMission(m3)).rejects.toThrow(PoolExhaustedException)
  })

  test('should respect maxRockets limit', async () => {
    const manager = new PoolManager(mockDocker, mockRepo, undefined, undefined, {
      maxRockets: 5,
      warmupCount: 3,
    })

    await manager.warmup()

    const status = await manager.getPoolStatus()
    expect(status.total).toBe(3)
    expect(status.idle).toBe(3)
    expect(status.maxRockets).toBe(5)
  })

  test('should queue missions when pool is exhausted', async () => {
    const manager = new PoolManager(mockDocker, mockRepo, undefined, undefined, {
      maxRockets: 1,
      exhaustionStrategy: 'queue',
      queueTimeoutMs: 5000,
      warmupCount: 1,
    })

    await manager.warmup()

    const m1 = Mission.create({
      id: 'pr-1',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc1',
    })

    const rocket1 = await manager.assignMission(m1)
    expect(rocket1.status).toBe(RocketStatus.PREPARING)

    // 第二個任務應該進入隊列
    const m2 = Mission.create({
      id: 'pr-2',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      commitSha: 'abc2',
    })

    const promise = manager.assignMission(m2)

    // 等待 promise 開始處理
    await new Promise((resolve) => setTimeout(resolve, 10))

    const stats = manager.getQueueStats()
    expect(stats.length).toBe(1)

    // 模擬回收
    rocket1.ignite()
    await manager.recycle('pr-1')

    const rocket2 = await promise
    expect(rocket2.currentMission?.id).toBe('pr-2')
  })
})
