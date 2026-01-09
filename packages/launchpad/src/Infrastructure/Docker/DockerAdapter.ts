import { getRuntimeAdapter } from '@gravito/core'
import type { IDockerAdapter } from '../../Domain/Interfaces'

export class DockerAdapter implements IDockerAdapter {
  private baseImage = 'oven/bun:1.0-slim'
  private runtime = getRuntimeAdapter()

  async createBaseContainer(): Promise<string> {
    const rocketId = `rocket-${Math.random().toString(36).substring(2, 9)}`

    const proc = this.runtime.spawn([
      'docker',
      'run',
      '-d',
      '--name',
      rocketId,
      '--label',
      'gravito-origin=launchpad',
      '-p',
      '3000', // 讓 Docker 分配隨機宿主機埠
      '-v',
      `${process.env.HOME}/.bun/install/cache:/root/.bun/install/cache`,
      '-v',
      `${process.env.HOME}/.bun/install/cache:/home/bun/.bun/install/cache`,
      this.baseImage,
      'tail',
      '-f',
      '/dev/null',
    ])

    const stdout = await new Response(proc.stdout ?? null).text()
    const containerId = stdout.trim()
    const exitCode = await proc.exited

    if (containerId.length === 64 && /^[0-9a-f]+$/.test(containerId)) {
      return containerId
    }

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr ?? null).text()
      throw new Error(`Docker 容器建立失敗: ${stderr || stdout}`)
    }

    return containerId
  }

  async getExposedPort(containerId: string, containerPort = 3000): Promise<number> {
    const proc = this.runtime.spawn(['docker', 'port', containerId, containerPort.toString()])
    const stdout = await new Response(proc.stdout ?? null).text()
    // 輸出格式可能包含多行，如 0.0.0.0:32768 和 [::]:32768
    // 我們取第一行並提取端口
    const firstLine = stdout.split('\n')[0] ?? ''
    if (!firstLine) {
      throw new Error(`無法獲取容器映射端口: ${stdout}`)
    }
    const match = firstLine.match(/:(\d+)$/)
    if (!match?.[1]) {
      throw new Error(`無法獲取容器映射端口: ${stdout}`)
    }
    return Number.parseInt(match[1], 10)
  }

  async copyFiles(containerId: string, sourcePath: string, targetPath: string): Promise<void> {
    const proc = this.runtime.spawn(['docker', 'cp', sourcePath, `${containerId}:${targetPath}`])
    const exitCode = await proc.exited
    if (exitCode && exitCode !== 0) {
      const stderr = await new Response(proc.stderr ?? null).text()
      throw new Error(stderr || 'Docker copy failed')
    }
  }

  async executeCommand(
    containerId: string,
    command: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = this.runtime.spawn(['docker', 'exec', '-u', '0', containerId, ...command])
    const stdout = await new Response(proc.stdout ?? null).text()
    const stderr = await new Response(proc.stderr ?? null).text()
    const exitCode = await proc.exited
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
    const proc = this.runtime.spawn([
      'docker',
      'stats',
      containerId,
      '--no-stream',
      '--format',
      '{{.CPUPerc}},{{.MemUsage}}',
    ])
    const stdout = await new Response(proc.stdout ?? null).text()
    const [cpu, memory] = stdout.trim().split(',')
    return { cpu: cpu || '0%', memory: memory || '0B / 0B' }
  }
}
