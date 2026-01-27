# @gravito/nebula v4.0 完整重構計劃

> **建立日期**: 2026-01-22  
> **目標版本**: v4.0.0  
> **預計工時**: ~7 小時  
> **作者**: AI Architect + Carl Lee

---

## 📋 目錄

1. [執行摘要](#執行摘要)
2. [背景與動機](#背景與動機)
3. [架構設計](#架構設計)
4. [實作步驟](#實作步驟)
5. [Breaking Changes](#breaking-changes)
6. [測試策略](#測試策略)
7. [遷移指南](#遷移指南)

---

## 執行摘要

### 核心目標

將 `@gravito/nebula` 從簡單的 Provider 模式升級為與 `@gravito/stasis` 一致的 **Manager + Store Driver** 架構，提供更強大的多磁碟支援和擴展性。

### 關鍵改進

- ✅ **架構統一**: 採用與 Stasis 相同的 Manager 模式
- ✅ **功能擴展**: 新增 `exists/copy/move/getMetadata` 等方法
- ✅ **多磁碟支援**: 支援 `storage.disk('s3').put(...)` 語法
- ✅ **型別安全**: 消除不必要的可選鏈，強化型別推論
- ✅ **程式碼品質**: 消除重複邏輯，提升可維護性

### 預期成果

```typescript
// v3.x (舊版)
const storage = orbitStorage(core, {
  local: { root: './uploads' }
})
await storage.put('file.txt', data)

// v4.0 (新版)
const storage = orbitStorage(core, {
  default: 'local',
  disks: {
    local: { driver: 'local', root: './uploads' },
    s3: { driver: 's3', bucket: 'my-bucket' }
  }
})

await storage.put('file.txt', data)          // 使用預設磁碟
await storage.disk('s3').put('file.txt', data) // 使用指定磁碟
await storage.exists('file.txt')             // 新增功能
await storage.copy('a.txt', 'b.txt')         // 新增功能
```

---

## 背景與動機

### 現有問題分析

#### 1. 程式碼重複 (DRY 違反)

**問題位置**: `src/index.ts` Line 248-259 與 Line 312-320

```typescript
// OrbitNebula.install() 中
const storageService: StorageProvider = {
  put: async (key: string, data: Blob | Buffer | string) => {
    const finalData = await core.hooks.applyFilters('storage:upload', data, { key })
    await provider?.put(key, finalData)
    await core.hooks.doAction('storage:uploaded', { key })
  },
  get: (key: string) => provider?.get(key),
  delete: (key: string) => provider?.delete(key),
  getUrl: (key: string) => provider?.getUrl(key),
}

// orbitStorage() functional API 中
return {
  put: async (key: string, data: Blob | Buffer | string) => {
    const finalData = await core.hooks.applyFilters('storage:upload', data, { key })
    await provider?.put(key, finalData)
    await core.hooks.doAction('storage:uploaded', { key })
  },
  get: (key: string) => provider?.get(key),
  delete: (key: string) => provider?.delete(key),
  getUrl: (key: string) => provider?.getUrl(key),
}
```

**影響**: 維護兩份相同邏輯，容易產生不一致。

---

#### 2. 型別安全問題

**問題位置**: Line 256-258

```typescript
get: (key: string) => provider?.get(key),      // ❌ 不必要的可選鏈
delete: (key: string) => provider?.delete(key), // ❌ provider 已經過檢查
getUrl: (key: string) => provider?.getUrl(key), // ❌ 不可能為 null
```

**原因**: Line 242-246 已檢查 `provider` 非空

```typescript
if (!provider) {
  throw new Error('[OrbitNebula] No provider configured.')
}
```

---

#### 3. 缺乏統一管理器

與 `@gravito/stasis` 的 `CacheManager` 相比，Nebula 缺少統一的管理入口：

| 功能 | Stasis | Nebula (v3) |
|------|--------|-------------|
| 多 Store 支援 | ✅ `cache.store('redis')` | ❌ 僅單一 Provider |
| 取得實例 | ✅ `orbit.getCache()` | ❌ 無法取得 |
| 集中配置 | ✅ `stores: { ... }` | ❌ 扁平配置 |

---

#### 4. 功能不完整

缺少標準檔案操作方法：

| 方法 | 說明 | 優先級 |
|------|------|--------|
| `exists(key)` | 檢查檔案是否存在 | 🔴 高 |
| `copy(from, to)` | 複製檔案 | 🟠 中 |
| `move(from, to)` | 移動檔案 | 🟠 中 |
| `getMetadata(key)` | 取得檔案資訊 | 🟠 中 |
| `list(prefix?)` | 列出檔案 | 🟡 低 (需 RuntimeAdapter 擴展) |
| `getSignedUrl(key, ttl)` | 產生簽名 URL | 🟡 低 |

---

## 架構設計

### 新檔案結構

```
packages/nebula/
├── src/
│   ├── index.ts                    # 匯出入口 + OrbitNebula
│   ├── StorageManager.ts           # 🆕 管理器核心
│   ├── StorageRepository.ts        # 🆕 Repository (hooks 整合)
│   ├── store.ts                    # 🆕 StorageStore 介面定義
│   ├── types.ts                    # 🆕 型別定義集中
│   └── stores/
│       ├── LocalStore.ts           # 🆕 本地磁碟 (重構自 LocalStorageProvider)
│       ├── MemoryStore.ts          # 🆕 記憶體儲存 (測試用)
│       └── NullStore.ts            # 🆕 No-op 實作
├── tests/
│   ├── StorageManager.test.ts      # 🆕 管理器測試
│   ├── StorageRepository.test.ts   # 🆕 Repository 測試
│   ├── stores/
│   │   ├── LocalStore.test.ts      # 🆕 LocalStore 測試
│   │   └── MemoryStore.test.ts     # 🆕 MemoryStore 測試
│   ├── security.test.ts            # 🆕 安全測試
│   └── index.test.ts               # 🔄 整合測試 (保留部分)
└── ...
```

---

### 元件架構圖

```
┌──────────────────────────────────────────────────────────────┐
│                        OrbitNebula                           │
│                   (GravitoOrbit 實作)                         │
│  - install(core): void                                       │
│  - getStorage(): StorageManager                              │
└───────────────────────────┬──────────────────────────────────┘
                            │ 建立
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     StorageManager                           │
│  - disk(name?: string): StorageRepository                    │
│  - put/get/delete/exists/... (代理到預設磁碟)                  │
└───────────────────────────┬──────────────────────────────────┘
                            │ 管理多個
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   StorageRepository                          │
│  - put(key, data): Promise<void>                             │
│  - get(key): Promise<Blob | null>                            │
│  - delete(key): Promise<boolean>                             │
│  - exists(key): Promise<boolean>          🆕                 │
│  - copy(from, to): Promise<void>          🆕                 │
│  - move(from, to): Promise<void>          🆕                 │
│  - getMetadata(key): Promise<Metadata>    🆕                 │
│  - getUrl(key): string                                       │
│  - getSignedUrl(key, ttl): Promise<string> 🆕 (可選)         │
│  - list(prefix?): AsyncIterable<Item>     🆕 (可選)          │
│                                                              │
│  🪝 Hooks 整合:                                               │
│  - storage:upload (Filter)                                   │
│  - storage:uploaded (Action)                                 │
│  - storage:hit / storage:miss (Action)                       │
│  - storage:copied / storage:moved (Action) 🆕                │
└───────────────────────────┬──────────────────────────────────┘
                            │ 使用
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                      StorageStore                            │
│                  (底層儲存介面)                               │
├──────────────────────────────────────────────────────────────┤
│  LocalStore    - 本地檔案系統                                 │
│  MemoryStore   - 記憶體儲存 (測試用)                          │
│  NullStore     - No-op 實作                                  │
│  [Future]      - S3Store, GCSStore, AzureStore...            │
└──────────────────────────────────────────────────────────────┘
```

---

### 設計原則

1. **關注點分離**
   - `StorageManager`: 磁碟管理與路由
   - `StorageRepository`: 業務邏輯與 Hooks
   - `StorageStore`: 底層儲存實作

2. **開放封閉原則**
   - 新增 Store 只需實作 `StorageStore` 介面
   - 無需修改核心程式碼

3. **依賴反轉**
   - Repository 依賴抽象 `StorageStore`
   - 不依賴具體實作 (LocalStore, S3Store)

---

## 實作步驟

### Phase 1: 型別與介面定義 (30 分鐘)

#### 1.1 建立 `src/store.ts`

```typescript
/**
 * 底層儲存介面
 * 
 * 所有儲存後端 (Local, S3, GCS 等) 必須實作此介面
 * 
 * @public
 * @since 4.0.0
 */
export interface StorageStore {
  // ==================== 基本操作 ====================
  
  /**
   * 儲存檔案
   * @param key - 檔案路徑 (例如: 'avatars/user1.jpg')
   * @param data - 檔案內容
   */
  put(key: string, data: Blob | Buffer | string): Promise<void>
  
  /**
   * 讀取檔案
   * @param key - 檔案路徑
   * @returns 檔案內容，若不存在則回傳 null
   */
  get(key: string): Promise<Blob | null>
  
  /**
   * 刪除檔案
   * @param key - 檔案路徑
   * @returns 是否成功刪除 (若檔案不存在則回傳 false)
   */
  delete(key: string): Promise<boolean>
  
  /**
   * 檢查檔案是否存在
   * @param key - 檔案路徑
   */
  exists(key: string): Promise<boolean>
  
  // ==================== 進階操作 ====================
  
  /**
   * 複製檔案
   * @param from - 來源路徑
   * @param to - 目標路徑
   */
  copy(from: string, to: string): Promise<void>
  
  /**
   * 移動/重命名檔案
   * @param from - 來源路徑
   * @param to - 目標路徑
   */
  move(from: string, to: string): Promise<void>
  
  /**
   * 列出檔案 (可選實作，需要 RuntimeAdapter 支援)
   * @param prefix - 路徑前綴 (例如: 'uploads/')
   */
  list?(prefix?: string): AsyncIterable<StorageItem>
  
  // ==================== 元資料 ====================
  
  /**
   * 取得檔案元資料
   * @param key - 檔案路徑
   */
  getMetadata(key: string): Promise<StorageMetadata | null>
  
  // ==================== URL ====================
  
  /**
   * 取得公開 URL
   * @param key - 檔案路徑
   */
  getUrl(key: string): string
  
  /**
   * 取得有時效的簽名 URL (可選實作)
   * @param key - 檔案路徑
   * @param expiresIn - 過期時間 (秒)
   */
  getSignedUrl?(key: string, expiresIn: number): Promise<string>
}

/**
 * 檔案元資料
 * @public
 */
export interface StorageMetadata {
  /** 檔案路徑 */
  key: string
  /** 檔案大小 (bytes) */
  size: number
  /** MIME 類型 */
  mimeType?: string
  /** 最後修改時間 */
  lastModified?: Date
  /** ETag (用於快取驗證) */
  etag?: string
}

/**
 * 檔案清單項目
 * @public
 */
export interface StorageItem {
  /** 檔案路徑 */
  key: string
  /** 是否為目錄 */
  isDirectory: boolean
  /** 檔案大小 (目錄為 undefined) */
  size?: number
  /** 最後修改時間 */
  lastModified?: Date
}
```

---

#### 1.2 建立 `src/types.ts`

```typescript
import type { StorageStore } from './store'

/**
 * 單一磁碟配置
 * @public
 */
export type OrbitNebulaStoreConfig =
  | {
      /** 本地檔案系統 */
      driver: 'local'
      /** 根目錄路徑 */
      root: string
      /** 公開 URL 前綴 @default '/storage' */
      baseUrl?: string
    }
  | {
      /** 記憶體儲存 (測試用) */
      driver: 'memory'
    }
  | {
      /** No-op 儲存 (不執行任何操作) */
      driver: 'null'
    }
  | {
      /** 自訂 StorageStore 實作 */
      driver: 'custom'
      store: StorageStore
    }

/**
 * OrbitNebula 配置選項
 * @public
 */
export interface OrbitNebulaOptions {
  /**
   * 預設磁碟名稱
   * @default 'local'
   */
  default?: string

  /**
   * 暴露於 Context 的 key
   * @default 'storage'
   * @example
   * // exposeAs: 'storage'
   * const storage = c.get('storage')
   */
  exposeAs?: string

  /**
   * 磁碟配置
   * @example
   * {
   *   disks: {
   *     local: { driver: 'local', root: './uploads' },
   *     temp: { driver: 'memory' },
   *     s3: { driver: 'custom', store: new S3Store(...) }
   *   }
   * }
   */
  disks?: Record<string, OrbitNebulaStoreConfig>

  /**
   * Hooks 執行模式
   * - 'async': 非同步執行，不阻塞操作 (建議)
   * - 'sync': 同步執行，Hook 錯誤會拋出
   * @default 'async'
   */
  eventsMode?: 'sync' | 'async'

  // ==================== 向後相容 (已棄用) ====================

  /**
   * @deprecated 使用 disks.local 替代
   * @example
   * // 舊版寫法
   * { local: { root: './uploads' } }
   * 
   * // 新版寫法
   * { disks: { local: { driver: 'local', root: './uploads' } } }
   */
  local?: { root: string; baseUrl?: string }

  /**
   * @deprecated 使用 disks[name] = { driver: 'custom', store } 替代
   */
  provider?: StorageStore
}

/**
 * Hooks 回調介面
 * @internal
 */
export interface StorageHooks {
  applyFilter<T>(hook: string, value: T, context?: Record<string, unknown>): Promise<T>
  doAction(hook: string, context?: Record<string, unknown>): Promise<void>
}
```

---

### Phase 2: StorageRepository 實作 (45 分鐘)

#### 建立 `src/StorageRepository.ts`

```typescript
import type { StorageHooks, StorageItem, StorageMetadata, StorageStore } from './types'

/**
 * 儲存 Repository
 * 
 * 封裝 StorageStore 的業務邏輯與 Hooks 整合
 * 
 * @public
 * @since 4.0.0
 */
export class StorageRepository {
  constructor(
    private readonly store: StorageStore,
    private readonly hooks?: StorageHooks
  ) {}

  // ==================== 基本操作 ====================

  /**
   * 儲存檔案
   * 
   * @fires storage:upload - Filter hook，可修改上傳資料
   * @fires storage:uploaded - Action hook，上傳完成後觸發
   * 
   * @example
   * await repo.put('avatar.jpg', file)
   */
  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    // Hook: storage:upload (Filter - 可修改資料)
    const finalData = this.hooks
      ? await this.hooks.applyFilter('storage:upload', data, { key })
      : data

    await this.store.put(key, finalData)

    // Hook: storage:uploaded (Action - 記錄/通知)
    if (this.hooks) {
      await this.hooks.doAction('storage:uploaded', { key })
    }
  }

  /**
   * 讀取檔案
   * 
   * @fires storage:hit - 檔案存在時觸發
   * @fires storage:miss - 檔案不存在時觸發
   */
  async get(key: string): Promise<Blob | null> {
    const data = await this.store.get(key)

    if (this.hooks) {
      if (data) {
        await this.hooks.doAction('storage:hit', { key })
      } else {
        await this.hooks.doAction('storage:miss', { key })
      }
    }

    return data
  }

  /**
   * 刪除檔案
   * 
   * @fires storage:deleted - 刪除成功後觸發
   */
  async delete(key: string): Promise<boolean> {
    const deleted = await this.store.delete(key)

    if (deleted && this.hooks) {
      await this.hooks.doAction('storage:deleted', { key })
    }

    return deleted
  }

  /**
   * 檢查檔案是否存在
   */
  async exists(key: string): Promise<boolean> {
    return this.store.exists(key)
  }

  // ==================== 進階操作 ====================

  /**
   * 複製檔案
   * 
   * @fires storage:copied - 複製成功後觸發
   */
  async copy(from: string, to: string): Promise<void> {
    await this.store.copy(from, to)

    if (this.hooks) {
      await this.hooks.doAction('storage:copied', { from, to })
    }
  }

  /**
   * 移動/重命名檔案
   * 
   * @fires storage:moved - 移動成功後觸發
   */
  async move(from: string, to: string): Promise<void> {
    await this.store.move(from, to)

    if (this.hooks) {
      await this.hooks.doAction('storage:moved', { from, to })
    }
  }

  /**
   * 列出檔案 (若 Store 支援)
   * 
   * @throws {Error} 若 Store 未實作 list()
   * 
   * @example
   * for await (const item of repo.list('uploads/')) {
   *   console.log(item.key, item.size)
   * }
   */
  async *list(prefix?: string): AsyncIterable<StorageItem> {
    if (!this.store.list) {
      throw new Error(
        '[StorageRepository] This storage driver does not support listing files.'
      )
    }

    yield* this.store.list(prefix)
  }

  // ==================== 元資料 ====================

  /**
   * 取得檔案元資料
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.store.getMetadata(key)
  }

  // ==================== URL ====================

  /**
   * 取得公開 URL
   */
  getUrl(key: string): string {
    return this.store.getUrl(key)
  }

  /**
   * 取得有時效的簽名 URL (若 Store 支援)
   * 
   * @throws {Error} 若 Store 未實作 getSignedUrl()
   */
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    if (!this.store.getSignedUrl) {
      throw new Error(
        '[StorageRepository] This storage driver does not support signed URLs.'
      )
    }

    return this.store.getSignedUrl(key, expiresIn)
  }
}
```

---

### Phase 3: StorageManager 實作 (1 小時)

#### 建立 `src/StorageManager.ts`

```typescript
import type { StorageHooks, StorageItem, StorageMetadata, StorageStore } from './types'
import { StorageRepository } from './StorageRepository'

/**
 * 儲存管理器
 * 
 * 管理多個儲存磁碟，提供統一的存取介面
 * 
 * @public
 * @since 4.0.0
 */
export class StorageManager {
  /** Store 實例快取 */
  private stores = new Map<string, StorageStore>()
  
  /** Repository 實例快取 */
  private repositories = new Map<string, StorageRepository>()

  constructor(
    private readonly storeFactory: (name: string) => StorageStore,
    private readonly options: {
      /** 預設磁碟名稱 */
      default: string
      /** 全域 key 前綴 (暫不實作) */
      prefix?: string
    },
    private readonly hooks?: StorageHooks
  ) {}

  // ==================== 磁碟管理 ====================

  /**
   * 取得指定磁碟的 Repository
   * 
   * @param name - 磁碟名稱，未指定則使用預設磁碟
   * 
   * @example
   * const storage = manager.disk('s3')
   * await storage.put('file.txt', data)
   * 
   * @example
   * // 使用預設磁碟
   * const storage = manager.disk()
   * await storage.put('file.txt', data)
   */
  disk(name?: string): StorageRepository {
    const diskName = name ?? this.options.default

    // 快取 Repository 實例
    if (!this.repositories.has(diskName)) {
      const store = this.resolveStore(diskName)
      this.repositories.set(diskName, new StorageRepository(store, this.hooks))
    }

    return this.repositories.get(diskName)!
  }

  /**
   * 解析並快取 Store 實例
   * @internal
   */
  private resolveStore(name: string): StorageStore {
    if (!this.stores.has(name)) {
      this.stores.set(name, this.storeFactory(name))
    }
    return this.stores.get(name)!
  }

  // ==================== 預設磁碟代理方法 ====================

  /**
   * 儲存檔案 (使用預設磁碟)
   * @see StorageRepository.put
   */
  put(key: string, data: Blob | Buffer | string): Promise<void> {
    return this.disk().put(key, data)
  }

  /**
   * 讀取檔案 (使用預設磁碟)
   * @see StorageRepository.get
   */
  get(key: string): Promise<Blob | null> {
    return this.disk().get(key)
  }

  /**
   * 刪除檔案 (使用預設磁碟)
   * @see StorageRepository.delete
   */
  delete(key: string): Promise<boolean> {
    return this.disk().delete(key)
  }

  /**
   * 檢查檔案是否存在 (使用預設磁碟)
   * @see StorageRepository.exists
   */
  exists(key: string): Promise<boolean> {
    return this.disk().exists(key)
  }

  /**
   * 複製檔案 (使用預設磁碟)
   * @see StorageRepository.copy
   */
  copy(from: string, to: string): Promise<void> {
    return this.disk().copy(from, to)
  }

  /**
   * 移動檔案 (使用預設磁碟)
   * @see StorageRepository.move
   */
  move(from: string, to: string): Promise<void> {
    return this.disk().move(from, to)
  }

  /**
   * 列出檔案 (使用預設磁碟)
   * @see StorageRepository.list
   */
  list(prefix?: string): AsyncIterable<StorageItem> {
    return this.disk().list(prefix)
  }

  /**
   * 取得檔案元資料 (使用預設磁碟)
   * @see StorageRepository.getMetadata
   */
  getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.disk().getMetadata(key)
  }

  /**
   * 取得公開 URL (使用預設磁碟)
   * @see StorageRepository.getUrl
   */
  getUrl(key: string): string {
    return this.disk().getUrl(key)
  }

  /**
   * 取得簽名 URL (使用預設磁碟)
   * @see StorageRepository.getSignedUrl
   */
  getSignedUrl(key: string, expiresIn: number): Promise<string> {
    return this.disk().getSignedUrl(key, expiresIn)
  }
}
```

---

### Phase 4: LocalStore 重構 (1.5 小時)

#### 4.1 建立 `src/stores/LocalStore.ts`

```typescript
import { mkdir } from 'node:fs/promises'
import { isAbsolute, normalize, resolve, sep } from 'node:path'
import { getRuntimeAdapter } from '@gravito/core'
import type { StorageItem, StorageMetadata, StorageStore } from '../store'

/**
 * 本地檔案系統儲存
 * 
 * @public
 * @since 4.0.0
 */
export class LocalStore implements StorageStore {
  private runtime = getRuntimeAdapter()

  constructor(
    private readonly rootDir: string,
    private readonly baseUrl = '/storage'
  ) {}

  // ==================== 基本操作 ====================

  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    const path = this.resolvePath(key)
    
    // 確保目錄存在
    await this.ensureDirectory(path)
    
    await this.runtime.writeFile(path, data)
  }

  async get(key: string): Promise<Blob | null> {
    if (!(await this.exists(key))) {
      return null
    }

    const path = this.resolvePath(key)
    return this.runtime.readFileAsBlob(path)
  }

  async delete(key: string): Promise<boolean> {
    if (!(await this.exists(key))) {
      return false
    }

    const path = this.resolvePath(key)
    await this.runtime.deleteFile(path)
    return true
  }

  async exists(key: string): Promise<boolean> {
    const path = this.resolvePath(key)
    return this.runtime.exists(path)
  }

  // ==================== 進階操作 ====================

  async copy(from: string, to: string): Promise<void> {
    const data = await this.get(from)
    if (!data) {
      throw new Error(`[LocalStore] Source file not found: ${from}`)
    }
    await this.put(to, data)
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  /**
   * 列出檔案
   * 
   * ⚠️ 注意: 目前 RuntimeAdapter 不支援 readDir，此方法暫時拋出錯誤
   * 
   * @todo 待 @gravito/core 擴展 RuntimeAdapter 後實作
   */
  async *list(prefix = ''): AsyncIterable<StorageItem> {
    throw new Error(
      '[LocalStore] list() is not yet implemented. ' +
      'Requires RuntimeAdapter.readDir() support in @gravito/core.'
    )

    // 未來實作範例:
    // const dir = prefix ? this.resolvePath(prefix) : this.rootDir
    // for await (const entry of this.runtime.readDir(dir)) {
    //   yield {
    //     key: prefix ? `${prefix}/${entry.name}` : entry.name,
    //     isDirectory: entry.isDirectory,
    //     size: entry.size,
    //     lastModified: entry.mtime,
    //   }
    // }
  }

  // ==================== 元資料 ====================

  async getMetadata(key: string): Promise<StorageMetadata | null> {
    if (!(await this.exists(key))) {
      return null
    }

    const path = this.resolvePath(key)
    const stat = await this.runtime.stat(path)

    return {
      key,
      size: stat.size,
      mimeType: this.guessMimeType(key),
      lastModified: stat.mtime,
    }
  }

  // ==================== URL ====================

  getUrl(key: string): string {
    const safeKey = this.normalizeKey(key)
    return `${this.baseUrl}/${safeKey}`
  }

  // ==================== 內部方法 ====================

  /**
   * 正規化 key，防止路徑遍歷攻擊
   * 
   * @throws {Error} 若 key 不合法
   */
  private normalizeKey(key: string): string {
    // 1. 檢查空值與 null byte
    if (!key || key.includes('\0')) {
      throw new Error('[LocalStore] Invalid storage key: empty or contains null byte.')
    }

    // 2. 正規化路徑並移除前綴斜線
    const normalized = normalize(key).replace(/^[/\\]+/, '')

    // 3. 禁止 ./ ../ 與絕對路徑
    if (
      normalized === '.' ||
      normalized === '..' ||
      normalized.startsWith(`..${sep}`) ||
      normalized.startsWith(`.${sep}`) ||
      isAbsolute(normalized)
    ) {
      throw new Error('[LocalStore] Invalid storage key: path traversal attempt.')
    }

    // 4. 統一使用正斜線
    return normalized.replace(/\\/g, '/')
  }

  /**
   * 解析完整檔案路徑
   * 
   * @throws {Error} 若解析後的路徑超出 rootDir
   */
  private resolvePath(key: string): string {
    const normalized = this.normalizeKey(key)
    const root = resolve(this.rootDir)
    const resolved = resolve(root, normalized)

    // 確保解析後的路徑仍在 rootDir 內
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`
    if (!resolved.startsWith(rootPrefix) && resolved !== root) {
      throw new Error('[LocalStore] Invalid storage key: resolved path outside root.')
    }

    return resolved
  }

  /**
   * 確保父目錄存在
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf(sep))
    if (dir && dir !== this.rootDir) {
      await mkdir(dir, { recursive: true })
    }
  }

  /**
   * 根據副檔名猜測 MIME 類型
   */
  private guessMimeType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      zip: 'application/zip',
    }
    return mimeTypes[ext ?? ''] ?? 'application/octet-stream'
  }
}
```

---

#### 4.2 建立 `src/stores/MemoryStore.ts`

```typescript
import type { StorageItem, StorageMetadata, StorageStore } from '../store'

interface MemoryFile {
  data: Blob
  metadata: StorageMetadata
}

/**
 * 記憶體儲存 (測試用)
 * 
 * @public
 * @since 4.0.0
 */
export class MemoryStore implements StorageStore {
  private files = new Map<string, MemoryFile>()

  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    const blob = data instanceof Blob ? data : new Blob([data])
    
    this.files.set(key, {
      data: blob,
      metadata: {
        key,
        size: blob.size,
        mimeType: blob.type || 'application/octet-stream',
        lastModified: new Date(),
      },
    })
  }

  async get(key: string): Promise<Blob | null> {
    return this.files.get(key)?.data ?? null
  }

  async delete(key: string): Promise<boolean> {
    return this.files.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key)
  }

  async copy(from: string, to: string): Promise<void> {
    const file = this.files.get(from)
    if (!file) {
      throw new Error(`[MemoryStore] Source file not found: ${from}`)
    }

    this.files.set(to, {
      data: file.data,
      metadata: { ...file.metadata, key: to, lastModified: new Date() },
    })
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  async *list(prefix = ''): AsyncIterable<StorageItem> {
    for (const [key, file] of this.files.entries()) {
      if (key.startsWith(prefix)) {
        yield {
          key,
          isDirectory: false,
          size: file.metadata.size,
          lastModified: file.metadata.lastModified,
        }
      }
    }
  }

  async getMetadata(key: string): Promise<StorageMetadata | null> {
    return this.files.get(key)?.metadata ?? null
  }

  getUrl(key: string): string {
    return `/memory/${key}`
  }
}
```

---

#### 4.3 建立 `src/stores/NullStore.ts`

```typescript
import type { StorageItem, StorageMetadata, StorageStore } from '../store'

/**
 * No-op 儲存 (不執行任何操作)
 * 
 * 用於測試或停用儲存功能
 * 
 * @public
 * @since 4.0.0
 */
export class NullStore implements StorageStore {
  async put(_key: string, _data: Blob | Buffer | string): Promise<void> {
    // Do nothing
  }

  async get(_key: string): Promise<Blob | null> {
    return null
  }

  async delete(_key: string): Promise<boolean> {
    return false
  }

  async exists(_key: string): Promise<boolean> {
    return false
  }

  async copy(_from: string, _to: string): Promise<void> {
    // Do nothing
  }

  async move(_from: string, _to: string): Promise<void> {
    // Do nothing
  }

  async *list(_prefix?: string): AsyncIterable<StorageItem> {
    // Yield nothing
  }

  async getMetadata(_key: string): Promise<StorageMetadata | null> {
    return null
  }

  getUrl(key: string): string {
    return `/null/${key}`
  }
}
```

---

### Phase 5: OrbitNebula 重構 (1 小時)

#### 更新 `src/index.ts`

```typescript
import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { StorageManager } from './StorageManager'
import type { OrbitNebulaOptions, OrbitNebulaStoreConfig, StorageHooks } from './types'
import { LocalStore } from './stores/LocalStore'
import { MemoryStore } from './stores/MemoryStore'
import { NullStore } from './stores/NullStore'
import type { StorageStore } from './store'

// ==================== 匯出 ====================

export * from './StorageManager'
export * from './StorageRepository'
export * from './store'
export * from './stores/LocalStore'
export * from './stores/MemoryStore'
export * from './stores/NullStore'
export * from './types'

// ==================== 向後相容 ====================

/** @deprecated 使用 StorageStore 替代 */
export type StorageProvider = StorageStore

/** @deprecated 使用 LocalStore 替代 */
export { LocalStore as LocalStorageProvider }

/** @deprecated 使用 OrbitNebulaOptions 替代 */
export type OrbitStorageOptions = OrbitNebulaOptions

// ==================== OrbitNebula ====================

/**
 * Nebula 儲存 Orbit
 * 
 * 提供統一的檔案儲存抽象層，支援多磁碟配置
 * 
 * @example
 * ```typescript
 * const nebula = new OrbitNebula({
 *   default: 'local',
 *   disks: {
 *     local: { driver: 'local', root: './uploads' },
 *     temp: { driver: 'memory' }
 *   }
 * })
 * 
 * core.addOrbit(nebula)
 * 
 * // 在路由中使用
 * app.post('/upload', async (c) => {
 *   const storage = c.get('storage')
 *   await storage.put('file.txt', data)
 * })
 * ```
 * 
 * @public
 * @since 4.0.0
 */
export class OrbitNebula implements GravitoOrbit {
  private manager?: StorageManager

  constructor(private options?: OrbitNebulaOptions) {}

  /**
   * 安裝 Orbit 到 PlanetCore
   */
  install(core: PlanetCore): void {
    const config = this.resolveConfig(core)
    const exposeAs = config.exposeAs ?? 'storage'
    const defaultDisk = config.default ?? 'local'

    const logger = core.logger
    logger.info(`[OrbitNebula] Initializing Storage (exposed as: ${exposeAs}, default: ${defaultDisk})`)

    // 建立 Hooks 整合
    const hooks: StorageHooks = {
      applyFilter: (hook, value, ctx) => core.hooks.applyFilters(hook, value, ctx),
      doAction: (hook, ctx) => core.hooks.doAction(hook, ctx),
    }

    // 建立 StorageManager
    const manager = new StorageManager(
      this.createStoreFactory(config),
      { default: defaultDisk },
      hooks
    )

    this.manager = manager

    // 注入 Context
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set(exposeAs, manager)
      return next()
    })

    // 註冊到 Container (供 CLI/Job 使用)
    core.container.instance(exposeAs, manager)

    // Hook: 初始化完成
    core.hooks.doAction('storage:init', manager)
  }

  /**
   * 取得已安裝的 StorageManager
   * 
   * @throws {Error} 若尚未安裝
   */
  getStorage(): StorageManager {
    if (!this.manager) {
      throw new Error('[OrbitNebula] Not installed yet. Call install(core) first.')
    }
    return this.manager
  }

  // ==================== 內部方法 ====================

  /**
   * 解析配置 (優先順序: 建構子 > core.config > 預設值)
   */
  private resolveConfig(core: PlanetCore): Required<Pick<OrbitNebulaOptions, 'disks' | 'default' | 'exposeAs'>> & OrbitNebulaOptions {
    // 優先使用建構子參數
    if (this.options) {
      return {
        ...this.options,
        disks: this.resolveDisks(this.options),
        default: this.options.default ?? 'local',
        exposeAs: this.options.exposeAs ?? 'storage',
      }
    }

    // 其次從 core.config 讀取
    if (core.config.has('storage')) {
      const coreConfig = core.config.get<OrbitNebulaOptions>('storage')
      return {
        ...coreConfig,
        disks: this.resolveDisks(coreConfig),
        default: coreConfig.default ?? 'local',
        exposeAs: coreConfig.exposeAs ?? 'storage',
      }
    }

    // 預設配置
    throw new Error(
      '[OrbitNebula] No configuration found. ' +
      'Please provide options in constructor or set "storage" in core.config.'
    )
  }

  /**
   * 解析磁碟配置 (處理向後相容)
   */
  private resolveDisks(config: OrbitNebulaOptions): Record<string, OrbitNebulaStoreConfig> {
    // 優先使用新版 disks 配置
    if (config.disks) {
      return config.disks
    }

    // 向後相容: local 選項
    if (config.local) {
      return {
        local: {
          driver: 'local',
          root: config.local.root,
          baseUrl: config.local.baseUrl,
        },
      }
    }

    // 向後相容: provider 選項
    if (config.provider) {
      return {
        default: {
          driver: 'custom',
          store: config.provider,
        },
      }
    }

    return {}
  }

  /**
   * 建立 Store Factory
   */
  private createStoreFactory(config: ReturnType<typeof this.resolveConfig>) {
    return (name: string): StorageStore => {
      const diskConfig = config.disks[name]

      if (!diskConfig) {
        throw new Error(
          `[OrbitNebula] Disk "${name}" is not configured. ` +
          `Available disks: ${Object.keys(config.disks).join(', ')}`
        )
      }

      switch (diskConfig.driver) {
        case 'local':
          return new LocalStore(diskConfig.root, diskConfig.baseUrl)

        case 'memory':
          return new MemoryStore()

        case 'null':
          return new NullStore()

        case 'custom':
          return diskConfig.store

        default:
          throw new Error(`[OrbitNebula] Unknown driver: ${(diskConfig as any).driver}`)
      }
    }
  }
}

