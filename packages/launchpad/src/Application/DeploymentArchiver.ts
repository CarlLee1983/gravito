/**
 * @fileoverview DeploymentArchiver - 部署備份與打包服務
 *
 * 利用 RuntimeArchiveAdapter（tar.gz）實現完整的部署版本備份、
 * 還原及發布打包功能，支援 Docker 容器化環境。
 */

import { mkdir } from 'node:fs/promises'
import type { RuntimeArchiveAdapter } from '@gravito/core'
import { getArchiveAdapter, getRuntimeAdapter } from '@gravito/core'
import { LaunchpadError } from '../errors/LaunchpadError'
import { LaunchpadErrorCodes } from '../errors/codes'
import type { IDockerAdapter, IRocketRepository } from '../Domain/Interfaces'

// ============ 公開介面 ============

/**
 * 部署備份 Manifest
 * @public
 */
export interface DeploymentBackupManifest {
  readonly version: string
  readonly rocketId: string
  readonly missionId: string | null
  readonly containerId: string
  readonly status: string
  readonly domain: string | null
  readonly createdAt: string
  readonly files: readonly string[]
}

/**
 * 發布打包選項
 * @public
 */
export interface PackageReleaseOptions {
  /** 是否包含 node_modules（預設 false） */
  readonly includeNodeModules?: boolean
  /** 額外要排除的目錄/檔案 pattern（glob） */
  readonly exclude?: readonly string[]
}

// ============ 服務主體 ============

/**
 * DeploymentArchiver - 部署備份與打包服務
 *
 * 提供 Docker 容器部署版本的備份、還原及發布版本打包功能。
 * 整合至 LaunchpadServiceProvider 以支援 IoC 注入。
 *
 * @example
 * ```typescript
 * const archiver = new DeploymentArchiver(dockerAdapter, rocketRepo)
 *
 * // 備份部署版本
 * await archiver.backupDeployment('rocket-abc', './backups/rocket-abc.tar.gz')
 *
 * // 還原部署版本
 * await archiver.restoreDeployment('rocket-abc', './backups/rocket-abc.tar.gz')
 *
 * // 打包發布版本
 * await archiver.packageRelease('rocket-abc', 'v1.0.0', './releases/v1.0.0.tar.gz')
 * ```
 *
 * @public
 */
export class DeploymentArchiver {
  private readonly archive: RuntimeArchiveAdapter
  private readonly runtime: any

  constructor(
    private readonly docker: IDockerAdapter,
    private readonly rocketRepo: IRocketRepository,
    runtime?: any,
    archive?: RuntimeArchiveAdapter
  ) {
    this.runtime = runtime || getRuntimeAdapter()
    this.archive = archive || getArchiveAdapter()
  }

  /**
   * 備份部署版本（從 Docker 容器打包應用目錄）
   *
   * 流程：
   * 1. 從 repository 查詢 Rocket 資訊
   * 2. 列出容器 /app 目錄中的所有檔案
   * 3. 逐檔讀取內容
   * 4. 建立 __manifest.json
   * 5. 打包為 tar.gz
   *
   * @param rocketId - 目標 Rocket 的 ID
   * @param outputPath - 輸出的 tar.gz 路徑
   */
  async backupDeployment(rocketId: string, outputPath: string): Promise<void> {
    const rocket = await this.rocketRepo.findById(rocketId)
    if (!rocket) {
      throw new LaunchpadError(404, LaunchpadErrorCodes.ROCKET_NOT_FOUND, {
        message: `[DeploymentArchiver] Rocket 不存在：${rocketId}`,
      })
    }

    // 列出容器 /app 目錄的所有檔案
    const fileList = await this.listContainerFiles(rocket.containerId, '/app', [
      'node_modules',
      '.git',
      '*.log',
    ])

    const entries: Record<string, string | Blob | ArrayBuffer | Uint8Array> = {}

    // 逐檔讀取容器中的檔案內容
    for (const filePath of fileList) {
      try {
        const content = await this.readContainerFile(rocket.containerId, filePath)
        if (content !== null) {
          // 使用相對路徑（去掉 /app/ 前綴）作為 entries key
          const relativePath = filePath.startsWith('/app/')
            ? filePath.slice('/app/'.length)
            : filePath
          entries[`app/${relativePath}`] = content
        }
      } catch {
        // 單一檔案讀取失敗不中斷備份流程
      }
    }

    // 建立 manifest
    const manifest: DeploymentBackupManifest = {
      version: '1.0.0',
      rocketId: rocket.id,
      missionId: rocket.currentMission?.id ?? null,
      containerId: rocket.containerId,
      status: rocket.status,
      domain: rocket.assignedDomain,
      createdAt: new Date().toISOString(),
      files: fileList,
    }
    entries['__manifest.json'] = JSON.stringify(manifest, null, 2)

    // 打包為 tar.gz
    const archiveData = await this.archive.create(entries, { compress: 'gzip' })
    await this.runtime.writeFile(outputPath, archiveData)
  }

