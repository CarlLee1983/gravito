import { describe, expect, it, mock } from 'bun:test';
import { PlanetCore } from 'gravito-core';
import orbitDB from '../src/index';

describe('OrbitDB', () => {
  it('should register db and hooks', () => {
    // Mock core
    const core = new PlanetCore();
    core.hooks.doAction = mock((_hook, _args) => Promise.resolve());
    core.app.use = mock(() => core.app);

    const mockDb = { name: 'mock-db' };

    const result = orbitDB(core, { db: mockDb });

    expect(result).toEqual({ db: mockDb });
    expect(core.hooks.doAction).toHaveBeenCalledWith('db:connected', { db: mockDb });
    expect(core.app.use).toHaveBeenCalled();
  });
});
