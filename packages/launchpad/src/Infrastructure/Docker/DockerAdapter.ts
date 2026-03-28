import { getRuntimeAdapter } from '@gravito/core'
import { Shell } from '@gravito/nova'
import { LaunchpadError } from '../../errors/LaunchpadError'
import { LaunchpadErrorCodes } from '../../errors/codes'
import type { IDockerAdapter } from '../../Domain/Interfaces'

/**
 * DockerAdapter implements the `IDockerAdapter` interface using the Docker CLI.
 *
 * It manages the lifecycle of Docker containers used as "Rockets" in Launchpad,
 * including creation, command execution, file copying, and metrics collection.
 *
 * @public
 * @since 3.0.0
 */
export class DockerAdapter implements IDockerAdapter {
  private baseImage = 'oven/bun:1.0-slim'
  private runtime: any

  constructor(runtime?: any) {
    this.runtime = runtime || getRuntimeAdapter()
  }

  // 快取目錄配置
  private readonly cacheConfig = {
    hostCachePath: process.env.BUN_CACHE_PATH || `${process.env.HOME}/.bun/install/cache`,
    containerCachePathRoot: '/root/.bun/install/cache',
    containerCachePathBun: '/home/bun/.bun/install/cache',
  }

  async createBaseContainer(): Promise<string> {
    const rocketId = `rocket-${crypto.randomUUID()}`

    // 確保宿主機快取目錄存在
    await this.ensureCacheDirectory()

    const { stdout, stderr, exitCode } = await this.runtime.spawnAndCollect([
      'docker',
      'run',
      '-d',
      '--name',
      rocketId,
      '--label',
      'gravito-origin=launchpad',
      '-p',
      '3000', // 讓 Docker 分配隨機宿主機埠
      // === 快取掛載（關鍵） ===
      '-v',
      `${this.cacheConfig.hostCachePath}:${this.cacheConfig.containerCachePathRoot}:rw`,
      '-v',
      `${this.cacheConfig.hostCachePath}:${this.cacheConfig.containerCachePathBun}:rw`,
      // === 環境變數配置（確保 bun 使用快取） ===
      '-e',
      `BUN_INSTALL_CACHE_DIR=${this.cacheConfig.containerCachePathBun}`,
      '-e',
      'BUN_INSTALL_CACHE=shared',
      '-e',
      'BUN_INSTALL_PREFER_OFFLINE=true',
      // === 效能相關環境變數 ===
      '-e',
      'NODE_ENV=development',
      // === 資源限制（防止單一容器占用過多資源） ===
      '--memory',
      '1g',
      '--memory-swap',
      '1g',
      '--cpus',
      '1.0',
      // === 安全設定 ===
      '--security-opt',
      'no-new-privileges:true',
      '--cap-drop',
      'ALL',
      '--cap-add',
      'CHOWN',
      '--cap-add',
      'SETUID',
      '--cap-add',
      'SETGID',
      this.baseImage,
      'tail',
      '-f',
      '/dev/null',
    ])

    const containerId = stdout.trim()

    if (containerId.length === 64 && /^[0-9a-f]+$/.test(containerId)) {
      // 驗證快取是否正確掛載
      await this.verifyCacheMount(containerId)
      return containerId
    }

    if (exitCode !== 0) {
      throw new LaunchpadError(500, LaunchpadErrorCodes.DOCKER_BUILD_FAILED, {
        message: `Docker 容器建立失敗: ${stderr || stdout}`,
      })
    }

    return containerId
  }

  /**
   * 確保快取目錄存在
   *
   * @private
   * @since 1.3.0
   */
  private async ensureCacheDirectory(): Promise<void> {
    const cachePath = this.cacheConfig.hostCachePath

    // 使用 nova Shell API 進行目錄操作（類型安全、shell 注射防護）
    await Shell.run`mkdir -p ${cachePath}`.nothrow().run()
    await Shell.run`chmod 777 ${cachePath}`.nothrow().run()
  }

