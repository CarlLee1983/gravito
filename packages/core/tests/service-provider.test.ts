import { describe, expect, it } from 'bun:test'
import { ConfigManager } from '../src/ConfigManager'
import { ServiceProvider } from '../src/ServiceProvider'

class TestProvider extends ServiceProvider {
  register(): void {}

  merge(config: ConfigManager, key: string, value: unknown) {
    this.mergeConfig(config, key, value)
  }

  async mergeFrom(config: ConfigManager, key: string, value: unknown) {
    await this.mergeConfigFrom(config, key, async () => value)
  }

  publish(paths: Record<string, string>, group?: string) {
    this.publishes(paths, group)
  }
}

describe('ServiceProvider', () => {
  it('merges config values', () => {
    const provider = new TestProvider()
    const config = new ConfigManager({ app: { name: 'Gravito' } })

    provider.merge(config, 'app', { debug: true })
    expect(config.get('app.name')).toBe('Gravito')
    expect(config.get('app.debug')).toBe(true)
  })

  it('merges config values from async loader', async () => {
    const provider = new TestProvider()
    const config = new ConfigManager()

    await provider.mergeFrom(config, 'auth', { enabled: true })
    expect(config.get('auth.enabled')).toBe(true)
  })

  it('tracks publishable assets by group', () => {
    const provider = new TestProvider()
    provider.publish({ './config/cache.ts': 'config/cache.ts' }, 'Cache')

    const group = ServiceProvider.getPublishables('Cache')
    expect(group.get('./config/cache.ts')).toBe('config/cache.ts')
    expect(ServiceProvider.getPublishGroups()).toContain('Cache')
  })
})
