# @gravito/nebula v4.0 重構執行摘要

> **快速參考指南** - 詳細計劃請見 [REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md)

---

## 🎯 核心目標

將 Nebula 從簡單的 Provider 模式升級為 **Manager + Store Driver** 架構（與 Stasis 一致）

---

## 📊 工作量估計

| Phase | 內容 | 時間 |
|-------|------|------|
| Phase 1 | 型別與介面定義 | 30 分鐘 |
| Phase 2 | StorageRepository | 45 分鐘 |
| Phase 3 | StorageManager | 1 小時 |
| Phase 4 | Store 實作重構 | 1.5 小時 |
| Phase 5 | OrbitNebula 重構 | 1 小時 |
| Phase 6 | 測試補全 | 1.5 小時 |
| Phase 7 | 文件更新 | 30 分鐘 |
| **總計** | | **~7 小時** |

---

## 🏗️ 新架構概覽

```
OrbitNebula (Orbit 實作)
    ↓
StorageManager (磁碟管理)
    ↓
StorageRepository (業務邏輯 + Hooks)
    ↓
StorageStore (底層儲存介面)
    ├── LocalStore (本地磁碟)
    ├── MemoryStore (記憶體)
    ├── NullStore (No-op)
    └── [Future] S3Store, GCSStore...
```

---

## 📁 新檔案結構

```
src/
├── index.ts              # 匯出入口 + OrbitNebula
├── StorageManager.ts     # 🆕 管理器核心
├── StorageRepository.ts  # 🆕 Repository (hooks 整合)
├── store.ts              # 🆕 StorageStore 介面
├── types.ts              # 🆕 型別定義
└── stores/
    ├── LocalStore.ts     # 🆕 本地磁碟
    ├── MemoryStore.ts    # 🆕 記憶體
    └── NullStore.ts      # 🆕 No-op

tests/
├── StorageManager.test.ts      # 🆕
├── StorageRepository.test.ts   # 🆕
├── security.test.ts            # 🆕
└── stores/
    ├── LocalStore.test.ts      # 🆕
    └── MemoryStore.test.ts     # 🆕
```

---

## 🚀 實作順序（按 Phase 執行）

### Phase 1: 型別與介面定義 (30 分鐘)

**建立檔案:**
- `src/store.ts` - 定義 `StorageStore` 介面
- `src/types.ts` - 定義配置型別

**核心介面:**
```typescript
export interface StorageStore {
  // 基本操作
  put(key: string, data: Blob | Buffer | string): Promise<void>
  get(key: string): Promise<Blob | null>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>  // 🆕
  
  // 進階操作
  copy(from: string, to: string): Promise<void>     // 🆕
  move(from: string, to: string): Promise<void>     // 🆕
  list?(prefix?: string): AsyncIterable<StorageItem> // 🆕 可選
  
  // 元資料
  getMetadata(key: string): Promise<StorageMetadata | null>  // 🆕
  
  // URL
  getUrl(key: string): string
  getSignedUrl?(key: string, expiresIn: number): Promise<string>  // 🆕 可選
}
```

---

### Phase 2: StorageRepository (45 分鐘)

**建立檔案:**
- `src/StorageRepository.ts`

**核心職責:**
- 封裝 StorageStore 的業務邏輯
- 整合 Hooks (`storage:upload`, `storage:uploaded` 等)
- 提供高階 API

**關鍵方法:**
```typescript
async put(key: string, data: Blob | Buffer | string): Promise<void> {
  // Hook: storage:upload (Filter)
  const finalData = await this.hooks?.applyFilter('storage:upload', data, { key })
  await this.store.put(key, finalData)
  // Hook: storage:uploaded (Action)
  await this.hooks?.doAction('storage:uploaded', { key })
}
```

---

### Phase 3: StorageManager (1 小時)

**建立檔案:**
- `src/StorageManager.ts`

**核心職責:**
- 管理多個儲存磁碟
- 提供 `disk()` 方法切換磁碟
- 快取 Store 和 Repository 實例
- 代理預設磁碟的方法

**關鍵方法:**
```typescript
disk(name?: string): StorageRepository {
  const diskName = name ?? this.options.default
  
  if (!this.repositories.has(diskName)) {
    const store = this.resolveStore(diskName)
    this.repositories.set(diskName, new StorageRepository(store, this.hooks))
  }
  
  return this.repositories.get(diskName)!
}
```

---

### Phase 4: Store 實作重構 (1.5 小時)

**建立檔案:**
- `src/stores/LocalStore.ts` (重構自 `LocalStorageProvider`)
- `src/stores/MemoryStore.ts`
- `src/stores/NullStore.ts`

