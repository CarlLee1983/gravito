# Xenon FFI 完整技術指南

## 📋 目錄

1. [概述](#概述)
2. [核心架構](#核心架構)
3. [API 參考](#api-參考)
4. [安全模型](#安全模型)
5. [記憶體管理](#記憶體管理)
6. [錯誤處理](#錯誤處理)
7. [實例應用：SQLite 整合](#實例應用sqlite-整合)
8. [最佳實踐](#最佳實踐)
9. [性能考慮](#性能考慮)

---

## 概述

### 什麼是 Xenon？

**Xenon** 是 Gravito 框架的 FFI（Foreign Function Interface）安全封裝層。它為 Bun 的原生 FFI 能力提供：

- 🔒 **安全性**：路徑驗證、符號類型檢查、危險操作阻止
- 🧠 **記憶體管理**：自動追蹤、雙重釋放檢測、洩漏檢測
- 📊 **可觀察性**：詳細的記憶體統計、符號註冊表、堆棧追蹤
- 🎯 **易用性**：單例模式、配置驅動、類型安全

### 為什麼需要 Xenon？

直接使用 Bun FFI 會帶來風險：

```typescript
// ❌ 危險：沒有驗證
const lib = require('bun').dlopen('/any/path.so', {
  dangerousFunc: { args: ['ptr'], returns: 'ptr' }
})

// ✅ 安全：Xenon 驗證路徑和類型
Xenon.load('mylib', '/trusted/path.so', {
  safeFunc: { args: ['i32'], returns: 'i32' }
})
```

### 版本資訊

- **包名**：`@gravito/xenon`
- **版本**：1.0.0
- **目標運行時**：Bun 1.x+
- **依賴**：零依賴

---

## 核心架構

### 分層設計

```
┌────────────────────────────────────────┐
│      Xenon Singleton Facade            │  User-facing API
│  (load, allocBuffer, getMemoryStats)   │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│         XenonManager                   │  Core orchestrator
│  (library loading, memory tracking)    │
└────────────────────────────────────────┘
           ↓          ↓           ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ LibraryLoader│ │MemoryTracker │ │ BufferOwner- │  Subsystems
│              │ │ (Finalization)│ │ ship (owned/ │
│              │ │              │ │ borrowed)    │
└──────────────┘ └──────────────┘ └──────────────┘
           ↓          ↓           ↓
┌─────────────────────────────────────────────┐
│  Safety Layer (TypeGuard, BoundsChecker)   │  Validation
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│      Bun FFI (bun:ffi, dlopen)             │  Native boundary
└─────────────────────────────────────────────┘
```

### 主要模組

#### 1. **Xenon（靜態門面）**
全局單例，提供配置和操作的統一入口。

```typescript
// 配置
Xenon.configure({
  allowedPaths: ['/usr/lib/lib*.so'],
  blockedPaths: ['/etc/**'],
  maxLibraries: 50,
  maxTotalMemory: 2 * 1024 * 1024 * 1024 // 2GB
})

// 操作
const lib = Xenon.load('sqlite3', path, symbols)
const buf = Xenon.allocBuffer(1024, 'query_buffer')
Xenon.freeBuffer(buf)
const stats = Xenon.getMemoryStats()
```

#### 2. **XenonManager（核心協調器）**
管理庫載入和記憶體生命週期。

```typescript
const manager = new XenonManager({
  maxLibraries: 100,
  enableMemoryTracking: true,
  maxTotalMemory: 1024 * 1024 * 1024
})

const handle = manager.load('mylib', '/path/to/lib.so', symbols)
const buffer = manager.allocBuffer(512)
manager.freeBuffer(buffer)
const stats = manager.getMemoryStats()
```

#### 3. **LibraryLoader（庫載入器）**
驗證路徑、符號，然後使用 `bun:ffi` 載入。

**路徑驗證邏輯**：

```typescript
// 黑名單優先檢查（最高優先級）
if (blockedPaths.some(p => pathMatches(path, p))) {
  throw new XenonSecurityError(`Library path blocked: ${path}`)
}

// 白名單檢查（如果配置非空）
if (allowedPaths.length > 0 && !allowedPaths.some(p => pathMatches(path, p))) {
  throw new XenonSecurityError(`Library path not allowed: ${path}`)
}
```

**符號驗證**：見 [TypeGuard](#typeguard)

#### 4. **MemoryTracker（記憶體追蹤器）**
使用 `FinalizationRegistry` 偵測洩漏和雙重釋放。

```typescript
// 自動追蹤
Xenon.allocBuffer(1024) // 自動註冊

// 統計資訊
const stats = Xenon.getMemoryStats()
// {
//   totalAllocated: 1024,
//   totalFreed: 0,
//   activeBuffers: 1,
//   peakBuffers: 1
// }

// 洩漏偵測（自動報告）
[Xenon] Memory leak detected: owned buffer not freed before GC: query_buffer
  Allocated at: at allocBuffer (packages/xenon/src/XenonManager.ts:66:34)
```

#### 5. **BufferOwnership（緩衝區所有權）**
區別 owned（Xenon 管理）和 borrowed（外部管理）緩衝區。

```typescript
// Owned：Xenon 負責釋放
const ownedBuf = Xenon.allocBuffer(1024)
Xenon.freeBuffer(ownedBuf) // 必須顯式釋放

// Borrowed：外部（如 Bun 原生函數）負責釋放
const borrowedMeta = manager.borrowBuffer(ptr, 512, 'external_buffer')
// Xenon 不追蹤釋放，防止雙重釋放
```

#### 6. **TypeGuard（類型守衛）**
驗證 FFI 符號定義，禁止危險類型。

```typescript
// 支持的類型
const VALID_TYPES = new Set([
  'i8', 'i16', 'i32', 'i64',      // 整數
  'u8', 'u16', 'u32', 'u64',      // 無符號整數
  'f32', 'f64',                    // 浮點數
  'bool', 'ptr', 'void', 'cstring' // 其他
])

// 禁止的類型
const FORBIDDEN_TYPES = new Set(['callback']) // 回調不支持

// 驗證
validateSymbols({
  sqlite3_open: { args: ['cstring', 'ptr'], returns: 'i32' } // ✅
  unsafe_cb: { args: ['callback'], returns: 'void' }         // ❌ 被禁止
})
```

---

## API 參考

### Xenon 類

#### `Xenon.configure(config: XenonConfig): void`

配置全局安全策略。必須在任何 load 操作前調用。

```typescript
Xenon.configure({
  allowedPaths: ['/usr/lib/lib*.so', '/opt/lib/lib*.so'],
  blockedPaths: ['/etc/**', '/sys/**'],
  maxLibraries: 100,
  enableMemoryTracking: true,
  maxTotalMemory: 2 * 1024 * 1024 * 1024
})
```

**配置欄位**：

| 欄位 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `allowedPaths` | `string[]` | `[]`（允許所有） | 白名單路徑（支持 `*` 通配符） |
| `blockedPaths` | `string[]` | `[]` | 黑名單路徑（優先級最高） |
| `maxLibraries` | `number` | `100` | 最多開啟的庫數 |
| `enableMemoryTracking` | `boolean` | `true` | 是否啟用洩漏檢測 |
| `maxTotalMemory` | `number` | `1GB` | 總記憶體限制（字節） |

#### `Xenon.load(name: string, config: LoadConfig): LibraryHandle`

載入原生庫並返回類型安全的句柄。

```typescript
const handle = Xenon.load('sqlite3', {
  path: '/usr/lib/libsqlite3.dylib',
  symbols: {
    sqlite3_open: {
      args: ['cstring', 'ptr'],    // 路徑字符串，指針
      returns: 'i32'                // 狀態碼
    },
    sqlite3_exec: {
      args: ['ptr', 'cstring'],
      returns: 'i32'
    }
  }
})

// 調用函數
const rc = handle.call('sqlite3_open', dbPath, bufPtr)
```

#### `Xenon.allocBuffer(size: number, label?: string): Uint8Array`

分配由 Xenon 管理的記憶體緩衝區。

```typescript
const buffer = Xenon.allocBuffer(4096, 'query_result')
// buffer 是 Uint8Array，可直接傳給 FFI 函數

// 檢查記憶體
console.log(buffer.byteLength) // 4096
console.log(new DataView(buffer).getUint32(0)) // 讀取記憶體
```

#### `Xenon.freeBuffer(buffer: Uint8Array | number): void`

釋放已分配的緩衝區。

```typescript
Xenon.freeBuffer(buffer) // Uint8Array
Xenon.freeBuffer(0x1000) // 指針地址

// 嘗試再次釋放→ 拋出 XenonMemoryError
Xenon.freeBuffer(buffer) // ❌ 雙重釋放錯誤
```

#### `Xenon.getMemoryStats(): MemoryStats`

取得記憶體統計資訊。

```typescript
const stats = Xenon.getMemoryStats()
// {
//   totalAllocated: 4096,
//   totalFreed: 0,
//   activeBuffers: 1,
//   peakBuffers: 1
// }
```

#### `Xenon.listLibraries(): Array<[string, string]>`

列出所有已載入的庫。

```typescript
const libs = Xenon.listLibraries()
// [
//   ['sqlite3', '/usr/lib/libsqlite3.dylib'],
//   ['openssl', '/usr/lib/libcrypto.dylib']
// ]
```

#### `Xenon.getConfig(): XenonConfig`

取得當前配置副本。

```typescript
const config = Xenon.getConfig()
console.log(config.allowedPaths)
```

#### `Xenon.close(): void`

關閉所有庫和記憶體追蹤（重置實例）。

```typescript
Xenon.close()
// 重置後可重新配置
Xenon.configure({ /* ... */ })
```

#### `Xenon.reset(): void`

完全重置到初始狀態。

```typescript
Xenon.reset()
// 等同於 close() + 清除配置
```

### LibraryHandle 介面

由 `Xenon.load()` 返回。

#### `handle.call(symbol: string, ...args: any[]): any`

調用原生函數。

```typescript
const rc = handle.call('sqlite3_open', dbPath, bufPtr)
const execRc = handle.call('sqlite3_exec', db, sql)
```

#### `handle.close(): void`

關閉庫（停止進一步調用）。

```typescript
handle.close()
handle.call('sqlite3_open') // ❌ XenonLibraryError
```

#### `handle.isClosed(): boolean`

檢查庫是否已關閉。

```typescript
if (!handle.isClosed()) {
  handle.call('sqlite3_version')
}
```

#### `handle.name: string` / `handle.path: string` / `handle.symbols: FFISymbols`

讀取屬性。

```typescript
console.log(handle.name)    // 'sqlite3'
console.log(handle.path)    // '/usr/lib/libsqlite3.dylib'
console.log(handle.symbols) // { sqlite3_open: {...}, ... }
```

---

## 安全模型

### 設計原則

1. **預設安全**：所有危險操作默認被拒絕
2. **顯式白名單**：明確配置允許的路徑
3. **黑名單優先**：系統路徑等永不允許
4. **類型驗證**：禁止回調和其他危險類型
5. **可審計**：記錄所有路徑檢查和類型驗證失敗

### 威脅模型

#### 威脅 1：載入惡意庫

**情景**：攻擊者嘗試載入 `/etc/passwd`（非庫）或 `/tmp/malicious.so`

**防護**：

```typescript
// 配置
Xenon.configure({
  allowedPaths: ['/usr/lib/lib*.so'],
  blockedPaths: ['/etc/**', '/sys/**', '/tmp/**']
})

// 結果
Xenon.load('sqlite3', '/tmp/malicious.so', {})
// ❌ XenonSecurityError: Library path blocked by policy
```

**實現**：`LibraryLoader.validatePath()`

#### 威脅 2：使用危險的 FFI 類型

**情景**：攻擊者試圖註冊回調類型以執行任意代碼

**防護**：

```typescript
Xenon.load('lib', '/usr/lib/lib.so', {
  dangerous: { args: ['callback'], returns: 'void' }
})
// ❌ XenonTypeError: forbidden arg type at index 0: 'callback'
```

**實現**：`TypeGuard.validateSymbols()`

#### 威脅 3：緩衝區越界

**情景**：攻擊者嘗試透過指針算術越過邊界

**防護**：

```typescript
const buf = Xenon.allocBuffer(10) // 10 字節
// FFI 函數內部邊界檢查（由 Bun FFI 提供）
// Xenon 追蹤大小和 freed 狀態以檢測異常模式
```

**實現**：`MemoryTracker.register()` 記錄大小

#### 威脅 4：使用釋放後的記憶體（UAF）

**情景**：代碼嘗試存取已釋放的緩衝區

**防護**：

```typescript
const buf = Xenon.allocBuffer(256)
Xenon.freeBuffer(buf)
// 本身沒有防護（Bun 不提供），但可通過檢查邏輯進行監視
// Zenon 記錄釋放狀態，外層代碼應檢查
```

### 最小特權原則

應用程序應配置儘可能限制的策略：

```typescript
// ✅ 推薦：只允許 SQLite
Xenon.configure({
  allowedPaths: ['/usr/lib/libsqlite3.so*'],
  blockedPaths: ['/**']  // 禁止所有其他
})

// ❌ 不安全：允許所有
Xenon.configure({
  allowedPaths: [], // 空白 = 允許所有
  blockedPaths: []
})
```

---

## 記憶體管理

### 所有權模型

Xenon 區別兩種緩衝區所有權：

#### 1. **Owned 緩衝區**（Xenon 管理）

```typescript
const buf = Xenon.allocBuffer(1024, 'owned_buffer')
// Xenon 記錄所有權、大小、堆棧追蹤
// 開發者負責呼叫 freeBuffer()
Xenon.freeBuffer(buf)

// 未釋放→ FinalizationRegistry 偵測並警告
```

**生命週期**：

```
allocBuffer()
    ↓
[活躍] ←─ 可傳給 FFI 函數
    ↓
freeBuffer()
    ↓
[已釋放] ←─ 進一步 freeBuffer() 拋出錯誤
    ↓
[垃圾回收] ←─ FinalizationRegistry 觸發（如未釋放）
```

#### 2. **Borrowed 緩衝區**（外部管理）

```typescript
// 假設 FFI 函數返回指針
const ptr = nativeFunc() // 返回 0x7f1234567890
const len = 512

// Xenon 追蹤但不管理釋放
const meta = manager.borrowBuffer(ptr, len, 'external')

// 外部代碼負責釋放
// nativeFree(ptr)

// Xenon 不調用 freeBuffer()
```

**使用情景**：

```typescript
// Bun 原生函數返回指針
const ptr = someNativeFunc() // Bun 擁有

// 建立 borrowed 引用
const borrowed = manager.borrowBuffer(ptr, 256, 'temp_buffer')

// 使用（不釋放）
processData(borrowed)

// Bun 或原生代碼在其他地方釋放
```

### 洩漏檢測

Xenon 使用 `FinalizationRegistry` 偵測未釋放的 owned 緩衝區：

```typescript
// 建立緩衝區但不釋放
function badCode() {
  const buf = Xenon.allocBuffer(1024)
  // 忘記 freeBuffer()
} // 函數返回，buf 變數消失

badCode()
// 稍後，垃圾回收觸發：
// [Xenon] Memory leak detected: owned buffer not freed before GC: <unknown>
//   Allocated at: at allocBuffer (...)
```

### 記憶體限制

配置 `maxTotalMemory` 防止過度分配：

```typescript
Xenon.configure({
  maxTotalMemory: 512 * 1024 * 1024 // 512 MB
})

// 分配至限制
Xenon.allocBuffer(400 * 1024 * 1024)
Xenon.allocBuffer(100 * 1024 * 1024)

// 超過限制→ 拋出 XenonMemoryError
Xenon.allocBuffer(50 * 1024 * 1024)
// ❌ XenonMemoryError: Memory limit exceeded
```

### 統計和除錯

```typescript
const stats = Xenon.getMemoryStats()
console.log(`Allocated: ${stats.totalAllocated} bytes`)
console.log(`Freed: ${stats.totalFreed} bytes`)
console.log(`Active: ${stats.activeBuffers} buffers`)
console.log(`Peak: ${stats.peakBuffers} buffers`)

// 列出所有活躍緩衝區
const manager = Xenon.getInstance() // 需要訪問內部
const buffers = manager.listBuffers(false) // 不包括已釋放
buffers.forEach(b => {
  console.log(`${b.label}: ${b.len} bytes (${b.ownership})`)
})
```

---

## 錯誤處理

### 錯誤層級

Xenon 定義 5 個特定錯誤類型，繼承自 `XenonError`：

#### 1. **XenonSecurityError**

路徑被策略阻止或要求危險操作。

```typescript
try {
  Xenon.load('lib', '/etc/passwd', {})
} catch (e) {
  if (e instanceof XenonSecurityError) {
    console.log('Security policy blocked:', e.message)
    // 記錄審計事件
  }
}
```

**常見原因**：

- 路徑在黑名單中
- 路徑不在白名單中
- 使用禁止的 FFI 類型（如 callback）

#### 2. **XenonMemoryError**

記憶體操作失敗（雙重釋放、限制超出等）。

```typescript
try {
  const buf = Xenon.allocBuffer(256)
  Xenon.freeBuffer(buf)
  Xenon.freeBuffer(buf) // ❌
} catch (e) {
  if (e instanceof XenonMemoryError) {
    console.log('Memory error:', e.message)
    // "Double-free detected: 0x1000"
  }
}
```

**常見原因**：

- 雙重釋放
- 記憶體限制超出
- 非法緩衝區指針

#### 3. **XenonTypeError**

符號定義驗證失敗。

```typescript
try {
  Xenon.load('lib', '/usr/lib/lib.so', {
    func: { args: ['invalid_type'], returns: 'void' }
  })
} catch (e) {
  if (e instanceof XenonTypeError) {
    console.log('Type error:', e.message)
    // "Symbol validation failed: unknown arg type ..."
  }
}
```

#### 4. **XenonLibraryError**

庫操作失敗（dlopen 失敗、符號查找失敗等）。

```typescript
try {
  Xenon.load('nonexistent', '/usr/lib/libnonexistent.so', {})
} catch (e) {
  if (e instanceof XenonLibraryError) {
    console.log('Library error:', e.message)
    // "Failed to load library 'nonexistent' from '...': ..."
  }
}
```

#### 5. **XenonConfigError**

配置無效（最大庫數超出等）。

```typescript
try {
  Xenon.configure({ maxLibraries: 5 })
  for (let i = 0; i < 10; i++) {
    Xenon.load(`lib${i}`, `/usr/lib/lib${i}.so`, {})
  }
} catch (e) {
  if (e instanceof XenonConfigError) {
    console.log('Config error:', e.message)
    // "Maximum libraries (5) exceeded"
  }
}
```

### 建議的錯誤處理模式

```typescript
import {
  Xenon,
  XenonSecurityError,
  XenonMemoryError,
  XenonTypeError,
  XenonLibraryError,
  XenonConfigError,
} from '@gravito/xenon'

// 配置階段
try {
  Xenon.configure({
    allowedPaths: ['/usr/lib/lib*.so'],
    blockedPaths: ['/etc/**'],
  })
} catch (e) {
  if (e instanceof XenonConfigError) {
    console.error('Failed to configure Xenon:', e.message)
    process.exit(1)
  }
}

// 載入階段
let sqlite: LibraryHandle
try {
  sqlite = Xenon.load('sqlite3', '/usr/lib/libsqlite3.so', {
    sqlite3_open: { args: ['cstring', 'ptr'], returns: 'i32' },
  })
} catch (e) {
  if (e instanceof XenonSecurityError) {
    console.error('Security policy prevented library load:', e.message)
    process.exit(1)
  } else if (e instanceof XenonTypeError) {
    console.error('Invalid FFI symbol definitions:', e.message)
    process.exit(1)
  } else if (e instanceof XenonLibraryError) {
    console.error('Failed to load library:', e.message)
    // 可能是庫不存在，嘗試備選
    process.exit(1)
  }
}

// 運行時操作
try {
  const buf = Xenon.allocBuffer(1024, 'temp')
  sqlite.call('sqlite3_open', 'test.db', buf)
  Xenon.freeBuffer(buf)
} catch (e) {
  if (e instanceof XenonMemoryError) {
    console.error('Memory operation failed:', e.message)
  } else if (e instanceof XenonLibraryError) {
    console.error('FFI call failed:', e.message)
  }
}

// 清理
Xenon.close()
```

---

## 實例應用：SQLite 整合

Xenon 設計用於安全地封裝複雜的原生庫。**SQLite Satellite** 展示完整的整合模式。

### 架構

```
┌─────────────────────────────────────────┐
│        SatelliteSQLite                  │  Gravito integration
│  (PlanetCore 生命週期管理)              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│        SQLiteService                    │  Connection pool
│  (連接管理、查詢執行)                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│         Xenon                           │  FFI safety layer
│  (記憶體管理、路徑驗證)                 │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│      libsqlite3.so                      │  Native library
│  (sqlite3_open, sqlite3_exec, ...)      │
└─────────────────────────────────────────┘
```

### 設定步驟

#### 1. 配置 Xenon

```typescript
import { Xenon } from '@gravito/xenon'

// 在應用啟動時
Xenon.configure({
  allowedPaths: [
    '/usr/lib/libsqlite3.so*',    // Linux
    '/usr/lib/libsqlite3.dylib',  // macOS
  ],
  blockedPaths: ['/etc/**', '/sys/**'],
  maxTotalMemory: 1024 * 1024 * 1024, // 1 GB
})
```

#### 2. 定義 SQLite FFI 符號

```typescript
const SQLITE_SYMBOLS = {
  sqlite3_open: {
    args: ['cstring', 'ptr'],      // path, ppDb
    returns: 'i32',                 // return code
  },
  sqlite3_open_v2: {
    args: ['cstring', 'ptr', 'i32', 'cstring'],
    returns: 'i32',
  },
  sqlite3_exec: {
    args: ['ptr', 'cstring', 'ptr', 'ptr', 'ptr'],
    returns: 'i32',
  },
  sqlite3_close: {
    args: ['ptr'],                  // db
    returns: 'i32',
  },
  sqlite3_last_insert_rowid: {
    args: ['ptr'],
    returns: 'i64',
  },
  sqlite3_errmsg: {
    args: ['ptr'],
    returns: 'cstring',
  },
  // ... 更多函數
}
```

#### 3. 創建連接管理器

```typescript
import { Xenon, type LibraryHandle } from '@gravito/xenon'

export class SQLiteConnection {
  private handle: LibraryHandle
  private dbPtr: number

  constructor(handle: LibraryHandle, dbPath: string) {
    this.handle = handle
    // 分配指針存儲緩衝區
    const ptrBuf = Xenon.allocBuffer(8, 'sqlite_db_ptr')
    // 調用 sqlite3_open
    const rc = this.handle.call('sqlite3_open', dbPath, ptrBuf)
    if (rc !== 0) {
      throw new Error(`sqlite3_open failed: ${rc}`)
    }
    // 讀取返回的指針
    this.dbPtr = new DataView(ptrBuf).getBigInt64(0)
  }

  execute(sql: string): any[] {
    // 分配查詢結果緩衝區
    const resultBuf = Xenon.allocBuffer(4096, 'sqlite_query_result')
    try {
      const rc = this.handle.call(
        'sqlite3_exec',
        this.dbPtr,
        sql,
        0, // callback
        0, // arg
        resultBuf
      )
      if (rc !== 0) {
        const errMsg = this.handle.call('sqlite3_errmsg', this.dbPtr)
        throw new Error(`Query failed: ${errMsg}`)
      }
      // 解析結果
      return this.parseResults(resultBuf)
    } finally {
      Xenon.freeBuffer(resultBuf)
    }
  }

  close(): void {
    this.handle.call('sqlite3_close', this.dbPtr)
  }

  private parseResults(buf: Uint8Array): any[] {
    // 實現結果解析邏輯
    return []
  }
}
```

#### 4. 實現 Satellite

```typescript
import { SatelliteSQLite } from '@gravito/satellite-sqlite'

// 在應用程序啟動時
const app = createApp({
  satellites: [
    SatelliteSQLite.configure({
      libPath: '/usr/lib/libsqlite3.so.0', // 或自動偵測
      xenonConfig: {
        allowedPaths: ['/usr/lib/libsqlite3.so*'],
      },
    }),
  ],
})

// 現在可以在任何地方使用
app.use(async (ctx) => {
  const sqlite = ctx.sqlite // SQLiteService 實例
  const conn = await sqlite.createConnection(':memory:')
  const results = await conn.execute('SELECT * FROM users')
  await conn.close()
})
```

### 安全保證

SQLite 整合通過 Xenon 提供：

1. **只載入受信原生庫**：只允許 `/usr/lib/libsqlite3.so*`
2. **類型安全的 FFI**：所有符號都驗證
3. **記憶體泄漏檢測**：所有查詢緩衝區自動追蹤
4. **路徑驗證**：SQLite 資料庫路徑由應用程式策略限制
5. **雙重釋放防護**：緩衝區生命週期由 Xenon 管理

---

## 最佳實踐

### 1. 配置設計

**原則**：盡可能限制。

```typescript
// ✅ 推薦：應用程序初始化時配置一次
import { Xenon } from '@gravito/xenon'

const xenonConfig: XenonConfig = {
  // 白名單：僅允許必需的庫
  allowedPaths: [
    '/usr/lib/libsqlite3.so*',
    '/usr/lib/libssl.so*',
  ],
  // 黑名單：禁止系統路徑
  blockedPaths: [
    '/etc/**',
    '/sys/**',
    '/proc/**',
  ],
  // 限制：防止 DoS
  maxLibraries: 10,
  maxTotalMemory: 512 * 1024 * 1024,
}

Xenon.configure(xenonConfig)

// ❌ 不要：每次操作時重新配置
for (const lib of libs) {
  Xenon.configure({ ... })
  Xenon.load(...)
}
```

### 2. 記憶體生命週期

**原則**：alloc 和 free 成對出現。

```typescript
// ✅ 推薦：使用 try-finally 確保釋放
function queryDatabase(sql: string) {
  const buffer = Xenon.allocBuffer(4096, 'query_buffer')
  try {
    return executeQuery(sql, buffer)
  } finally {
    Xenon.freeBuffer(buffer) // 總是執行
  }
}

// ✅ 推薦：使用範圍標籤幫助除錯
const userBuf = Xenon.allocBuffer(1024, 'user_data_temp')
const sessionBuf = Xenon.allocBuffer(512, 'session_cache')

// ❌ 不要：忘記釋放
function badCode() {
  const buffer = Xenon.allocBuffer(1024)
  return buffer // 洩漏！
}

// ❌ 不要：尋求後釋放
const buf = Xenon.allocBuffer(256)
sqlite.call('query', buf) // 函數可能保留指針！
Xenon.freeBuffer(buf)     // 早釋放
```

### 3. 符號定義

**原則**：驗證和文檔化每個符號。

```typescript
// ✅ 推薦：清晰的註釋和驗證
const symbols = {
  sqlite3_open: {
    args: ['cstring', 'ptr'],
    returns: 'i32',
    // 打開資料庫。args: (path, &ppDb), returns: SQLITE_OK (0) on success
  },
  sqlite3_exec: {
    args: ['ptr', 'cstring', 'ptr', 'ptr', 'ptr'],
    returns: 'i32',
    // 執行 SQL。args: (db, sql, callback, arg, &errmsg)
  },
}

// ❌ 不要：未驗證的符號
const symbols = {
  mystery_func: { args: ['ptr', 'ptr', 'ptr'], returns: 'i32' },
  // 這個做什麼？什麼是指針？
}

// ❌ 不要：危險的回調類型
const symbols = {
  set_callback: { args: ['callback'], returns: 'void' }, // 禁止！
}
```

### 4. 錯誤恢復

**原則**：在配置和載入階段快速失敗，在運行時優雅降級。

```typescript
// ✅ 推薦：啟動時驗證
async function initializeApp() {
  try {
    // 配置嚴格
    Xenon.configure(strictConfig)

    // 驗證庫存在
    const sqlite = Xenon.load('sqlite3', libPath, symbols)

    // 測試連接
    await testConnection(sqlite)

  } catch (e) {
    if (e instanceof XenonSecurityError) {
      logger.error('Security configuration error:', e)
      process.exit(1) // 快速失敗
    } else if (e instanceof XenonLibraryError) {
      logger.error('Library not found:', e)
      process.exit(1)
    }
  }
}

// ✅ 推薦：運行時備選
async function executeQuery(sql: string) {
  try {
    return await sqlite.exec(sql)
  } catch (e) {
    if (e instanceof XenonLibraryError) {
      logger.warn('FFI call failed, using fallback:', e)
      return await fallbackQuery(sql) // 備選實現
    }
    throw
  }
}
```

### 5. 記憶體監控

**原則**：定期檢查洩漏。

```typescript
// ✅ 推薦：定期統計
setInterval(() => {
  const stats = Xenon.getMemoryStats()
  metrics.gauge('xenon.memory.allocated', stats.totalAllocated)
  metrics.gauge('xenon.memory.active', stats.activeBuffers)
  metrics.gauge('xenon.memory.peak', stats.peakBuffers)

  if (stats.activeBuffers > stats.peakBuffers * 0.9) {
    logger.warn('High active buffer count, possible leak')
  }
}, 60000) // 每分鐘

// ✅ 推薦：監控成長趨勢
let lastStats = Xenon.getMemoryStats()
setInterval(() => {
  const stats = Xenon.getMemoryStats()
  const growth = stats.totalAllocated - lastStats.totalAllocated
  if (growth > 100 * 1024 * 1024) { // 100 MB/min
    logger.warn('Memory growth detected:', growth)
  }
  lastStats = stats
}, 60000)
```

### 6. 測試

**原則**：為每個 FFI 邊界編寫測試。

```typescript
import { expect, test, beforeEach, afterEach } from 'bun:test'
import { Xenon } from '@gravito/xenon'

test.group('Xenon SQLite', () => {
  beforeEach(() => {
    Xenon.configure({ allowedPaths: ['/usr/lib/libsqlite3.so*'] })
  })

  afterEach(() => {
    Xenon.close()
  })

  test('should allocate and free buffer', () => {
    const buf = Xenon.allocBuffer(256, 'test')
    expect(buf.byteLength).toBe(256)

    const stats1 = Xenon.getMemoryStats()
    expect(stats1.activeBuffers).toBe(1)

    Xenon.freeBuffer(buf)

    const stats2 = Xenon.getMemoryStats()
    expect(stats2.activeBuffers).toBe(0)
  })

  test('should detect double-free', () => {
    const buf = Xenon.allocBuffer(256)
    Xenon.freeBuffer(buf)

    expect(() => Xenon.freeBuffer(buf)).toThrow(
      /Double-free detected/
    )
  })

  test('should enforce security policy', () => {
    expect(() => {
      Xenon.load('evil', '/etc/passwd', {})
    }).toThrow(/Library path blocked/)
  })

  test('should validate FFI symbols', () => {
    expect(() => {
      Xenon.load('lib', '/usr/lib/lib.so', {
        func: { args: ['callback'], returns: 'void' }
      })
    }).toThrow(/forbidden arg type/)
  })
})
```

---

## 性能考慮

### 性能特徵

| 操作 | 時間複雜度 | 備註 |
|------|---------|------|
| `allocBuffer` | O(1) | 堆棧分配 + Map 插入 |
| `freeBuffer` | O(1) | Map 查找 + 標記 |
| `load` | O(n) | n = 符號數（驗證） |
| `call` | O(1) | 直接 FFI 調用 |
| `getMemoryStats` | O(n) | n = 活躍緩衝區數 |

### 優化建議

#### 1. **緩衝區重用**

不要頻繁分配/釋放；重用長壽命緩衝區。

```typescript
// ❌ 低效：每次查詢分配
function query(sql: string) {
  const buf = Xenon.allocBuffer(1024) // 分配
  const result = execute(sql, buf)
  Xenon.freeBuffer(buf)                // 釋放
  return result
}

for (let i = 0; i < 1000; i++) {
  query(...)  // 1000 次分配/釋放
}

// ✅ 高效：預分配
const queryBuf = Xenon.allocBuffer(1024) // 1 次分配
for (let i = 0; i < 1000; i++) {
  execute(..., queryBuf)  // 重用
}
Xenon.freeBuffer(queryBuf) // 1 次釋放
```

#### 2. **批量操作**

合併多個 FFI 調用以減少往返。

```typescript
// ❌ 低效：多次往返
function insertUsers(users: User[]) {
  for (const user of users) {
    sqlite.call('insert_user', user.name, user.email)
  }
}

// ✅ 高效：單個事務
function insertUsers(users: User[]) {
  sqlite.call('begin_transaction')
  for (const user of users) {
    sqlite.call('insert_user', user.name, user.email)
  }
  sqlite.call('commit')
}
```

#### 3. **配置優化**

根據應用程序配置 `maxTotalMemory` 和 `maxLibraries`。

```typescript
// 低記憶體環境
Xenon.configure({
  maxTotalMemory: 64 * 1024 * 1024,  // 64 MB
  maxLibraries: 5,
})

// 高性能環境
Xenon.configure({
  maxTotalMemory: 4 * 1024 * 1024 * 1024,  // 4 GB
  maxLibraries: 50,
})
```

#### 4. **禁用洩漏檢測（生產環境）**

`FinalizationRegistry` 有開銷。若信任代碼，可禁用。

```typescript
Xenon.configure({
  enableMemoryTracking: false, // 在測試環境啟用
})
```

### 基準測試

Xenon 核心操作的典型性能：

```
allocBuffer(1KB)    : ~0.1 µs
freeBuffer()        : ~0.05 µs
load() + 10 symbols : ~5 ms (驗證開銷)
call()              : ~0.5-2 µs (取決於參數複製)
getMemoryStats()    : ~0.01 ms (100 活躍緩衝區)
```

---

## 總結

Xenon 為 Gravito 應用程序提供安全、可觀察且高效的 FFI 封裝。核心優勢：

1. ✅ **安全第一**：路徑驗證 + 類型檢查 + 黑名單
2. ✅ **記憶體安全**：洩漏檢測 + 雙重釋放防護
3. ✅ **可觀察**：詳細統計 + 堆棧追蹤 + 審計日誌
4. ✅ **易用**：單例 API + 類型安全 + 清晰錯誤

適用於需要安全原生庫整合的任何生產環境。

---

## 附錄：完整範例

### 完整的 SQLite 應用程序

```typescript
import { Xenon, type LibraryHandle } from '@gravito/xenon'

// 1. 配置
Xenon.configure({
  allowedPaths: ['/usr/lib/libsqlite3*'],
  blockedPaths: ['/etc/**'],
  maxTotalMemory: 512 * 1024 * 1024,
})

// 2. 載入庫
const sqlite = Xenon.load('sqlite3', '/usr/lib/libsqlite3.so', {
  sqlite3_open: { args: ['cstring', 'ptr'], returns: 'i32' },
  sqlite3_exec: { args: ['ptr', 'cstring', 'ptr', 'ptr', 'ptr'], returns: 'i32' },
  sqlite3_close: { args: ['ptr'], returns: 'i32' },
  sqlite3_errmsg: { args: ['ptr'], returns: 'cstring' },
})

// 3. 運行查詢
async function main() {
  const dbPath = './test.db'

  // 分配 DB 指針緩衝區
  const dbPtrBuf = Xenon.allocBuffer(8, 'db_ptr')

  try {
    // 開啟資料庫
    let rc = sqlite.call('sqlite3_open', dbPath, dbPtrBuf)
    if (rc !== 0) throw new Error('Open failed')

    // 執行查詢
    const queryBuf = Xenon.allocBuffer(4096, 'query_result')
    try {
      rc = sqlite.call('sqlite3_exec', dbPtr, 'SELECT 1', 0, 0, queryBuf)
      if (rc !== 0) {
        const err = sqlite.call('sqlite3_errmsg', dbPtr)
        throw new Error(`Query failed: ${err}`)
      }
      console.log('Query successful')
    } finally {
      Xenon.freeBuffer(queryBuf)
    }

  } finally {
    Xenon.freeBuffer(dbPtrBuf)
    sqlite.close()
    Xenon.close()
  }
}

main().catch(console.error)
```

---

**文檔版本**：1.0.0
**最後更新**：2026-02-24
**維護者**：Gravito Team
