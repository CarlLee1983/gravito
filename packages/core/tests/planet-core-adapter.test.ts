import { describe, expect, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'
import { PlanetCore } from '../src/PlanetCore'

describe('PlanetCore Default Adapter', () => {
  it('should use BunNativeAdapter by default in Bun environment', () => {
    const core = new PlanetCore()
    expect(core.adapter).toBeInstanceOf(BunNativeAdapter)
    expect(core.adapter.name).toBe('bun-native')
  })

  it('should allow overriding adapter via constructor', () => {
    const customAdapter = new BunNativeAdapter()
    const core = new PlanetCore({ adapter: customAdapter })
    expect(core.adapter).toBeInstanceOf(BunNativeAdapter)
    expect(core.adapter).toBe(customAdapter)
  })
})