**LocalStore 重點:**
- 保留現有的路徑安全驗證邏輯
- 實作新增的方法 (`exists`, `copy`, `move`, `getMetadata`)
- `list()` 暫時拋出錯誤（等待 RuntimeAdapter 擴展）

**路徑安全驗證:**
```typescript
private normalizeKey(key: string): string {
  // 1. 檢查空值與 null byte
  if (!key || key.includes('\0')) {
    throw new Error('[LocalStore] Invalid storage key')
  }
  
  // 2. 正規化並移除前綴斜線
  const normalized = normalize(key).replace(/^[/\\]+/, '')
  
  // 3. 禁止路徑遍歷
  if (normalized === '.' || normalized === '..' || 
      normalized.startsWith(`..${sep}`) || isAbsolute(normalized)) {
    throw new Error('[LocalStore] Invalid storage key')
  }
  
  return normalized.replace(/\\/g, '/')
}
```

---

### Phase 5: OrbitNebula 重構 (1 小時)

**更新檔案:**
- `src/index.ts`

**主要變更:**
1. 移除重複的 hooks 包裝邏輯
2. 使用 `StorageManager` 替代直接包裝 Provider
3. 實作 `getStorage()` 方法
4. 處理向後相容（`local` 和 `provider` 選項）
5. 實作 Store Factory

**向後相容處理:**
```typescript
private resolveDisks(config: OrbitNebulaOptions): Record<string, OrbitNebulaStoreConfig> {
  // 優先使用新版 disks
  if (config.disks) return config.disks
  
  // 向後相容: local 選項
  if (config.local) {
    return { local: { driver: 'local', ...config.local } }
  }
  
  // 向後相容: provider 選項
  if (config.provider) {
    return { default: { driver: 'custom', store: config.provider } }
  }
  
  return {}
}
```

---

### Phase 6: 測試補全 (1.5 小時)

**建立測試檔案:**

1. **`tests/stores/LocalStore.test.ts`**
   - 基本操作 (put/get/delete/exists)
   - 進階操作 (copy/move)
   - 元資料測試
   - URL 產生
   - 巢狀目錄

2. **`tests/security.test.ts`**
   - 路徑遍歷攻擊防禦（15+ 攻擊案例）
   - 邊界案例（空檔案、大檔案、特殊字元）
   - 並行操作安全性

3. **`tests/StorageManager.test.ts`**
   - 多磁碟支援
   - 磁碟實例快取
   - 向後相容測試
   - Hooks 整合測試
   - 新功能測試 (exists/copy/move/getMetadata)

**測試覆蓋率目標:**
- LocalStore: ≥ 90%
- MemoryStore: ≥ 85%
- StorageRepository: ≥ 90%
- StorageManager: ≥ 85%
- 安全測試: 100%

---

### Phase 7: 文件更新 (30 分鐘)

**更新檔案:**
- `README.md` - 英文完整文件
- `README.zh-TW.md` - 繁體中文版
- `CHANGELOG.md` - 版本變更記錄

**文件必須包含:**
1. 快速開始範例
2. 多磁碟配置說明
3. 完整 API 文件（含新方法）
4. Hooks 說明與範例
5. 自訂 Driver 教學
6. v3.x → v4.0 遷移指南
7. Breaking Changes 清單

---

## 🔄 Breaking Changes 摘要

### 型別重命名

| 舊名稱 | 新名稱 | 遷移方式 |
|--------|--------|----------|
| `StorageProvider` | `StorageStore` | 舊名稱保留並標記 `@deprecated` |
| `LocalStorageProvider` | `LocalStore` | 舊名稱保留並標記 `@deprecated` |
| `OrbitStorageOptions` | `OrbitNebulaOptions` | 舊名稱保留並標記 `@deprecated` |

### 配置格式

```typescript
// 舊版 (v3.x) - 仍可使用但已棄用
{ local: { root: './uploads' } }

// 新版 (v4.0) - 建議使用
{ 
  default: 'local',
  disks: { 
    local: { driver: 'local', root: './uploads' } 
  } 
}
```

### 回傳值

- `orbitStorage()` 回傳 `StorageManager` (API 向後相容)
- 新增 `disk()` 方法支援多磁碟

---

## 🆕 新增功能清單

### 新增 API

| 方法 | 說明 |
|------|------|
| `exists(key)` | 檢查檔案是否存在 |
| `copy(from, to)` | 複製檔案 |
| `move(from, to)` | 移動/重命名檔案 |
| `getMetadata(key)` | 取得檔案元資料 (大小、MIME、時間) |
| `disk(name)` | 切換儲存磁碟 |
| `getSignedUrl(key, ttl)` | 產生簽名 URL (可選實作) |
| `list(prefix)` | 列出檔案 (可選實作，需 RuntimeAdapter 支援) |

