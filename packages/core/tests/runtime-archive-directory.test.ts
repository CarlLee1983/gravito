import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { archiveFromDirectory, getArchiveAdapter } from '../src/runtime'

// ============ 測試群組 ============

describe('archiveFromDirectory', () => {
  let testDir: string
  let sourceDir: string
  let outputPath: string

  const hasBunTarball = typeof Bun !== 'undefined' && typeof (Bun as any).Tarball !== 'undefined'

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'gravito-archive-dir-test-'))
    sourceDir = join(testDir, 'source')
    outputPath = join(testDir, 'output.tar.gz')

    await mkdir(sourceDir, { recursive: true })
    await mkdir(join(sourceDir, 'sub'), {
      recursive: true,
    })

    // 建立測試檔案
    await writeFile(join(sourceDir, 'index.html'), '<html>hello</html>')
    await writeFile(join(sourceDir, 'style.css'), 'body { color: red }')
    await writeFile(join(sourceDir, 'sub', 'page.html'), '<html>page</html>')
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // 忽略清理錯誤
    }
  })

  it('應拒絕無效的歸檔路徑（非 .tar.gz 或 .tgz）', async () => {
    await expect(archiveFromDirectory(sourceDir, '/tmp/output.zip')).rejects.toThrow(
      'archivePath must end with .tar.gz or .tgz'
    )
  })

  it('應拒絕空的歸檔路徑', async () => {
    await expect(archiveFromDirectory(sourceDir, '')).rejects.toThrow('archivePath cannot be empty')
  })

  it('應接受 .tgz 副檔名', async () => {
    if (!hasBunTarball) {
      return
    }

    const tgzPath = join(testDir, 'output.tgz')
    const data = await archiveFromDirectory(sourceDir, tgzPath)
    expect(data).toBeInstanceOf(Uint8Array)
    expect(data.length).toBeGreaterThan(0)
  })

  it('應掃描目錄並建立歸檔', async () => {
    if (!hasBunTarball) {
      return
    }

    const data = await archiveFromDirectory(sourceDir, outputPath)

    expect(data).toBeInstanceOf(Uint8Array)
    expect(data.length).toBeGreaterThan(0)

    // 驗證檔案已寫入磁碟
    const fileContent = await readFile(outputPath)
    expect(fileContent.length).toBe(data.length)
  })

  it('應包含所有子目錄中的檔案', async () => {
    if (!hasBunTarball) {
      return
    }

    const data = await archiveFromDirectory(sourceDir, outputPath)

    // 驗證歸檔內容
    const adapter = getArchiveAdapter()
    const files = await adapter.list(data)

    expect(files.has('index.html')).toBe(true)
    expect(files.has('style.css')).toBe(true)
    expect(files.has('sub/page.html')).toBe(true)
    expect(files.size).toBe(3)
  })

  it('應支援壓縮等級選項', async () => {
    if (!hasBunTarball) {
      return
    }

    const data = await archiveFromDirectory(sourceDir, outputPath, { compress: 'gzip', level: 9 })

    expect(data).toBeInstanceOf(Uint8Array)
    expect(data.length).toBeGreaterThan(0)
  })

  it('歸檔中的檔案內容應正確', async () => {
    if (!hasBunTarball) {
      return
    }

    const data = await archiveFromDirectory(sourceDir, outputPath)

    const adapter = getArchiveAdapter()
    const content = await adapter.readFile(data, 'index.html')
    expect(content).not.toBeNull()
    const text = new TextDecoder().decode(content!)
    expect(text).toBe('<html>hello</html>')
  })
})
