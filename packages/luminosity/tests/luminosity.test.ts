import { describe, expect, it } from 'bun:test'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { Luminosity } from '../src/Luminosity'

describe('Luminosity', () => {
  it('generates sitemap files and index', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp-luminosity')
    await rm(outDir, { recursive: true, force: true })

    const engine = new Luminosity({
      path: outDir,
      hostname: 'https://example.com',
      maxEntriesPerFile: 1,
    })
    await engine.generate([{ url: '/one' }, { url: '/two' }])

    await new Promise((resolve) => setTimeout(resolve, 10))

    const indexXml = await readFile(join(outDir, 'sitemap-index.xml'), 'utf8')
    expect(indexXml).toContain('sitemap-1.xml')
    expect(indexXml).toContain('sitemap-2.xml')

    const sitemap1 = await readFile(join(outDir, 'sitemap-1.xml'), 'utf8')
    expect(sitemap1).toContain('/one')
  })

  it('returns a robots builder', () => {
    const engine = new Luminosity()
    const robots = engine.robots().build()
    expect(robots).toContain('User-agent')
  })
})
