import { describe, expect, it, jest } from 'bun:test'
import { OrbitEcho } from '../../src/OrbitEcho'

describe('OrbitEcho', () => {
  it('should create with default config', () => {
    const echo = new OrbitEcho()
    expect(echo.getReceiver()).toBeDefined()
    expect(echo.getDispatcher()).toBeUndefined()
  })

  it('should create dispatcher when config provided', () => {
    const echo = new OrbitEcho({
      dispatcher: { secret: 'test' },
    })
    expect(echo.getDispatcher()).toBeDefined()
  })

  it('should register providers from config', () => {
    const echo = new OrbitEcho({
      providers: {
        stripe: { name: 'stripe', secret: 'stripe-secret' },
        github: { name: 'github', secret: 'github-secret' },
      },
    })

    const receiver = echo.getReceiver()
    expect(receiver).toBeDefined()
  })

  it('should bind instances on install', () => {
    const echo = new OrbitEcho({
      dispatcher: { secret: 'test' },
    })
    const core = {
      container: {
        instance: jest.fn(),
      },
      adapter: {
        use: jest.fn(),
      },
      logger: {
        info: jest.fn(),
      },
    }

    echo.install(core as unknown as Parameters<OrbitEcho['install']>[0])

    expect(core.container.instance).toHaveBeenCalledWith('echo', echo)
    expect(core.container.instance).toHaveBeenCalledWith('echo.receiver', echo.getReceiver())
    expect(core.container.instance).toHaveBeenCalledWith('echo.dispatcher', echo.getDispatcher())
  })
})