### 新增 Hooks

| Hook | 類型 | 說明 |
|------|------|------|
| `storage:deleted` | Action | 檔案刪除後觸發 |
| `storage:copied` | Action | 檔案複製後觸發 |
| `storage:moved` | Action | 檔案移動後觸發 |
| `storage:hit` | Action | 檔案讀取成功 |
| `storage:miss` | Action | 檔案不存在 |

---

## ✅ 實作檢查清單

使用以下清單追蹤進度：

### Phase 1: 型別與介面
- [ ] 建立 `src/store.ts`
- [ ] 建立 `src/types.ts`
- [ ] 定義 `StorageStore` 介面
- [ ] 定義 `StorageMetadata` 與 `StorageItem`

### Phase 2: Repository
- [ ] 建立 `src/StorageRepository.ts`
- [ ] 實作基本操作 (put/get/delete/exists)
- [ ] 實作進階操作 (copy/move)
- [ ] 整合 Hooks

### Phase 3: Manager
- [ ] 建立 `src/StorageManager.ts`
- [ ] 實作 `disk()` 方法
- [ ] 實作代理方法
- [ ] 實作快取邏輯

### Phase 4: Stores
- [ ] 建立 `src/stores/LocalStore.ts`
- [ ] 實作路徑安全驗證
- [ ] 實作所有必要方法
- [ ] 建立 `MemoryStore.ts` 和 `NullStore.ts`

### Phase 5: Orbit
- [ ] 重構 `src/index.ts`
- [ ] 實作 `getStorage()`
- [ ] 處理向後相容
- [ ] 更新 Module Augmentation

### Phase 6: 測試
- [ ] LocalStore 測試（基本 + 進階 + 元資料）
- [ ] 安全測試（路徑遍歷 + 邊界案例）
- [ ] Manager 測試（多磁碟 + Hooks）
- [ ] 達成覆蓋率目標

### Phase 7: 文件
- [ ] 更新 `README.md`
- [ ] 更新 `README.zh-TW.md`
- [ ] 更新 `CHANGELOG.md`
- [ ] 撰寫遷移指南

### Phase 8: 發布
- [ ] 執行所有測試
- [ ] 型別檢查
- [ ] 建置套件
- [ ] 更新版本號為 `4.0.0`
- [ ] 建立 Git tag

---

## 🔧 快速命令參考

```bash
# 執行測試
bun test

# 測試覆蓋率
bun run test:coverage

# 型別檢查
bun run typecheck

# 建置
bun run build

# 發布
bun publish --access public
```

---

## 📝 注意事項

### ⚠️ RuntimeAdapter 限制

目前 `@gravito/core` 的 `RuntimeAdapter` 不支援 `readDir()` 方法，因此 `list()` 功能暫時無法實作。

**解決方案:**
- LocalStore.list() 暫時拋出錯誤並說明原因
- 在註解中提供未來實作範例
- 在文件中標註為「可選功能，需 RuntimeAdapter 擴展」

### ✅ 向後相容保證

- 所有 v3.x 的 API 在 v4.0 完全相容
- 舊的配置格式仍可使用（標記 deprecated）
- 舊的型別名稱仍可匯入（標記 deprecated）
- 遷移可以漸進式進行，無需一次性重寫

### 🎯 測試重點

1. **路徑安全** - 必須通過所有路徑遍歷攻擊測試
2. **並行安全** - 確保多執行緒讀寫不會導致檔案損毀
3. **Hooks 執行** - 確保所有 Hook 正確觸發
4. **向後相容** - 確保舊版用法仍然有效

---

## 📚 參考資源

- **完整計劃**: [REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md)
- **Stasis 架構**: `/packages/stasis/src/index.ts`
- **現有實作**: `/packages/nebula/src/index.ts`
- **現有測試**: `/packages/nebula/tests/index.test.ts`

---

## 🚀 開始實作

建議按照 Phase 順序依次完成：

1. **先建立介面** (Phase 1) - 確保型別定義完整
2. **實作核心邏輯** (Phase 2-3) - Repository 和 Manager
3. **重構 Store** (Phase 4) - 確保底層實作正確
4. **整合 Orbit** (Phase 5) - 連接所有元件
5. **補全測試** (Phase 6) - 確保品質
6. **更新文件** (Phase 7) - 方便使用者遷移

每完成一個 Phase，執行測試確保沒有破壞現有功能。

---

**準備好了嗎？開始實作吧！** 🎉