  /**
   * 驗證快取是否正確掛載
   *
   * @private
   * @since 1.3.0
   */
  private async verifyCacheMount(containerId: string): Promise<void> {
    const result = await this.executeCommand(containerId, [
      'sh',
      '-c',
      `ls -la ${this.cacheConfig.containerCachePathBun} 2>/dev/null || echo 'NOT_MOUNTED'`,
    ])

    if (result.stdout.includes('NOT_MOUNTED')) {
      console.warn(`[DockerAdapter] 警告: 容器 ${containerId} 的快取目錄可能未正確掛載`)
    } else {
      console.log(`[DockerAdapter] 快取目錄已確認掛載: ${containerId}`)
    }
  }

  async getExposedPort(containerId: string, containerPort = 3000): Promise<number> {
    const { stdout } = await this.runtime.spawnAndCollect([
      'docker',
      'port',
      containerId,
      containerPort.toString(),
    ])
    // 輸出格式可能包含多行，如 0.0.0.0:32768 和 [::]:32768
    // 我們取第一行並提取端口
    const firstLine = stdout.split('\n')[0] ?? ''
    if (!firstLine) {
      throw new LaunchpadError(500, LaunchpadErrorCodes.DOCKER_PORT_MAPPING_FAILED, {
        message: `無法獲取容器映射端口: ${stdout}`,
      })
    }
    const match = firstLine.match(/:(\d+)$/)
    if (!match?.[1]) {
      throw new LaunchpadError(500, LaunchpadErrorCodes.DOCKER_PORT_MAPPING_FAILED, {
        message: `無法獲取容器映射端口: ${stdout}`,
      })
    }
    return Number.parseInt(match[1], 10)
  }

  async copyFiles(containerId: string, sourcePath: string, targetPath: string): Promise<void> {
    const proc = this.runtime.spawn(['docker', 'cp', sourcePath, `${containerId}:${targetPath}`])
    const exitCode = await proc.exited
    if (exitCode && exitCode !== 0) {
      const stderr = await new Response(proc.stderr ?? null).text()
      throw new LaunchpadError(500, LaunchpadErrorCodes.DOCKER_COPY_FAILED, {
        message: stderr || 'Docker copy failed',
      })
    }
  }

  async executeCommand(
    containerId: string,
    command: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const { stdout, stderr, exitCode } = await this.runtime.spawnAndCollect([
      'docker',
      'exec',
      '-u',
      '0',
      containerId,
      ...command,
    ])
    return { stdout, stderr, exitCode }
  }

  async removeContainer(containerId: string): Promise<void> {
    await this.runtime.spawn(['docker', 'rm', '-f', containerId]).exited
  }

  async removeContainerByLabel(label: string): Promise<void> {
    const listProc = this.runtime.spawn(['docker', 'ps', '-aq', '--filter', `label=${label}`])
    const ids = await new Response(listProc.stdout ?? null).text()

    if (ids.trim()) {
      const idList = ids.trim().split('\n')
      await this.runtime.spawn(['docker', 'rm', '-f', ...idList]).exited
    }
  }

  streamLogs(containerId: string, onData: (data: string) => void): void {
    const proc = this.runtime.spawn(['docker', 'logs', '-f', containerId], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const read = async (stream?: ReadableStream | null) => {
      if (!stream) {
        return
      }
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        onData(decoder.decode(value))
      }
    }
    read(proc.stdout)
    read(proc.stderr)
  }

  async getStats(containerId: string): Promise<{ cpu: string; memory: string }> {
    const { stdout } = await this.runtime.spawnAndCollect([
      'docker',
      'stats',
      containerId,
      '--no-stream',
      '--format',
      '{{.CPUPerc}},{{.MemUsage}}',
    ])
    const [cpu, memory] = stdout.trim().split(',')
    return { cpu: cpu || '0%', memory: memory || '0B / 0B' }
  }
}
