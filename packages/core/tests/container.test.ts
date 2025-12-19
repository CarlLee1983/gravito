import { describe, expect, it } from 'bun:test'
import { Container } from '../src/Container'
import { PlanetCore } from '../src/PlanetCore'
import { ServiceProvider } from '../src/ServiceProvider'

class TestService {
  constructor(public config: { foo: string }) {}
}

describe('Container', () => {
  it('should bind and resolve value', () => {
    const container = new Container()
    container.bind('config', () => ({ foo: 'bar' }))

    expect(container.make<{ foo: string }>('config')).toEqual({ foo: 'bar' })
  })

  it('should resolve different instances for transient bindings', () => {
    const container = new Container()
    container.bind('service', () => new TestService({ foo: 'bar' }))

    const s1 = container.make('service')
    const s2 = container.make('service')

    expect(s1).not.toBe(s2)
  })

  it('should resolve same instance for singleton bindings', () => {
    const container = new Container()
    container.singleton('service', () => new TestService({ foo: 'bar' }))

    const s1 = container.make('service')
    const s2 = container.make('service')

    expect(s1).toBe(s2)
  })

  it('should resolve nested dependencies', () => {
    const container = new Container()
    container.singleton('config', () => ({ foo: 'bar' }))
    container.bind('service', (c) => new TestService(c.make('config')))

    const service = container.make<TestService>('service')
    expect(service.config.foo).toBe('bar')
  })
})

class MockProvider extends ServiceProvider {
  register(container: Container) {
    container.bind('foo', () => 'bar')
  }
}

class BootProvider extends ServiceProvider {
  register(_container: Container) {}
  override boot(core: PlanetCore) {
    core.container.instance('booted', true)
  }
}

describe('PlanetCore Integration', () => {
  it('should register providers', async () => {
    const core = new PlanetCore()
    core.register(new MockProvider())
    await core.bootstrap()

    expect(core.container.make<string>('foo')).toBe('bar')
  })

  it('should boot providers after registration', async () => {
    const core = new PlanetCore()
    core.register(new BootProvider())
    await core.bootstrap()

    expect(core.container.make<boolean>('booted')).toBe(true)
  })
})
