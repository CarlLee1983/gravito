import { describe, expect, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'
import { PhotonAdapter } from '../src/adapters/PhotonAdapter'
import { PlanetCore } from '../src/PlanetCore'

describe('PlanetCore Default Adapter', () => {
  it('should use BunNativeAdapter by default in Bun environment', () => {
    const core = new PlanetCore()
    expect(core.adapter).toBeInstanceOf(BunNativeAdapter)
    expect(core.adapter.name).toBe('bun-native')
  })

  it('should allow overriding adapter via constructor', () => {
    const photonAdapter = new PhotonAdapter()
    const core = new PlanetCore({ adapter: photonAdapter })
    expect(core.adapter).toBeInstanceOf(PhotonAdapter)
    expect(core.adapter).toBe(photonAdapter)
  })
})