// ==================== Functional API ====================

/**
 * Functional API for installing OrbitNebula
 * 
 * @example
 * ```typescript
 * const storage = orbitStorage(core, {
 *   disks: {
 *     local: { driver: 'local', root: './uploads' }
 *   }
 * })
 * 
 * await storage.put('file.txt', data)
 * ```
 * 
 * @public
 */
export default function orbitStorage(
  core: PlanetCore,
  options: OrbitNebulaOptions
): StorageManager {
  const orbit = new OrbitNebula(options)
  orbit.install(core)
  return orbit.getStorage()
}

/** @deprecated 使用 OrbitNebula 替代 */
export const OrbitStorage = OrbitNebula

// ==================== Module Augmentation ====================

declare module '@gravito/core' {
  interface GravitoVariables {
    /** File storage service */
    storage: StorageManager
  }
}
```

---

### Phase 6: 測試補全 (1.5 小時)

#### 6.1 建立 `tests/stores/LocalStore.test.ts`

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalStore } from '../../src/stores/LocalStore'

let tempDir = ''
let store: LocalStore

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nebula-localstore-'))
  store = new LocalStore(tempDir, '/storage')
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

describe('LocalStore - Basic Operations', () => {
  it('should put and get file', async () => {
    await store.put('test.txt', 'hello world')
    
    const data = await store.get('test.txt')
    expect(data).toBeInstanceOf(Blob)
    expect(await data?.text()).toBe('hello world')
  })

  it('should return null for non-existent file', async () => {
    const data = await store.get('non-existent.txt')
    expect(data).toBeNull()
  })

  it('should delete file', async () => {
    await store.put('delete-me.txt', 'temp')
    
    expect(await store.exists('delete-me.txt')).toBe(true)
    expect(await store.delete('delete-me.txt')).toBe(true)
    expect(await store.exists('delete-me.txt')).toBe(false)
  })

  it('should return false when deleting non-existent file', async () => {
    expect(await store.delete('non-existent.txt')).toBe(false)
  })

  it('should check file existence', async () => {
    await store.put('exists.txt', 'content')
    
    expect(await store.exists('exists.txt')).toBe(true)
    expect(await store.exists('missing.txt')).toBe(false)
  })
})

describe('LocalStore - Advanced Operations', () => {
  it('should copy file', async () => {
    await store.put('original.txt', 'original content')
    await store.copy('original.txt', 'copied.txt')
    
    expect(await store.exists('copied.txt')).toBe(true)
    expect(await (await store.get('copied.txt'))?.text()).toBe('original content')
    
    // Original should still exist
    expect(await store.exists('original.txt')).toBe(true)
  })

  it('should throw when copying non-existent file', async () => {
    await expect(store.copy('non-existent.txt', 'dest.txt')).rejects.toThrow()
  })

  it('should move file', async () => {
    await store.put('source.txt', 'move me')
    await store.move('source.txt', 'destination.txt')
    
    expect(await store.exists('source.txt')).toBe(false)
    expect(await store.exists('destination.txt')).toBe(true)
    expect(await (await store.get('destination.txt'))?.text()).toBe('move me')
  })
})

describe('LocalStore - Metadata', () => {
  it('should get file metadata', async () => {
    await store.put('metadata.txt', 'hello world')
    
    const meta = await store.getMetadata('metadata.txt')
    
    expect(meta).toMatchObject({
      key: 'metadata.txt',
      size: 11,
      mimeType: 'text/plain',
    })
    expect(meta?.lastModified).toBeInstanceOf(Date)
  })

  it('should return null for non-existent file metadata', async () => {
    const meta = await store.getMetadata('non-existent.txt')
    expect(meta).toBeNull()
  })

  it('should guess MIME types correctly', async () => {
    const tests = [
      { key: 'file.txt', expected: 'text/plain' },
      { key: 'file.json', expected: 'application/json' },
      { key: 'file.png', expected: 'image/png' },
      { key: 'file.jpg', expected: 'image/jpeg' },
      { key: 'file.pdf', expected: 'application/pdf' },
      { key: 'file.unknown', expected: 'application/octet-stream' },
    ]

    for (const test of tests) {
      await store.put(test.key, 'content')
      const meta = await store.getMetadata(test.key)
      expect(meta?.mimeType).toBe(test.expected)
    }
  })
})

describe('LocalStore - URL Generation', () => {
  it('should generate correct URLs', () => {
    expect(store.getUrl('file.txt')).toBe('/storage/file.txt')
    expect(store.getUrl('dir/file.txt')).toBe('/storage/dir/file.txt')
  })
})

describe('LocalStore - Nested Directories', () => {
  it('should handle nested directory structures', async () => {
    await store.put('deep/nested/dir/file.txt', 'deep content')
    
    expect(await store.exists('deep/nested/dir/file.txt')).toBe(true)
    expect(await (await store.get('deep/nested/dir/file.txt'))?.text()).toBe('deep content')
  })
})
```

