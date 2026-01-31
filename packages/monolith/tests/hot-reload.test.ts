import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PlanetCore } from '@gravito/core'
import { OrbitMonolith } from '../src/index'

const TMP_DIR = join(import.meta.dir, 'tmp_hot_reload')

describe('Orbit Monolith Hot Reload', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(async () => {
    process.env.NODE_ENV = 'development'
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true })
    }
    await mkdir(join(TMP_DIR, 'docs', 'en'), { recursive: true })
    await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Original')
  })

  afterEach(async () => {
    process.env.NODE_ENV = originalEnv
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true })
    }
  })

  it('should enable watcher in development mode', async () => {
    const core = new PlanetCore()
    const orbit = new OrbitMonolith({
      root: TMP_DIR,
      collections: { docs: { path: 'docs' } },
    })

    // We need to capture the ContentManager instance to verify cache
    let capturedManager: any
    let registeredHandler: any

    // @ts-expect-error
    core.adapter.use = mock((_path, handler) => {
      registeredHandler = handler
    })

    await orbit.install(core)

    // Execute captured handler
    const ctx: any = {
      set: (k: string, v: any) => {
        if (k === 'content') {
          capturedManager = v
        }
      },
    }
    await registeredHandler(ctx, async () => {})

    expect(capturedManager).toBeDefined()

    // Prime cache
    await capturedManager.find('docs', 'test')
    // @ts-expect-error
    expect(capturedManager.cache.size).toBe(1)

    // Modify file
    await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Changed')

    // Wait for watcher
    await new Promise((r) => setTimeout(r, 500))

    // Cache should be cleared
    // @ts-expect-error
    expect(capturedManager.cache.size).toBe(0)
  })
})
