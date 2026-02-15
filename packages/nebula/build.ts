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

  // Copy and export all source files to dist as .d.ts to ensure types are available
  const srcDir = path.join(packageDir, 'src')
  const files = fs.readdirSync(srcDir)
  for (const file of files) {
    if (file.endsWith('.ts')) {
      const source = path.join(srcDir, file)
      const dest = path.join(distDir, file.replace('.ts', '.d.ts'))
      let content = fs.readFileSync(source, 'utf8')
      // Convert all interfaces/types to exported ones
      content = content.replace(/^(interface|type|enum|class|function) /gm, 'export $1 ')
      content = content.replace(/^export export /gm, 'export ')
      fs.writeFileSync(dest, content)
    }
  }

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
export * from './types';
export * from './store';

// Deprecated aliases
export { LocalStore as LocalStorageProvider };

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