---

#### 6.2 建立 `tests/security.test.ts`

```typescript
import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalStore } from '../src/stores/LocalStore'

let tempDir = ''
let store: LocalStore

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nebula-security-'))
  store = new LocalStore(tempDir, '/storage')
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

describe('LocalStore - Path Traversal Prevention', () => {
  const attacks = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config',
    'foo/../../../bar',
    '....//....//etc/passwd',
    '/absolute/path',
    'C:\\absolute\\path',
    'key\x00malicious',
    './current/dir',
    '../parent/dir',
  ]

  for (const attack of attacks) {
    it(`should reject path traversal: ${attack}`, async () => {
      await expect(store.put(attack, 'malicious')).rejects.toThrow(/Invalid storage key/)
    })
  }
})

describe('LocalStore - Edge Cases', () => {
  it('should reject empty key', async () => {
    await expect(store.put('', 'data')).rejects.toThrow()
  })

  it('should reject null byte in key', async () => {
    await expect(store.put('file\x00.txt', 'data')).rejects.toThrow()
  })

  it('should handle special characters in filename', async () => {
    const specialKeys = [
      'file-with-dash.txt',
      'file_with_underscore.txt',
      'file.multiple.dots.txt',
      'file (with spaces).txt',
    ]

    for (const key of specialKeys) {
      await store.put(key, 'content')
      expect(await store.exists(key)).toBe(true)
    }
  })

  it('should handle empty file', async () => {
    await store.put('empty.txt', '')
    const data = await store.get('empty.txt')
    expect(await data?.text()).toBe('')
  })

  it('should handle large file', async () => {
    const largeContent = 'x'.repeat(1024 * 1024) // 1MB
    await store.put('large.txt', largeContent)
    
    const data = await store.get('large.txt')
    expect(await data?.text()).toBe(largeContent)
  })
})

describe('LocalStore - Concurrent Operations', () => {
  it('should handle parallel writes to different keys', async () => {
    const writes = Array.from({ length: 100 }, (_, i) =>
      store.put(`concurrent-${i}.txt`, `content-${i}`)
    )
    
    await Promise.all(writes)
    
    for (let i = 0; i < 100; i++) {
      expect(await store.exists(`concurrent-${i}.txt`)).toBe(true)
    }
  })

  it('should handle parallel reads', async () => {
    await store.put('read-test.txt', 'parallel read content')
    
    const reads = Array.from({ length: 50 }, () =>
      store.get('read-test.txt')
    )
    
    const results = await Promise.all(reads)
    
    for (const result of results) {
      expect(await result?.text()).toBe('parallel read content')
    }
  })
})
```

