import { execSync } from 'node:child_process'

console.log('Building @gravito/nebula...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT full DTS to avoid memory exhaustion
  execSync(
    'npx tsup src/index.ts --format esm,cjs --external @gravito/core,@gravito/photon --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate d.ts files manually
  console.log('Generating .d.ts files...')
  const fs = await import('node:fs')
  const path = await import('node:path')
  const packageDir = import.meta.dir
  const distDir = path.join(packageDir, 'dist')

  // Generate index.d.ts with proper type exports
  const indexDts = `/**
 * @gravito/nebula - Unified Storage Abstraction Layer
 * @packageDocumentation
 */

// Main Classes
export declare class OrbitNebula {
  constructor(options?: any);
  install(core: any): void;
  getStorage(): StorageManager;
}

export declare class StorageManager {
  constructor(factory: any, options?: any, hooks?: any);
  disk(name?: string): StorageStore;
  put(path: string, content: any, options?: any): Promise<void>;
  get(path: string): Promise<any>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  size(path: string): Promise<number>;
  lastModified(path: string): Promise<Date>;
  list(path?: string, options?: any): Promise<any>;
  getUrl(path: string): string;
  getTemporaryUrl(path: string, expiresIn?: number): Promise<string>;
}

export declare class StorageRepository {
  constructor(store: StorageStore);
  put(path: string, content: any, options?: any): Promise<void>;
  get(path: string): Promise<any>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  size(path: string): Promise<number>;
  lastModified(path: string): Promise<Date>;
  list(path?: string, options?: any): Promise<any>;
  getUrl(path: string): string;
  getTemporaryUrl(path: string, expiresIn?: number): Promise<string>;
}

// Store Classes
export declare class LocalStore {
  constructor(root?: string, baseUrl?: string);
  put(path: string, content: any, options?: any): Promise<void>;
  get(path: string): Promise<any>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  size(path: string): Promise<number>;
  lastModified(path: string): Promise<Date>;
  list(path?: string, options?: any): Promise<any>;
  getUrl(path: string): string;
}

export declare class MemoryStore {
  constructor();
  put(path: string, content: any, options?: any): Promise<void>;
  get(path: string): Promise<any>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  size(path: string): Promise<number>;
  lastModified(path: string): Promise<Date>;
  list(path?: string, options?: any): Promise<any>;
  getUrl(path: string): string;
}

export declare class NullStore {
  put(path: string, content: any, options?: any): Promise<void>;
  get(path: string): Promise<any>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  size(path: string): Promise<number>;
  lastModified(path: string): Promise<Date>;
  list(path?: string, options?: any): Promise<any>;
  getUrl(path: string): string;
}

// Interfaces & Types
export type {
  StorageStore,
  StorageProvider,
  OrbitNebulaOptions,
  StorageHooks,
  StorageMetadata,
  PutOptions,
  StorageItem,
  ListOptions,
  ListResult,
} from './types';

// Deprecated aliases
export type { StorageStore as StorageProvider };
export { LocalStore as LocalStorageProvider };
export type { OrbitNebulaOptions as OrbitStorageOptions };

// Default export
export default function orbitStorage(core: any, options: any): StorageManager;

// Module augmentation
declare module '@gravito/core' {
  interface GravitoVariables {
    storage: StorageManager;
  }
}
`

  fs.writeFileSync(path.join(distDir, 'index.d.ts'), indexDts)

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}

process.exit(0)
