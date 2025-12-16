import { describe, expect, it, mock } from 'bun:test';
import { PlanetCore } from 'gravito-core';
import orbitCache from '../src/index';

describe('OrbitCache', () => {
  it('should register memory cache provider', async () => {
    const core = new PlanetCore();
    core.hooks.doAction = mock((_hook, _args) => Promise.resolve());

    const cache = orbitCache(core, { defaultTTL: 1 });

    expect(cache).toBeDefined();

    // Test Set/Get
    await cache.set('foo', 'bar');
    expect(await cache.get('foo')).toBe('bar');

    // Test Remember (Miss)
    const callback = mock(() => Promise.resolve('computed'));
    const val1 = await cache.remember('key1', 10, callback);
    expect(val1).toBe('computed');
    expect(callback).toHaveBeenCalled();
    expect(core.hooks.doAction).toHaveBeenCalledWith('cache:miss', { key: 'key1' });

    // Test Remember (Hit)
    const callback2 = mock(() => Promise.resolve('computed2'));
    const val2 = await cache.remember('key1', 10, callback2);
    expect(val2).toBe('computed'); // Should return cached value
    expect(callback2).not.toHaveBeenCalled();
    expect(core.hooks.doAction).toHaveBeenCalledWith('cache:hit', { key: 'key1' });
  });

  it('should expire items', async () => {
    const core = new PlanetCore();
    const cache = orbitCache(core);

    // Set with tiny TTL
    await cache.set('expire_me', 'd', 0.001); // 1ms

    // Wait > 1ms
    await new Promise((r) => setTimeout(r, 10));

    expect(await cache.get('expire_me')).toBeNull();
  });
});
