import { describe, expect, jest, test } from 'bun:test'
import { DockerAdapter } from '../src/Infrastructure/Docker/DockerAdapter'

const makeStream = (text: string) => new Response(text).body as ReadableStream

function makeProcess(stdoutText: string, stderrText: string, exitCode = 0) {
  return {
    stdout: makeStream(stdoutText),
    stderr: makeStream(stderrText),
    exitCode,
    exited: Promise.resolve(exitCode),
  }
}

describe('DockerAdapter', () => {
  const createMockRuntime = () => ({
    spawn: jest.fn(),
    spawnAndCollect: jest.fn(),
  })

  test('creates base container when stdout has container id', async () => {
    const containerId = 'a'.repeat(64)
    const mockRuntime = createMockRuntime()
    mockRuntime.spawnAndCollect.mockResolvedValue({
      stdout: containerId,
      stderr: '',
      exitCode: 0,
      success: true,
      timedOut: false,
    })

    const adapter = new DockerAdapter(mockRuntime)
    const result = await adapter.createBaseContainer()
    expect(result).toBe(containerId)
  })

  test('returns container id even when exit code is zero but id is invalid', async () => {
    const mockRuntime = createMockRuntime()
    mockRuntime.spawnAndCollect.mockResolvedValue({
      stdout: 'short-id',
      stderr: '',
      exitCode: 0,
      success: true,
      timedOut: false,
    })

    const adapter = new DockerAdapter(mockRuntime)
    const result = await adapter.createBaseContainer()
    expect(result).toBe('short-id')
  })

  test('throws when container creation fails', async () => {
    const mockRuntime = createMockRuntime()
    mockRuntime.spawnAndCollect.mockResolvedValue({
      stdout: 'bad',
      stderr: 'boom',
      exitCode: 1,
      success: false,
      timedOut: false,
    })

    const adapter = new DockerAdapter(mockRuntime)
    await expect(adapter.createBaseContainer()).rejects.toThrow('boom')
  })

  test('getExposedPort parses the first line', async () => {
    const mockRuntime = createMockRuntime()
    mockRuntime.spawnAndCollect.mockResolvedValue({
      stdout: '0.0.0.0:32768\n[::]:32768\n',
      stderr: '',
      exitCode: 0,
      success: true,
      timedOut: false,
    })

    const adapter = new DockerAdapter(mockRuntime)
    const port = await adapter.getExposedPort('cid')
    expect(port).toBe(32768)
  })

  test('copyFiles throws on non-zero exit code', async () => {
    const mockRuntime = createMockRuntime()
    mockRuntime.spawn.mockReturnValue({
      exited: Promise.resolve(1),
      stderr: makeStream('copy failed'),
    })

    const adapter = new DockerAdapter(mockRuntime)
    await expect(adapter.copyFiles('cid', '/src', '/target')).rejects.toThrow('copy failed')
  })

  test('removeContainerByLabel removes containers when ids exist', async () => {
    const mockRuntime = createMockRuntime()
    const calls: any[][] = []
    mockRuntime.spawn.mockImplementation((args: string[]) => {
      calls.push(args)
      if (args[1] === 'ps') {
        return makeProcess('id-1\nid-2\n', '', 0)
      }
      return makeProcess('', '', 0)
    })

    const adapter = new DockerAdapter(mockRuntime)
    await adapter.removeContainerByLabel('gravito-origin=launchpad')
    const rmCall = calls.find((call) => call[1] === 'rm')
    expect(rmCall).toBeTruthy()
    expect(rmCall).toContain('id-1')
    expect(rmCall).toContain('id-2')
  })

  test('executeCommand returns stdout and stderr', async () => {
    const mockRuntime = createMockRuntime()
    mockRuntime.spawnAndCollect.mockResolvedValue({
      stdout: 'ok',
      stderr: 'warn',
      exitCode: 0,
      success: true,
      timedOut: false,
    })

    const adapter = new DockerAdapter(mockRuntime)
    const result = await adapter.executeCommand('cid', ['echo', 'ok'])
    expect(result.stdout).toBe('ok')
    expect(result.stderr).toBe('warn')
    expect(result.exitCode).toBe(0)
  })

  test('removeContainer executes docker rm', async () => {
    const mockRuntime = createMockRuntime()
    const calls: any[][] = []
    mockRuntime.spawn.mockImplementation((args: string[]) => {
      calls.push(args)
      return makeProcess('', '', 0)
    })

    const adapter = new DockerAdapter(mockRuntime)
    await adapter.removeContainer('cid-1')
    const rmCall = calls.find((call) => call[1] === 'rm')
    expect(rmCall).toBeTruthy()
    expect(rmCall).toContain('cid-1')
  })

  test('getStats parses cpu and memory output', async () => {
    const mockRuntime = createMockRuntime()
    mockRuntime.spawnAndCollect.mockResolvedValue({
      stdout: '12%,10MiB / 20MiB',
      stderr: '',
      exitCode: 0,
      success: true,
      timedOut: false,
    })

    const adapter = new DockerAdapter(mockRuntime)
    const stats = await adapter.getStats('cid')
    expect(stats.cpu).toBe('12%')
    expect(stats.memory).toBe('10MiB / 20MiB')
  })

  test('streamLogs forwards stdout and stderr', async () => {
    const mockRuntime = createMockRuntime()
    mockRuntime.spawn.mockReturnValue({
      stdout: makeStream('out'),
      stderr: makeStream('err'),
      exited: Promise.resolve(),
    })

    const adapter = new DockerAdapter(mockRuntime)
    const logs: string[] = []
    adapter.streamLogs('cid', (data) => logs.push(data))

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(logs.join('')).toContain('out')
    expect(logs.join('')).toContain('err')
  })
})
