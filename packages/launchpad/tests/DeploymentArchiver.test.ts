/**
 * @fileoverview DeploymentArchiver 測試
 *
 * 測試案例：
 * T1: backupDeployment - 正常備份（列出容器檔案、讀取內容、打包）
 * T2: restoreDeployment - 正常還原（讀取歸檔、提取到臨時目錄、複製回容器）
 * T3: packageRelease - 排除 node_modules
 */

import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test'
import { DeploymentArchiver } from '../src/Application/DeploymentArchiver'

// ============ Mock 設定 ============

const mockArchiveCreate = jest.fn(async (_entries: Record<string, unknown>) => {
  return new TextEncoder().encode('mock-archive')
})

const mockArchiveExtract = jest.fn(async () => 5)

const mockWriteFile = jest.fn().mockResolvedValue(undefined)
const mockReadFile = jest.fn(async (filePath: string): Promise<Uint8Array> => {
  if (filePath.includes('nonexistent')) {
    throw new Error(`ENOENT: no such file or directory, '${filePath}'`)
  }
  return new TextEncoder().encode('mock-archive-data')
})

const mockArchiveAdapter = {
  create: mockArchiveCreate,
  extract: mockArchiveExtract,
  list: jest.fn(async () => new Map()),
  readFile: jest.fn(async () => null),
}

const mockRuntimeAdapter = {
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  spawn: jest.fn(),
  spawnAndCollect: jest.fn(),
}

// 模擬 Docker adapter
// biome-ignore lint/suspicious/noExplicitAny: 測試使用簡化的 mock 物件
const mockDocker: any = {
  createBaseContainer: jest.fn().mockResolvedValue('container-123'),
  copyFiles: jest.fn().mockResolvedValue(undefined),
  executeCommand: jest.fn(async (_containerId: string, cmd: string[]) => {
    if (cmd[0] === 'find') {
      return {
        exitCode: 0,
        stdout: '/app/index.ts\n/app/package.json',
        stderr: '',
      }
    }
    if (cmd[0] === 'cat') {
      return { exitCode: 0, stdout: `content of ${cmd[1]}`, stderr: '' }
    }
    // bun install
    return { exitCode: 0, stdout: 'installed', stderr: '' }
  }),
  removeContainer: jest.fn().mockResolvedValue(undefined),
  getExposedPort: jest.fn().mockResolvedValue(3000),
  removeContainerByLabel: jest.fn().mockResolvedValue(undefined),
  streamLogs: jest.fn(),
  getStats: jest.fn().mockResolvedValue({ cpu: '0%', memory: '50MB' }),
}

// 模擬 RocketRepository
const mockRocket = {
  id: 'rocket-001',
  containerId: 'container-abc',
  status: 'ORBITING',
  currentMission: { id: 'mission-001' },
  assignedDomain: 'preview.example.com',
}

// biome-ignore lint/suspicious/noExplicitAny: 測試使用簡化的 mock 物件
const mockRocketRepo: any = {
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(async (id: string) => {
    if (id === 'rocket-001') {
      return mockRocket
    }
    return null
  }),
  findIdle: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([mockRocket]),
  delete: jest.fn().mockResolvedValue(undefined),
}

// ============ 測試主體 ============