  /**
   * 還原部署版本（從備份 tar.gz 恢復容器應用目錄）
   *
   * 流程：
   * 1. 讀取備份 tar.gz
   * 2. 提取到臨時目錄
   * 3. 從 repository 查詢目標 Rocket
   * 4. 複製檔案回容器
   * 5. 重新安裝依賴
   *
   * @param rocketId - 目標 Rocket 的 ID
   * @param backupPath - 備份 tar.gz 路徑
   */
  async restoreDeployment(rocketId: string, backupPath: string): Promise<void> {
    const rocket = await this.rocketRepo.findById(rocketId)
    if (!rocket) {
      throw new LaunchpadError(404, LaunchpadErrorCodes.ROCKET_NOT_FOUND, {
        message: `[DeploymentArchiver] Rocket 不存在：${rocketId}`,
      })
    }

    // 讀取備份資料
    let archiveData: Uint8Array
    try {
      archiveData = await this.runtime.readFile(backupPath)
    } catch {
      throw new LaunchpadError(404, LaunchpadErrorCodes.DEPLOYMENT_BACKUP_NOT_FOUND, {
        message: `[DeploymentArchiver] 備份檔案不存在或無法讀取：${backupPath}`,
      })
    }

    // 提取到臨時目錄
    const tmpDir = `/tmp/launchpad-restore-${rocket.id}-${Date.now()}`
    await mkdir(tmpDir, { recursive: true })
    await this.archive.extract(archiveData, tmpDir)

    // 複製 app 目錄回容器
    const appDir = `${tmpDir}/app`
    await this.docker.copyFiles(rocket.containerId, appDir, '/app')

    // 重新安裝依賴
    await this.docker.executeCommand(rocket.containerId, ['bun', 'install', '--frozen-lockfile'])
  }

  /**
   * 打包發布版本（用於部署到生產環境）
   *
   * 流程：
   * 1. 查詢 Rocket 資訊
   * 2. 掃描容器，根據選項排除 node_modules
   * 3. 生成 release.json
   * 4. 打包為 tar.gz
   *
   * @param rocketId - 來源 Rocket 的 ID
   * @param version - 版本號（例如 'v1.0.0'）
   * @param outputPath - 輸出 tar.gz 路徑
   * @param options - 打包選項
   */
  async packageRelease(
    rocketId: string,
    version: string,
    outputPath: string,
    options: PackageReleaseOptions = {}
  ): Promise<void> {
    const rocket = await this.rocketRepo.findById(rocketId)
    if (!rocket) {
      throw new LaunchpadError(404, LaunchpadErrorCodes.ROCKET_NOT_FOUND, {
        message: `[DeploymentArchiver] Rocket 不存在：${rocketId}`,
      })
    }

    // 根據選項決定排除清單
    const excludePatterns = ['*.log', '.git']
    if (!options.includeNodeModules) {
      excludePatterns.push('node_modules')
    }
    if (options.exclude) {
      excludePatterns.push(...options.exclude)
    }

    // 列出容器中的檔案
    const fileList = await this.listContainerFiles(rocket.containerId, '/app', excludePatterns)

    const entries: Record<string, string | Blob | ArrayBuffer | Uint8Array> = {}

    for (const filePath of fileList) {
      try {
        const content = await this.readContainerFile(rocket.containerId, filePath)
        if (content !== null) {
          const relativePath = filePath.startsWith('/app/')
            ? filePath.slice('/app/'.length)
            : filePath
          entries[relativePath] = content
        }
      } catch {
        // 單一檔案讀取失敗不中斷流程
      }
    }

    // 生成 release.json
    const releaseInfo = {
      version,
      rocketId: rocket.id,
      missionId: rocket.currentMission?.id ?? null,
      containerId: rocket.containerId,
      domain: rocket.assignedDomain,
      packagedAt: new Date().toISOString(),
      fileCount: fileList.length,
    }
    entries['release.json'] = JSON.stringify(releaseInfo, null, 2)

    // 打包為 tar.gz
    const archiveData = await this.archive.create(entries, { compress: 'gzip' })
    await this.runtime.writeFile(outputPath, archiveData)
  }

  // ============ 私有輔助方法 ============

  /**
   * 列出容器指定目錄中的所有檔案（排除指定 pattern）
   * @internal
   */
  private async listContainerFiles(
    containerId: string,
    dirPath: string,
    excludePatterns: readonly string[]
  ): Promise<string[]> {
    try {
      // 建構 find 命令，排除指定目錄/檔案
      const excludeArgs = excludePatterns.flatMap((pattern) => [
        '-not',
        '-path',
        `*/${pattern}/*`,
        '-not',
        '-name',
        pattern,
      ])

      const findCmd = ['find', dirPath, '-type', 'f', ...excludeArgs]
      const result = await this.docker.executeCommand(containerId, findCmd)

      if (result.exitCode !== 0) {
        return []
      }

      return result.stdout
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
    } catch {
      return []
    }
  }

  /**
   * 從容器中讀取單一檔案內容（以 base64 傳輸）
   * @internal
   */
  private async readContainerFile(containerId: string, filePath: string): Promise<string | null> {
    try {
      const result = await this.docker.executeCommand(containerId, ['cat', filePath])

      if (result.exitCode !== 0) {
        return null
      }

      return result.stdout
    } catch {
      return null
    }
  }
}
