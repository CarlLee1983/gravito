import type { CacheStore } from '../store';
import type { CacheKey, CacheTtl, CacheValue } from '../types';

export class NullStore implements CacheStore {
  async get<T = unknown>(_key: CacheKey): Promise<CacheValue<T>> {
    return null;
  }

  async put(_key: CacheKey, _value: unknown, _ttl: CacheTtl): Promise<void> {
    // no-op
  }

  async add(_key: CacheKey, _value: unknown, _ttl: CacheTtl): Promise<boolean> {
    return false;
  }

  async forget(_key: CacheKey): Promise<boolean> {
    return false;
  }

  async flush(): Promise<void> {
    // no-op
  }

  async increment(_key: CacheKey, _value = 1): Promise<number> {
    return 0;
  }

  async decrement(_key: CacheKey, _value = 1): Promise<number> {
    return 0;
  }
}