---

#### 6.3 建立 `tests/StorageManager.test.ts`

```typescript
import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import orbitStorage, { OrbitNebula } from '../src/index'

let tempDir = ''

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nebula-manager-'))
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

const createCore = (config?: any) => {
  let middleware: ((c: any, next: () => Promise<void>) => Promise<undefined | undefined>) | null = null

  const core = {
    config: {
      get: (key: string) => (key === 'storage' ? config : undefined),
      has: (key: string) => key === 'storage' && !!config,
    },
    container: {
      instance: mock(() => {}),
      make: mock(() => {}),
    },
    logger: {
      info: mock(() => {}),
    },
    hooks: {
      applyFilters: mock(async (_hook: string, value: unknown) => value),
      doAction: mock(async () => {}),
    },
    adapter: {
      use: mock((_path: string, handler: typeof middleware) => {
        middleware = handler
      }),
    },
    get middleware() {
      return middleware
    },
  }

  return core
}

describe('OrbitNebula - Multi-Disk Support', () => {
  it('should support multiple disks', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      default: 'local',
      disks: {
        local: { driver: 'local', root: tempDir, baseUrl: '/local' },
        temp: { driver: 'memory' },
      },
    })

    // Write to default disk (local)
    await storage.put('file1.txt', 'local content')
    expect(await storage.exists('file1.txt')).toBe(true)
    expect(storage.getUrl('file1.txt')).toBe('/local/file1.txt')

    // Write to temp disk (memory)
    await storage.disk('temp').put('file2.txt', 'memory content')
    expect(await storage.disk('temp').exists('file2.txt')).toBe(true)
    expect(storage.disk('temp').getUrl('file2.txt')).toBe('/memory/file2.txt')

    // Files should be isolated
    expect(await storage.exists('file2.txt')).toBe(false)
    expect(await storage.disk('temp').exists('file1.txt')).toBe(false)
  })

  it('should cache disk instances', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: {
        local: { driver: 'local', root: tempDir },
      },
    })

    const disk1 = storage.disk('local')
    const disk2 = storage.disk('local')

    // Should return the same instance
    expect(disk1).toBe(disk2)
  })

  it('should throw when accessing non-existent disk', () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: {
        local: { driver: 'local', root: tempDir },
      },
    })

    expect(() => storage.disk('non-existent')).toThrow(/not configured/)
  })
})

describe('OrbitNebula - Backward Compatibility', () => {
  it('should support legacy local option', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      local: { root: tempDir, baseUrl: '/legacy' },
    })

    await storage.put('legacy.txt', 'legacy content')
    expect(await storage.exists('legacy.txt')).toBe(true)
    expect(storage.getUrl('legacy.txt')).toBe('/legacy/legacy.txt')
  })

  it('should support legacy provider option', async () => {
    const core = createCore()
    
    // Create a custom provider (using MemoryStore)
    const { MemoryStore } = await import('../src/stores/MemoryStore')
    const customProvider = new MemoryStore()

    const storage = orbitStorage(core as any, {
      provider: customProvider,
    })

    await storage.put('custom.txt', 'custom content')
    expect(await storage.exists('custom.txt')).toBe(true)
  })
})

describe('OrbitNebula - Hooks Integration', () => {
  it('should trigger storage:upload filter', async () => {
    const core = createCore()
    
    // Mock filter that modifies content
    core.hooks.applyFilters = mock(async (hook: string, value: unknown) => {
      if (hook === 'storage:upload') {
        return `[FILTERED] ${value}`
      }
      return value
    })

    const storage = orbitStorage(core as any, {
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('filtered.txt', 'original')

    expect(core.hooks.applyFilters).toHaveBeenCalledWith('storage:upload', 'original', { key: 'filtered.txt' })
    
    const data = await storage.get('filtered.txt')
    expect(await data?.text()).toBe('[FILTERED] original')
  })

  it('should trigger storage:uploaded action', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('action-test.txt', 'content')

    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:uploaded', { key: 'action-test.txt' })
  })

  it('should trigger storage:hit and storage:miss', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('hit-test.txt', 'content')

    // Hit
    await storage.get('hit-test.txt')
    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:hit', { key: 'hit-test.txt' })

    // Miss
    await storage.get('miss-test.txt')
    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:miss', { key: 'miss-test.txt' })
  })
})

describe('OrbitNebula - New Features', () => {
  it('should support exists()', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: { temp: { driver: 'memory' } },
    })

    expect(await storage.exists('test.txt')).toBe(false)
    
    await storage.put('test.txt', 'content')
    expect(await storage.exists('test.txt')).toBe(true)
  })

  it('should support copy()', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('original.txt', 'content')
    await storage.copy('original.txt', 'copy.txt')

    expect(await storage.exists('copy.txt')).toBe(true)
    expect(await (await storage.get('copy.txt'))?.text()).toBe('content')
  })

  it('should support move()', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('source.txt', 'content')
    await storage.move('source.txt', 'dest.txt')

    expect(await storage.exists('source.txt')).toBe(false)
    expect(await storage.exists('dest.txt')).toBe(true)
  })

  it('should support getMetadata()', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('meta.txt', 'hello world')
    const meta = await storage.getMetadata('meta.txt')

    expect(meta).toMatchObject({
      key: 'meta.txt',
      size: 11,
    })
  })
})

describe('OrbitNebula - getStorage()', () => {
  it('should return installed manager', () => {
    const core = createCore()
    const orbit = new OrbitNebula({
      disks: { temp: { driver: 'memory' } },
    })

    orbit.install(core as any)
    const storage = orbit.getStorage()

    expect(storage).toBeDefined()
    expect(typeof storage.put).toBe('function')
  })

  it('should throw if not installed', () => {
    const orbit = new OrbitNebula({
      disks: { temp: { driver: 'memory' } },
    })

    expect(() => orbit.getStorage()).toThrow(/Not installed/)
  })
})
```

