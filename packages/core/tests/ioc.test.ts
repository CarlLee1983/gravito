import { describe, expect, it } from 'bun:test';
import { defineConfig, type GravitoOrbit, PlanetCore } from '../src';

// 1. Mock Orbit
class MockOrbit implements GravitoOrbit {
  name = 'MockOrbit';

  install(core: PlanetCore): void | Promise<void> {
    // Register a value to prove we ran
    core.config.set('mock-orbit:loaded', true);

    // Read config safely
    const orbitConfig = core.config.get('mock', { value: undefined });
    if (orbitConfig?.value) {
      core.config.set('mock-orbit:value', orbitConfig.value);
    }
  }
}

describe('PlanetCore IoC', () => {
  it('should boot with empty config', async () => {
    const core = await PlanetCore.boot({});
    expect(core).toBeInstanceOf(PlanetCore);
  });

  it('should load orbits defined in config (Class Reference)', async () => {
    const config = defineConfig({
      orbits: [MockOrbit],
    });

    const core = await PlanetCore.boot(config);

    expect(core.config.get<boolean>('mock-orbit:loaded')).toBe(true);
  });

  it('should load orbits defined in config (Instance)', async () => {
    const instance = new MockOrbit();
    const config = defineConfig({
      orbits: [instance],
    });

    const core = await PlanetCore.boot(config);

    expect(core.config.get<boolean>('mock-orbit:loaded')).toBe(true);
  });

  it('should pass config to orbits', async () => {
    const config = defineConfig({
      config: {
        mock: { value: 'foobar' },
      },
      orbits: [MockOrbit],
    });

    const core = await PlanetCore.boot(config);

    expect(core.config.get<string>('mock-orbit:value')).toBe('foobar');
  });

  it('should properly type check definingConfig', () => {
    const cfg = defineConfig({
      config: { foo: 'bar' },
    });
    expect(cfg.config?.foo).toBe('bar');
  });
});
