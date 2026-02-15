#!/usr/bin/env bun
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

  // Generate .d.ts file manually
  console.log('Generating .d.ts files...')
  const fs = await import('node:fs')

  const indexDts = `/**
 * @gravito/nebula - Storage Orbit for Galaxy Architecture
 * @packageDocumentation
 */

// Main Class
export declare class OrbitNebula {
  constructor(options?: any);
  install(core: any): void;
  getStorage(): StorageManager;
}

export declare function orbitStorage(core: any, options: any): StorageManager;

// Storage Manager & Repositories
export declare class StorageManager {
  disk(name?: string): StorageStore;
}

export declare class StorageRepository {
  constructor(store: StorageStore);
}

// Storage Stores
export declare class LocalStore implements StorageStore {
  constructor(root: string, baseUrl?: string);
  get(path: string): Promise<Buffer | null>;
  put(path: string, content: Buffer | string, options?: any): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  url(path: string): string;
  listDir(directory: string, options?: any): Promise<any[]>;
}

export declare class MemoryStore implements StorageStore {
  get(path: string): Promise<Buffer | null>;
  put(path: string, content: Buffer | string, options?: any): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  url(path: string): string;
}

export declare class NullStore implements StorageStore {
  get(path: string): Promise<Buffer | null>;
  put(path: string, content: Buffer | string, options?: any): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  url(path: string): string;
}

// Core Interfaces & Types
export interface StorageStore {
  [key: string]: any;
}

export interface OrbitNebulaOptions {
  default?: string;
  disks?: Record<string, any>;
  local?: { root: string; baseUrl?: string };
  provider?: StorageStore;
  exposeAs?: string;
}

export interface StorageMetadata {
  [key: string]: any;
}

export interface PutOptions {
  [key: string]: any;
}

export interface StorageItem {
  [key: string]: any;
}

export interface ListOptions {
  [key: string]: any;
}

export interface ListResult {
  [key: string]: any;
}

// Deprecated Aliases
export type StorageProvider = StorageStore;
export type OrbitStorageOptions = OrbitNebulaOptions;
export const OrbitStorage: typeof OrbitNebula;
`

  fs.writeFileSync('dist/index.d.ts', indexDts)

  console.log('✅ Build complete!')
} catch (error) {
  console.error('❌ Build failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}

process.exit(0)
