import { describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ConfigLoader } from '../../src/config/ConfigLoader'

describe('ConfigLoader', () => {
  it('loads config from file path', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-config')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })

    const configPath = join(tmpDir, 'gravito.seo.config.mjs')
    await writeFile(
      configPath,
      "export default { mode: 'dynamic', baseUrl: 'https://example.com', resolvers: [] }",
      'utf8'
    )

    const loader = new ConfigLoader()
    const config = await loader.load(configPath)

    expect(config.mode).toBe('dynamic')
    expect(config.baseUrl).toBe('https://example.com')
  })

  it('throws for invalid config', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-config-invalid')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })

    const configPath = join(tmpDir, 'gravito.seo.config.mjs')
    await writeFile(configPath, "export default { baseUrl: '' }", 'utf8')

    const loader = new ConfigLoader()
    await expect(loader.load(configPath)).rejects.toThrow('Config missing "mode"')
  })

  it('throws when no config file found without path', async () => {
    // 在一個不存在 config 的目錄下搜尋
    const originalCwd = process.cwd()
    const tmpDir = join(originalCwd, 'tests', '.tmp-config-empty')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })

    // 暫時修改 cwd
    const originalCwdFn = process.cwd
    process.cwd = () => tmpDir

    const loader = new ConfigLoader()
    try {
      await expect(loader.load()).rejects.toThrow('Config file not found')
    } finally {
      process.cwd = originalCwdFn
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('throws for config missing baseUrl', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-config-no-baseurl')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })

    const configPath = join(tmpDir, 'gravito.seo.config.mjs')
    await writeFile(configPath, "export default { mode: 'dynamic', resolvers: [] }", 'utf8')

    const loader = new ConfigLoader()
    try {
      await expect(loader.load(configPath)).rejects.toThrow('Config missing "baseUrl"')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('throws for config missing resolvers', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-config-no-resolvers')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })

    const configPath = join(tmpDir, 'gravito.seo.config.mjs')
    await writeFile(
      configPath,
      "export default { mode: 'dynamic', baseUrl: 'https://example.com' }",
      'utf8'
    )

    const loader = new ConfigLoader()
    try {
      await expect(loader.load(configPath)).rejects.toThrow('Config missing "resolvers"')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('throws for non-object config', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-config-nonobj')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })

    const configPath = join(tmpDir, 'gravito.seo.config.mjs')
    await writeFile(configPath, "export default 'not an object'", 'utf8')

    const loader = new ConfigLoader()
    try {
      await expect(loader.load(configPath)).rejects.toThrow('Config must be an object')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('auto-discovers config from default search paths', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-config-auto')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })

    // 放置一個預設名稱的 config
    const configPath = join(tmpDir, 'gravito.seo.config.mjs')
    await writeFile(
      configPath,
      "export default { mode: 'cached', baseUrl: 'https://auto.com', resolvers: [] }",
      'utf8'
    )

    const originalCwdFn = process.cwd
    process.cwd = () => tmpDir

    const loader = new ConfigLoader()
    try {
      const config = await loader.load()
      expect(config.mode).toBe('cached')
      expect(config.baseUrl).toBe('https://auto.com')
    } finally {
      process.cwd = originalCwdFn
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('loads config with absolute path', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-config-abs')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })

    const configPath = join(tmpDir, 'gravito.seo.config.mjs')
    await writeFile(
      configPath,
      "export default { mode: 'incremental', baseUrl: 'https://abs.com', resolvers: [] }",
      'utf8'
    )

    const loader = new ConfigLoader()
    try {
      const config = await loader.load(configPath)
      expect(config.mode).toBe('incremental')
      expect(config.baseUrl).toBe('https://abs.com')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })
})