---

### Phase 7: 文件更新 (30 分鐘)

#### 更新 `README.md`

````markdown
# @gravito/nebula

> The Standard Storage Orbit for Galaxy Architecture.

Provides a unified file storage abstraction layer with multi-disk support and pluggable backends.

## 📦 Installation

```bash
bun add @gravito/nebula
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { PlanetCore } from '@gravito/core'
import orbitStorage from '@gravito/nebula'

const core = new PlanetCore()

const storage = orbitStorage(core, {
  default: 'local',
  disks: {
    local: {
      driver: 'local',
      root: './uploads',
      baseUrl: '/uploads'
    }
  }
})

// Use in routes
core.app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  
  if (file instanceof File) {
    const storage = c.get('storage')
    await storage.put(file.name, file)
    return c.json({ url: storage.getUrl(file.name) })
  }
  
  return c.text('No file uploaded', 400)
})
```

---

## 🔧 Multi-Disk Configuration

```typescript
const storage = orbitStorage(core, {
  default: 'local',
  disks: {
    // Local disk
    local: {
      driver: 'local',
      root: './uploads',
      baseUrl: '/uploads'
    },
    
    // Memory disk (for testing)
    temp: {
      driver: 'memory'
    },
    
    // Null disk (no-op)
    null: {
      driver: 'null'
    },
    
    // Custom disk (e.g., S3)
    s3: {
      driver: 'custom',
      store: new S3Store({
        bucket: 'my-bucket',
        region: 'us-east-1'
      })
    }
  }
})

// Use default disk
await storage.put('file.txt', 'content')

// Use specific disk
await storage.disk('s3').put('important.pdf', pdfData)
await storage.disk('temp').put('cache.json', jsonData)
```