describe('DeploymentArchiver', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('T1: backupDeployment() - 正常備份', () => {
    it('應列出容器檔案並打包為 tar.gz', async () => {
      const archiver = new DeploymentArchiver(
        mockDocker,
        mockRocketRepo,
        mockRuntimeAdapter,
        mockArchiveAdapter as any
      )
      const outputPath = '/tmp/backups/rocket-001.tar.gz'

      await archiver.backupDeployment('rocket-001', outputPath)

      // 驗證查詢 Rocket
      expect(mockRocketRepo.findById).toHaveBeenCalledWith('rocket-001')

      // 驗證 Docker executeCommand 被呼叫（find 命令）
      expect(mockDocker.executeCommand).toHaveBeenCalledWith(
        'container-abc',
        expect.arrayContaining(['find', '/app'])
      )

      // 驗證 archive.create 被呼叫
      expect(mockArchiveCreate).toHaveBeenCalledTimes(1)
      const entries = mockArchiveCreate.mock.calls[0][0] as Record<string, unknown>
      const entryKeys = Object.keys(entries)

      // 驗證 __manifest.json 存在
      expect(entryKeys).toContain('__manifest.json')
      const manifest = JSON.parse(entries['__manifest.json'] as string)
      expect(manifest.rocketId).toBe('rocket-001')
      expect(manifest.containerId).toBe('container-abc')
      expect(manifest.domain).toBe('preview.example.com')
      expect(manifest.version).toBe('1.0.0')

      // 驗證 runtime.writeFile 被呼叫
      expect(mockWriteFile).toHaveBeenCalledWith(outputPath, expect.any(Uint8Array))
    })

    it('Rocket 不存在時應拋出錯誤', async () => {
      const archiver = new DeploymentArchiver(
        mockDocker,
        mockRocketRepo,
        mockRuntimeAdapter,
        mockArchiveAdapter as any
      )

      await expect(
        archiver.backupDeployment('nonexistent-rocket', '/tmp/output.tar.gz')
      ).rejects.toThrow(/Rocket 不存在/)
    })
  })

  describe('T2: restoreDeployment() - 正常還原', () => {
    it('應讀取備份並複製檔案回容器', async () => {
      const archiver = new DeploymentArchiver(
        mockDocker,
        mockRocketRepo,
        mockRuntimeAdapter,
        mockArchiveAdapter as any
      )
      const backupPath = '/tmp/backups/rocket-001.tar.gz'

      await archiver.restoreDeployment('rocket-001', backupPath)

      // 驗證讀取備份資料
      expect(mockReadFile).toHaveBeenCalledWith(backupPath)

      // 驗證解壓縮到臨時目錄
      expect(mockArchiveExtract).toHaveBeenCalledTimes(1)
      const [, extractTmpDir] = mockArchiveExtract.mock.calls[0]
      expect(extractTmpDir).toContain('launchpad-restore-rocket-001')

      // 驗證複製檔案回容器
      expect(mockDocker.copyFiles).toHaveBeenCalledWith(
        'container-abc',
        expect.stringContaining('app'),
        '/app'
      )

      // 驗證重新安裝依賴
      expect(mockDocker.executeCommand).toHaveBeenCalledWith('container-abc', [
        'bun',
        'install',
        '--frozen-lockfile',
      ])
    })

    it('備份檔案不存在時應拋出錯誤', async () => {
      const archiver = new DeploymentArchiver(
        mockDocker,
        mockRocketRepo,
        mockRuntimeAdapter,
        mockArchiveAdapter as any
      )

      await expect(
        archiver.restoreDeployment('rocket-001', '/tmp/nonexistent/backup.tar.gz')
      ).rejects.toThrow(/備份檔案不存在或無法讀取/)
    })
  })

  describe('T3: packageRelease() - 排除 node_modules', () => {
    it('預設應排除 node_modules 目錄', async () => {
      const archiver = new DeploymentArchiver(
        mockDocker,
        mockRocketRepo,
        mockRuntimeAdapter,
        mockArchiveAdapter as any
      )
      const outputPath = '/tmp/releases/v1.0.0.tar.gz'

      await archiver.packageRelease('rocket-001', 'v1.0.0', outputPath)

      // 驗證 find 命令包含 node_modules 排除
      const findCalls = mockDocker.executeCommand.mock.calls.filter(
        (call: any[]) => call[1] && call[1][0] === 'find'
      )
      expect(findCalls.length).toBeGreaterThan(0)
      // find 命令參數應包含 node_modules 排除
      const findArgs: string[] = findCalls[0][1]
      expect(findArgs.join(' ')).toContain('node_modules')

      // 驗證 entries 包含 release.json
      expect(mockArchiveCreate).toHaveBeenCalledTimes(1)
      const entries = mockArchiveCreate.mock.calls[0][0] as Record<string, unknown>
      const entryKeys = Object.keys(entries)
      expect(entryKeys).toContain('release.json')

      const release = JSON.parse(entries['release.json'] as string)
      expect(release.version).toBe('v1.0.0')
      expect(release.rocketId).toBe('rocket-001')
      expect(release.domain).toBe('preview.example.com')

      // 驗證輸出檔案
      expect(mockWriteFile).toHaveBeenCalledWith(outputPath, expect.any(Uint8Array))
    })

    it('includeNodeModules:true 時應包含 node_modules', async () => {
      const archiver = new DeploymentArchiver(
        mockDocker,
        mockRocketRepo,
        mockRuntimeAdapter,
        mockArchiveAdapter as any
      )
      const outputPath = '/tmp/releases/v1.0.0-full.tar.gz'

      await archiver.packageRelease('rocket-001', 'v1.0.0', outputPath, {
        includeNodeModules: true,
      })

      // 驗證 archive.create 被呼叫且輸出寫入
      expect(mockArchiveCreate).toHaveBeenCalledTimes(1)
      expect(mockWriteFile).toHaveBeenCalledWith(outputPath, expect.any(Uint8Array))
    })
  })
})
