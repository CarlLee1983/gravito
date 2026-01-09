import { describe, expect, test } from 'bun:test'
import { PayloadInjector } from '../src/Application/PayloadInjector'
import { Mission } from '../src/Domain/Mission'
import { Rocket } from '../src/Domain/Rocket'
import { RocketStatus } from '../src/Domain/RocketStatus'

class FakeGit {
  cloned: Array<{ repoUrl: string; branch: string }> = []
  async clone(repoUrl: string, branch: string): Promise<string> {
    this.cloned.push({ repoUrl, branch })
    return '/tmp/fake-repo'
  }
}

class FakeDocker {
  copyCalls: Array<{ containerId: string; source: string; target: string }> = []
  commands: string[][] = []

  async copyFiles(containerId: string, source: string, target: string): Promise<void> {
    this.copyCalls.push({ containerId, source, target })
  }

  async executeCommand(containerId: string, command: string[]) {
    this.commands.push([containerId, ...command])
    return { stdout: '', stderr: '', exitCode: 0 }
  }
}

describe('PayloadInjector', () => {
  test('throws when rocket has no mission', async () => {
    const docker = new FakeDocker()
    const git = new FakeGit()
    const injector = new PayloadInjector(docker as any, git as any)
    const rocket = new Rocket('rocket-9', 'container-9')

    await expect(injector.deploy(rocket)).rejects.toThrow('沒有指派任務')
  })

  test('deploys payload and ignites rocket', async () => {
    const docker = new FakeDocker()
    const git = new FakeGit()
    const injector = new PayloadInjector(docker as any, git as any)

    const rocket = new Rocket('rocket-10', 'container-10')
    const mission = Mission.create({
      id: 'mission-10',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'abc123',
    })
    rocket.assignMission(mission)

    await injector.deploy(rocket)

    expect(git.cloned[0]).toEqual({ repoUrl: mission.repoUrl, branch: mission.branch })
    expect(docker.copyCalls[0]).toEqual({
      containerId: rocket.containerId,
      source: '/tmp/fake-repo',
      target: '/app',
    })
    expect(docker.commands.length).toBeGreaterThanOrEqual(4)
    expect(rocket.status).toBe(RocketStatus.ORBITING)
  })

  test('throws when install fails', async () => {
    const git = new FakeGit()
    const docker = {
      copyCalls: [] as Array<{ containerId: string; source: string; target: string }>,
      commands: [] as string[][],
      async copyFiles(containerId: string, source: string, target: string) {
        this.copyCalls.push({ containerId, source, target })
      },
      async executeCommand(containerId: string, command: string[]) {
        this.commands.push([containerId, ...command])
        if (command[0] === 'bun' && command[1] === 'install') {
          return { stdout: '', stderr: 'boom', exitCode: 1 }
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    }

    const injector = new PayloadInjector(docker as any, git as any)
    const rocket = new Rocket('rocket-11', 'container-11')
    const mission = Mission.create({
      id: 'mission-11',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'abc999',
    })
    rocket.assignMission(mission)

    await expect(injector.deploy(rocket)).rejects.toThrow('安裝依賴失敗')
  })

  test('logs when run command fails but still ignites', async () => {
    const docker = {
      copyCalls: [] as Array<{ containerId: string; source: string; target: string }>,
      commands: [] as string[][],
      async copyFiles(containerId: string, source: string, target: string) {
        this.copyCalls.push({ containerId, source, target })
      },
      async executeCommand(containerId: string, command: string[]) {
        this.commands.push([containerId, ...command])
        if (command[0] === 'bun' && command[1] === 'run') {
          throw new Error('boom')
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    }
    const git = new FakeGit()
    const injector = new PayloadInjector(docker as any, git as any)
    const rocket = new Rocket('rocket-12', 'container-12')
    const mission = Mission.create({
      id: 'mission-12',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'abc888',
    })
    rocket.assignMission(mission)

    const originalError = console.error
    const errorCalls: string[] = []
    console.error = (...args: any[]) => {
      errorCalls.push(args.join(' '))
    }

    try {
      await injector.deploy(rocket)
      await new Promise((resolve) => setTimeout(resolve, 0))
    } finally {
      console.error = originalError
    }

    expect(errorCalls.join(' ')).toContain('運行異常')
    expect(rocket.status).toBe(RocketStatus.ORBITING)
  })
})
