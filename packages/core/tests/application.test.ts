import { describe, expect, it } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Application } from '../src/Application'
import { ServiceProvider } from '../src/ServiceProvider'

class TestLogger {
  public infos: string[] = []
  public warns: string[] = []
  public errors: string[] = []
  public debugs: string[] = []

  debug(message: string) {
    this.debugs.push(message)
  }
  info(message: string) {
    this.infos.push(message)
  }
  warn(message: string) {
    this.warns.push(message)
  }
  error(message: string) {
    this.errors.push(message)
  }
}

async function setupTempApp() {
  return mkdtemp(path.join(os.tmpdir(), 'gravito-app-'))
}

class SampleProvider extends ServiceProvider {
  register(container: any): void {
    container.instance('sample', { ok: true })
  }
}

describe('Application', () => {
  it('boots with explicit providers and initial config', async () => {
    const basePath = await setupTempApp()
    const logger = new TestLogger()
    const app = new Application({
      basePath,
      env: 'testing',
      logger,
      config: { app: { name: 'TestApp', debug: true } },
      providers: [new SampleProvider()],
      autoDiscoverProviders: false,
    })

    await app.boot()

    expect(app.config.has('app')).toBe(true)
    expect(app.config.get('app')).toEqual({ name: 'TestApp', debug: true })
    expect(app.core.container.make<{ ok: boolean }>('sample').ok).toBe(true)
    expect(app.isTesting()).toBe(true)
    expect(logger.infos.length).toBeGreaterThan(0)
  })

  it('boot is idempotent', async () => {
    const basePath = await setupTempApp()
    const logger = new TestLogger()
    const app = new Application({ basePath, env: 'testing', logger })

    await app.boot()
    const infos = logger.infos.length
    await app.boot()

    expect(logger.infos.length).toBe(infos)
  })

  it('logs when config directory is missing', async () => {
    const basePath = await setupTempApp()
    const logger = new TestLogger()
    const app = new Application({ basePath, env: 'testing', logger })

    await app.boot()

    expect(logger.infos.some((msg) => msg.includes('No config directory found'))).toBe(true)
  })

  it('path helpers resolve paths relative to base', async () => {
    const basePath = await setupTempApp()
    const app = new Application({ basePath, env: 'testing' })

    expect(app.path('config', 'app.js')).toBe(path.join(basePath, 'config', 'app.js'))
    expect(app.configPath('app.js')).toBe(path.join(basePath, 'config', 'app.js'))
  })

  it('handles auto-discovered provider load failure gracefully without crashing', async () => {
    const fs = await import('node:fs/promises')
    const basePath = await setupTempApp()
    const logger = new TestLogger()

    const providersPath = path.join(basePath, 'src/Providers')
    await fs.mkdir(providersPath, { recursive: true })

    // Create a provider file that throws during instantiation
    await fs.writeFile(
      path.join(providersPath, 'BrokenProvider.ts'),
      `export default class BrokenProvider { constructor() { throw new Error("Constructor Failed"); } register(){} }`
    )

    const app = new Application({
      basePath,
      env: 'testing',
      logger,
      autoDiscoverProviders: true,
    })

    // It should boot successfully despite the broken provider throwing during initialization and caught by `Application.discoverProviders`
    await expect(app.boot()).resolves.toBe(app)

    expect(
      logger.warns.some((msg) =>
        msg.includes('Failed to instantiate provider from BrokenProvider.ts')
      )
    ).toBe(true)
  })
})
