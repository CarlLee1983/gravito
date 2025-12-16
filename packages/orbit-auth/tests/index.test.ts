import { describe, expect, it, mock } from 'bun:test';
import { PlanetCore } from 'gravito-core';
import orbitAuth from '../src/index';

describe('OrbitAuth', () => {
  it('should register auth service and hooks', async () => {
    const core = new PlanetCore();
    // Mock hooks
    core.hooks.doAction = mock((_hook, _args) => Promise.resolve());
    core.hooks.applyFilters = mock((_hook, val) => Promise.resolve(val));

    const options = { secret: 'test-secret' };

    const auth = orbitAuth(core, options);

    expect(auth).toHaveProperty('sign');
    expect(auth).toHaveProperty('verify');
    expect(core.hooks.doAction).toHaveBeenCalledWith('auth:init', auth);

    // Test Sign Flow
    const token = await auth.sign({ sub: 'user_1' });
    expect(core.hooks.applyFilters).toHaveBeenCalledWith('auth:payload', { sub: 'user_1' });
    expect(typeof token).toBe('string');
  });
});