---

## 📖 API Reference

### StorageManager

The main storage manager returned by `orbitStorage()` or `c.get('storage')`.

#### Methods

##### `disk(name?: string): StorageRepository`

Get a specific disk repository. If `name` is not provided, returns the default disk.

```typescript
const local = storage.disk('local')
const s3 = storage.disk('s3')
```

##### `put(key: string, data: Blob | Buffer | string): Promise<void>`

Store a file (using default disk).

```typescript
await storage.put('file.txt', 'Hello World')
await storage.put('image.png', imageBlob)
```

##### `get(key: string): Promise<Blob | null>`

Retrieve a file (using default disk).

```typescript
const data = await storage.get('file.txt')
if (data) {
  console.log(await data.text())
}
```

##### `delete(key: string): Promise<boolean>`

Delete a file (using default disk). Returns `true` if deleted, `false` if file didn't exist.

```typescript
const deleted = await storage.delete('old-file.txt')
```

##### `exists(key: string): Promise<boolean>` 🆕

Check if a file exists (using default disk).

```typescript
if (await storage.exists('config.json')) {
  // File exists
}
```

##### `copy(from: string, to: string): Promise<void>` 🆕

Copy a file (using default disk).

```typescript
await storage.copy('original.txt', 'backup.txt')
```

##### `move(from: string, to: string): Promise<void>` 🆕

