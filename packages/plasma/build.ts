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

  // Generate minimal d.ts stub to avoid memory issues
  console.log('Generating .d.ts files...')
  const fs = await import('node:fs')

  const indexDts = `/**
 * @gravito/plasma - In-Memory Cache & Session Store (Redis-backed)
 * @packageDocumentation
 */

// Main Classes
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

export type {
  PlasmaConfig,
  RedisConfig,
  SessionConfig,
  CacheStore,
  SessionPayload,
} from './types';
`

  fs.writeFileSync('dist/index.d.ts', indexDts)

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}

process.exit(0)
