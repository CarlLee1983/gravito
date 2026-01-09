import { describe, expect, it, mock } from 'bun:test'
import { PayloadInjector } from '../src/Application/PayloadInjector'
import { PoolManager } from '../src/Application/PoolManager'
import { Mission } from '../src/Domain/Mission'
import { RocketStatus } from '../src/Domain/RocketStatus'

describe('Payload Injection Flow', () => {
  // Mocks
  const mockDocker: any = {
    createBaseContainer: mock(() => Promise.resolve('cid-1')),
    copyFiles: mock(() => Promise.resolve()),
    executeCommand: mock(() => Promise.resolve({ exitCode: 0, stdout: '', stderr: '' })),
    removeContainer: mock(() => Promise.resolve()),
  }

  const mockGit: any = {
    clone: mock(() => Promise.resolve('/tmp/mock-code')),
  }

  const mockRepo: any = {
    save: mock(() => Promise.resolve()),
    findIdle: mock(() => Promise.resolve(null)), // Force create
    findAll: mock(() => Promise.resolve([])),
  }

  const pool = new PoolManager(mockDocker, mockRepo)
  const injector = new PayloadInjector(mockDocker, mockGit)

  it('應該能從指派任務到成功點火', async () => {
    // 1. Assign
    const mission = Mission.create({
      id: 'pr-2',
      repoUrl: 'http://git',
      branch: 'dev',
      commitSha: 'sha',
    })
    const rocket = await pool.assignMission(mission)

    expect(rocket.status).toBe(RocketStatus.PREPARING)

    // 2. Deploy
    await injector.deploy(rocket)

    expect(mockGit.clone).toHaveBeenCalled()
    expect(mockDocker.copyFiles).toHaveBeenCalled()
    expect(mockDocker.executeCommand).toHaveBeenCalled() // bun install

    expect(rocket.status).toBe(RocketStatus.ORBITING)
  })
})
