import { describe, expect, test } from 'bun:test'
import { ContainerBindingCollisionException } from '../src/exceptions'
import { PlanetCore } from '../src/PlanetCore'

describe('Lite Satellite (Phase 29)', () => {
  test('should register a lite satellite as an object literal', async () => {
    const core = new PlanetCore()
    let installed = false

    await core.plugin({
      name: 'test-plugin',
      install(c) {
        installed = true
        c.container.singletonInline('test-plugin', 'service', () => ({ hello: 'world' }))
      },
    })

    expect(installed).toBe(true)
    expect(core.container.has('inline:test-plugin:service')).toBe(true)
    expect(core.container.make<any>('inline:test-plugin:service').hello).toBe('world')
  })

  test('should throw error if lite satellite has no name', async () => {
    const core = new PlanetCore()

    expect(
      core.plugin({
        install() {},
      } as any)
    ).rejects.toThrow(/Lite Satellites require a "name" property/)
  })

  test('should reject duplicate lite satellite names in development', async () => {
    const core = new PlanetCore()

    await core.plugin({
      name: 'duplicate-plugin',
      install() {},
    })

    await expect(
      core.plugin({
        name: 'duplicate-plugin',
        install() {},
      })
    ).rejects.toThrow(ContainerBindingCollisionException)
  })

  test('should reject duplicate singletonInline bindings in development', () => {
    const core = new PlanetCore()

    core.container.singletonInline('duplicate-plugin', 'service', () => 'first')

    expect(() =>
      core.container.singletonInline('duplicate-plugin', 'service', () => 'second')
    ).toThrow(ContainerBindingCollisionException)
  })

  test('should skip duplicate registrations in production mode', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const core = new PlanetCore()

      await core.plugin({
        name: 'production-plugin',
        install() {},
      })

      await expect(
        core.plugin({
          name: 'production-plugin',
          install() {},
        })
      ).resolves.toBe(core)

      core.container.singletonInline('production-plugin', 'service', () => 'first')
      expect(() =>
        core.container.singletonInline('production-plugin', 'service', () => 'second')
      ).not.toThrow()
      expect(core.container.make<string>('inline:production-plugin:service')).toBe('first')
      expect(core.installedOrbits).toHaveLength(1)
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })

  test('should support object literal in core.orbit()', async () => {
    const core = new PlanetCore()
    let installed = false

    await core.orbit({
      name: 'custom-orbit',
      install() {
        installed = true
      },
    })

    expect(installed).toBe(true)
  })

  test('should route named plain objects through boot() plugin flow', async () => {
    const core = await PlanetCore.boot({
      orbits: [
        {
          name: 'boot-plugin',
          install(c) {
            c.container.singletonInline('boot-plugin', 'service', () => 'booted')
          },
        },
      ],
    } as any)

    expect(core.installedOrbits).toEqual([
      {
        name: 'boot-plugin',
        dependencies: [],
      },
    ])
    expect(core.container.make<string>('inline:boot-plugin:service')).toBe('booted')
  })
})