Move/rename a file (using default disk).

```typescript
await storage.move('temp.txt', 'final.txt')
```

##### `getMetadata(key: string): Promise<StorageMetadata | null>` 🆕

Get file metadata (using default disk).

```typescript
const meta = await storage.getMetadata('file.pdf')
if (meta) {
  console.log(meta.size, meta.mimeType, meta.lastModified)
}
```

##### `getUrl(key: string): string`

Get the public URL for a file (using default disk).

```typescript
const url = storage.getUrl('avatar.jpg')
// "/uploads/avatar.jpg"
```

##### `getSignedUrl(key: string, expiresIn: number): Promise<string>` 🆕

Get a signed URL with expiration (if supported by the driver).

```typescript
// Generate a URL that expires in 1 hour
const signedUrl = await storage.disk('s3').getSignedUrl('private.pdf', 3600)
```

##### `list(prefix?: string): AsyncIterable<StorageItem>` 🆕

List files in a directory (if supported by the driver).

```typescript
for await (const item of storage.list('uploads/')) {
  console.log(item.key, item.size, item.lastModified)
}
```

---

## 🪝 Hooks

Nebula integrates with Gravito's hook system for extensibility.

| Hook | Type | Parameters | Description |
|------|------|------------|-------------|
| `storage:init` | Action | `{ manager: StorageManager }` | Fired when storage is initialized |
| `storage:upload` | Filter | `data: Blob/Buffer/string, { key: string }` | Modify data before upload |
| `storage:uploaded` | Action | `{ key: string }` | Triggered after successful upload |
| `storage:hit` | Action | `{ key: string }` | File retrieved successfully |
| `storage:miss` | Action | `{ key: string }` | File not found |
| `storage:deleted` | Action | `{ key: string }` | File deleted |
| `storage:copied` 🆕 | Action | `{ from: string, to: string }` | File copied |
| `storage:moved` 🆕 | Action | `{ from: string, to: string }` | File moved |

### Example: Auto-resize Images on Upload

```typescript
core.hooks.addFilter('storage:upload', async (data, context) => {
  if (context.key.endsWith('.jpg') || context.key.endsWith('.png')) {
    // Resize image using sharp, etc.
    return await resizeImage(data, { width: 1920 })
  }
  return data
})
```

### Example: Log All Uploads

```typescript
core.hooks.addAction('storage:uploaded', async (context) => {
  core.logger.info(`File uploaded: ${context.key}`)
})
```

---

## 🔌 Custom Storage Drivers

Implement the `StorageStore` interface to create custom drivers.

```typescript
import type { StorageStore, StorageMetadata } from '@gravito/nebula'

class S3Store implements StorageStore {
  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    // Upload to S3
  }

  async get(key: string): Promise<Blob | null> {
    // Download from S3
  }

  async delete(key: string): Promise<boolean> {
    // Delete from S3
  }

  async exists(key: string): Promise<boolean> {
    // Check if exists in S3
  }

  async copy(from: string, to: string): Promise<void> {
    // S3 copy operation
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  async getMetadata(key: string): Promise<StorageMetadata | null> {
    // Get S3 object metadata
  }

  getUrl(key: string): string {
    return `https://my-bucket.s3.amazonaws.com/${key}`
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // Generate pre-signed URL
  }
}

// Use it
const storage = orbitStorage(core, {
  disks: {
    s3: {
      driver: 'custom',
      store: new S3Store({ bucket: 'my-bucket' })
    }
  }
})
```

---

## 🔄 Migration from v3.x

### Configuration Changes

```typescript
// v3.x (Old)
orbitStorage(core, {
  local: { root: './uploads', baseUrl: '/uploads' },
  exposeAs: 'storage'
})

// v4.0 (New)
orbitStorage(core, {
  default: 'local',
  disks: {
    local: { driver: 'local', root: './uploads', baseUrl: '/uploads' }
  },
  exposeAs: 'storage'
})
```

**Note**: The old format is still supported for backward compatibility but is deprecated.

### Return Value Changes

```typescript
// v3.x - Returns wrapped provider
const storage = orbitStorage(core, { ... })
await storage.put('file.txt', data)

