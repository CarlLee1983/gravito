import { execSync } from 'node:child_process'

console.log('Building @gravito/plasma...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT full DTS to avoid memory exhaustion
  execSync(
    'npx tsup src/index.ts --format esm,cjs --external @gravito/core,@gravito/photon,ioredis,bun --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate complete .d.ts file
  console.log('Generating .d.ts files...')
  const fs = await import('node:fs')

  const indexDts = `/**
 * @gravito/plasma - Redis client for Gravito
 * @packageDocumentation
 */

// Errors
export declare class RedisError extends Error {
  constructor(message: string);
}

// Orbit export
export declare class OrbitPlasma {
  constructor(config: any);
}
export type OrbitPlasmaOptions = any;

// Main Classes
export declare class Redis {
  constructor(config?: any);
  get(key: string): Promise<any>;
  set(key: string, value: any, options?: any): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  scan(cursor: number, options?: ScanOptions): Promise<ScanResult>;
  info(): Promise<string>;
  flushdb(): Promise<void>;
  flushall(): Promise<void>;
  lpush(key: string, ...values: any[]): Promise<number>;
  rpush(key: string, ...values: any[]): Promise<number>;
  lpop(key: string): Promise<any>;
  rpop(key: string): Promise<any>;
  lrange(key: string, start: number, end: number): Promise<any[]>;
  sadd(key: string, ...members: any[]): Promise<number>;
  srem(key: string, ...members: any[]): Promise<number>;
  smembers(key: string): Promise<any[]>;
  zadd(key: string, options?: ZAddOptions): Promise<number>;
  zrange(key: string, start: number, end: number, options?: ZRangeOptions): Promise<any[]>;
  zrem(key: string, ...members: any[]): Promise<number>;
  hset(key: string, field: string, value: any): Promise<number>;
  hget(key: string, field: string): Promise<any>;
  hdel(key: string, field: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, any>>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<number>;
  pttl(key: string): Promise<number>;
  pipeline(): RedisPipelineContract;
  subscribe(...channels: string[]): Promise<void>;
  unsubscribe(...channels: string[]): Promise<void>;
  publish(channel: string, message: any): Promise<number>;
  on(event: string, listener: any): void;
  off(event: string, listener: any): void;
  once(event: string, listener: any): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Static methods
  static configure(config: RedisManagerConfig): void;
  static addConnection(name: string, config: RedisConfig): void;
  static connection(name?: string): RedisClientContract;
  static scripts(name?: string): any;
}

export declare class RedisClient {
  constructor(config?: any);
}

export declare class RedisManager {
  constructor(config?: RedisManagerConfig);
  connection(name?: string): RedisClientContract;
}

export declare class RedisStore {
  constructor(config?: any);
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export declare class SessionStore {
  constructor(config?: any);
  all(): Promise<Record<string, any>>;
  pull(id: string): Promise<any>;
  push(id: string, payload: any): Promise<void>;
  touch(id: string): Promise<void>;
  destroy(id: string): Promise<void>;
}

// Type exports
export type RedisClientContract = any;
export type PipelineResult = any;
export type RedisConfig = any;
export type RedisManagerConfig = any;
export type RedisPipelineContract = any;
export type ScanOptions = any;
export type ScanResult = any;
export type SetOptions = any;
export type TLSOptions = any;
export type ZAddOptions = any;
export type ZRangeOptions = any;
`

  fs.writeFileSync('dist/index.d.ts', indexDts)

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}

process.exit(0)
