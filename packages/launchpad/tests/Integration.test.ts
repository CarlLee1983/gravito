import { afterAll, describe, expect, it } from 'bun:test'
import { PoolManager } from '../src/Application/PoolManager'
import { DockerAdapter } from '../src/Infrastructure/Docker/DockerAdapter'
import { InMemoryRocketRepository } from '../src/Infrastructure/Persistence/InMemoryRocketRepository'

describe('LaunchPad 集成測試 (真實 Docker)', () => {
  const docker = new DockerAdapter()
  const repo = new InMemoryRocketRepository()
  const manager = new PoolManager(docker, repo)

  afterAll(async () => {
    // 清理測試建立的容器
    const rockets = await repo.findAll()
    for (const rocket of rockets) {
      await docker.removeContainer(rocket.containerId)
    }
  })

  it('應該能成功熱機並在容器內執行指令', { timeout: 20_000 }, async () => {
    try {
      // 1. Warmup
      await manager.warmup(1)
      const rockets = await repo.findAll()
      expect(rockets.length).toBe(1)

      const rocket = rockets[0]
      expect(rocket.containerId).toBeDefined()

      // 2. 測試指令執行
      const result = await docker.executeCommand(rocket.containerId, ['bun', '--version'])
      console.log(`[Test] 容器內 Bun 版本: ${result.stdout.trim()}`)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('1.') // 應該是 1.x 版本
    } catch (e: any) {
      if (e.message.includes('docker') || e.message.includes('ENOENT')) {
        console.warn('⚠️  跳過測試：本地環境未偵測到 Docker Daemon')
        return
      }
      throw e
    }
  })
})
