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

  it('should treat falsy cached values as cache hits', async () => {
    const core = new PlanetCore();
    const cache = orbitCache(core);

    await cache.set('falsy', 0, 60);

    const callback = mock(() => Promise.resolve(123));
    const value = await cache.remember('falsy', 60, callback);

    expect(value).toBe(0);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should support add/increment/decrement', async () => {
    const core = new PlanetCore();
    const cache = orbitCache(core);

    expect(await cache.add('only_once', 'a', 60)).toBe(true);
    expect(await cache.add('only_once', 'b', 60)).toBe(false);
    expect(await cache.get('only_once')).toBe('a');

    expect(await cache.increment('counter')).toBe(1);
    expect(await cache.increment('counter', 2)).toBe(3);
    expect(await cache.decrement('counter')).toBe(2);
  });

  it('should support many/putMany', async () => {
    const core = new PlanetCore();
    const cache = orbitCache(core);

    await cache.putMany({ a: 1, b: 2 }, 60);
    expect(await cache.many<number>(['a', 'b', 'c'])).toEqual({ a: 1, b: 2, c: null });
  });

  it('should support flexible (stale-while-revalidate)', async () => {
    const core = new PlanetCore();
    const cache = orbitCache(core);

    let counter = 0;
    const callback = mock(async () => {
      counter++;
      await new Promise((r) => setTimeout(r, 10));
      return counter;
    });

    const ttlSeconds = 0.1;
    const staleSeconds = 0.5;

    expect(await cache.flexible('flex', ttlSeconds, staleSeconds, callback)).toBe(1);
    expect(await cache.flexible('flex', ttlSeconds, staleSeconds, callback)).toBe(1);
    expect(callback).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 150));

    // stale value served, refresh scheduled in background
    expect(await cache.flexible('flex', ttlSeconds, staleSeconds, callback)).toBe(1);

    await new Promise((r) => setTimeout(r, 50));
    expect(await cache.flexible('flex', ttlSeconds, staleSeconds, callback)).toBe(2);
  });

  it('should support tags (memory store)', async () => {
    const core = new PlanetCore();
    const cache = orbitCache(core);

    const tagged = cache.tags(['users']);
    await tagged.set('user:1', { id: 1 }, 60);

    expect(await cache.get('user:1')).toBeNull();
    expect(await tagged.get('user:1')).toEqual({ id: 1 });

    await tagged.clear();
    expect(await tagged.get('user:1')).toBeNull();
  });

  it('should support locks (memory store)', async () => {
    const core = new PlanetCore();
    const cache = orbitCache(core);

    const lock1 = cache.lock('resource', 1);
    const lock2 = cache.lock('resource', 1);

    expect(await lock1.acquire()).toBe(true);
    expect(await lock2.acquire()).toBe(false);

    await lock1.release();
    expect(await lock2.acquire()).toBe(true);
    await lock2.release();
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