// v4.0 - Returns StorageManager
const storage = orbitStorage(core, { ... })
await storage.put('file.txt', data)  // Same API!
await storage.disk('s3').put('file.txt', data)  // New!
```

The API is backward compatible, but v4.0 adds multi-disk support via `disk()`.

### Type Changes

| v3.x | v4.0 |
|------|------|
| `StorageProvider` | `StorageStore` |
| `LocalStorageProvider` | `LocalStore` |
| `OrbitStorageOptions` | `OrbitNebulaOptions` |

Old type names are still exported with `@deprecated` warnings.

---

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
````

---

## Breaking Changes

### v4.0.0

#### 型別重命名

| 舊名稱 | 新名稱 | 遷移方式 |
|--------|--------|----------|
| `StorageProvider` | `StorageStore` | 搜尋替換 (舊名稱已標記 @deprecated) |
| `LocalStorageProvider` | `LocalStore` | 搜尋替換 (舊名稱已標記 @deprecated) |
| `OrbitStorageOptions` | `OrbitNebulaOptions` | 搜尋替換 (舊名稱已標記 @deprecated) |

#### 配置格式變更

**舊版 (v3.x)**:
```typescript
orbitStorage(core, {
  local: { root: './uploads', baseUrl: '/uploads' }
})
```

**新版 (v4.0)**:
```typescript
orbitStorage(core, {
  default: 'local',
  disks: {
    local: { driver: 'local', root: './uploads', baseUrl: '/uploads' }
  }
})
```

**向後相容**: 舊版配置仍可使用，但已標記 `@deprecated`。

#### 回傳值變更

| API | v3.x | v4.0 |
|-----|------|------|
| `orbitStorage()` | `StorageProvider` | `StorageManager` |
| `OrbitNebula.install()` | `void` | `void` (新增 `getStorage()`) |

**影響**: 

- v3.x 的 API 在 v4.0 完全相容 (Manager 代理所有方法)
- 新增 `disk()` 方法支援多磁碟
- 新增 `exists/copy/move/getMetadata` 等方法

---

## 測試策略

### 測試覆蓋率目標

| 元件 | 目標覆蓋率 |
|------|-----------|
| `LocalStore` | ≥ 90% |
| `MemoryStore` | ≥ 85% |
| `StorageRepository` | ≥ 90% |
| `StorageManager` | ≥ 85% |
| 安全測試 | 100% (所有路徑遍歷案例) |

### 測試分類

1. **單元測試**
   - 各 Store 的基本操作
   - 路徑正規化邏輯
   - URL 產生邏輯

2. **整合測試**
   - OrbitNebula 與 PlanetCore 整合
   - Hooks 觸發與過濾
   - 多磁碟切換

3. **安全測試**
   - 路徑遍歷攻擊防禦
   - 特殊字元處理
   - 並行操作安全性

4. **效能測試** (可選)
   - 大檔案處理
   - 並行讀寫效能

---

## 遷移指南

### 第一步: 更新依賴

```bash
bun update @gravito/nebula
```

### 第二步: 更新配置 (可選)

舊版配置仍可使用,但建議遷移到新格式:

```typescript
// 舊版 (仍可使用)
const storage = orbitStorage(core, {
  local: { root: './uploads' }
})

// 新版 (建議)
const storage = orbitStorage(core, {
  default: 'local',
  disks: {
    local: { driver: 'local', root: './uploads' }
  }
})
```

### 第三步: 更新型別引用 (可選)

```typescript
// 舊版
import type { StorageProvider, LocalStorageProvider } from '@gravito/nebula'

// 新版
import type { StorageStore } from '@gravito/nebula'
import { LocalStore } from '@gravito/nebula/stores'
```

### 第四步: 使用新功能

```typescript
// 檢查檔案是否存在
if (await storage.exists('config.json')) {
  // ...
}

// 複製檔案
await storage.copy('backup.zip', 'backup-2024.zip')

// 取得檔案資訊
const meta = await storage.getMetadata('file.pdf')
console.log(meta.size, meta.lastModified)
```

---

## 實作檢查清單

### Phase 1: 型別與介面 ✅

- [ ] 建立 `src/store.ts` 定義 `StorageStore` 介面
- [ ] 建立 `src/types.ts` 定義配置型別
- [ ] 定義 `StorageMetadata` 與 `StorageItem` 介面

### Phase 2: StorageRepository ✅

- [ ] 建立 `src/StorageRepository.ts`
- [ ] 實作 `put/get/delete/exists`
- [ ] 實作 `copy/move`
- [ ] 實作 `getMetadata/getUrl/getSignedUrl`
- [ ] 整合 Hooks (`storage:upload`, `storage:uploaded` 等)

### Phase 3: StorageManager ✅

- [ ] 建立 `src/StorageManager.ts`
- [ ] 實作 `disk()` 磁碟管理
- [ ] 實作 Store Factory 邏輯
- [ ] 實作預設磁碟代理方法
- [ ] 實作 Repository 快取

### Phase 4: Store 實作 ✅

- [ ] 建立 `src/stores/LocalStore.ts` (重構自 `LocalStorageProvider`)
- [ ] 實作路徑安全驗證 (`normalizeKey`, `resolvePath`)
- [ ] 實作 `put/get/delete/exists/copy/move`
- [ ] 實作 `getMetadata` (含 MIME 類型猜測)
- [ ] 建立 `src/stores/MemoryStore.ts`
- [ ] 建立 `src/stores/NullStore.ts`

### Phase 5: OrbitNebula 重構 ✅

- [ ] 重構 `src/index.ts`
- [ ] 實作 `install()` 使用 StorageManager
- [ ] 實作 `getStorage()` 方法
- [ ] 處理向後相容 (deprecated options)
- [ ] 實作 Store Factory
- [ ] 更新 Module Augmentation

### Phase 6: 測試 ✅

- [ ] 建立 `tests/stores/LocalStore.test.ts`
  - [ ] 基本操作測試
  - [ ] 進階操作測試 (copy/move)
  - [ ] 元資料測試
  - [ ] 巢狀目錄測試
- [ ] 建立 `tests/security.test.ts`
  - [ ] 路徑遍歷攻擊測試
  - [ ] 邊界案例測試
  - [ ] 並行操作測試
- [ ] 建立 `tests/StorageManager.test.ts`
  - [ ] 多磁碟支援測試
  - [ ] 向後相容測試
  - [ ] Hooks 整合測試
- [ ] 更新 `tests/index.test.ts` (保留部分整合測試)

### Phase 7: 文件 ✅

- [ ] 更新 `README.md`
  - [ ] 快速開始範例
  - [ ] 多磁碟配置說明
  - [ ] API 文件
  - [ ] Hooks 說明
  - [ ] 自訂 Driver 教學
  - [ ] 遷移指南
- [ ] 更新 `README.zh-TW.md` (繁體中文版)
- [ ] 更新 `CHANGELOG.md`
  - [ ] 列出所有 Breaking Changes
  - [ ] 列出新增功能
  - [ ] 列出向後相容的棄用項目

### Phase 8: 發布準備 ✅

- [ ] 執行所有測試 (`bun test`)
- [ ] 執行型別檢查 (`bun run typecheck`)
- [ ] 執行測試覆蓋率 (`bun run test:coverage`)
- [ ] 建置套件 (`bun run build`)
- [ ] 更新版本號為 `4.0.0`
- [ ] 建立 Git tag `@gravito/nebula@4.0.0`

---

## 後續優化建議

### v4.1 候選功能

1. **RuntimeAdapter 擴展**
   - 新增 `readDir()` 方法支援
   - 完整實作 `list()` 功能

2. **Stream 支援**
   - `putStream(key, stream)`
   - `getStream(key)`

3. **官方 Cloud Provider**
   - `@gravito/nebula-s3`
   - `@gravito/nebula-gcs`
   - `@gravito/nebula-azure`

4. **進階功能**
   - 檔案壓縮 (`compress: true`)
   - 自動備份 (跨磁碟同步)
   - 檔案版本控制

---

## 總結

這份重構計劃將 `@gravito/nebula` 從簡單的檔案儲存抽象層升級為完整的企業級儲存管理系統,具備:

- ✅ 與 `@gravito/stasis` 一致的架構模式
- ✅ 多磁碟支援與靈活配置
- ✅ 完整的檔案操作 API
- ✅ 強大的擴展性 (自訂 Driver)
- ✅ 向後相容 (舊版 API 仍可使用)
- ✅ 完整的測試覆蓋
- ✅ 企業級安全性 (路徑遍歷防護)

預計實作時間約 **7 小時**,適合在一個工作日內完成。

---

**準備好開始實作了嗎?** 🚀
