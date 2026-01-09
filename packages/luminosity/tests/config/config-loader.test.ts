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
})
