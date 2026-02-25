# Xenon FFI 架構深度分析

## 目錄

1. [設計決策](#設計決策)
2. [模組間通信](#模組間通信)
3. [安全機制詳解](#安全機制詳解)
4. [記憶體模型](#記憶體模型)
5. [擴展點](#擴展點)
6. [已知限制](#已知限制)

---

## 設計決策

### 決策 1：單例模式

**選擇**：靜態 `Xenon` 門面 + 內部 `XenonManager` 單例

**原因**：

```typescript
// ✅ 單例：全局配置一次
Xenon.configure({ ... })
Xenon.load(...)
Xenon.allocBuffer(...)

// vs.

// ❌ 非單例：每次都傳遞配置
const manager = new XenonManager({ ... })
manager.load(...)
manager.allocBuffer(...)
```

FFI 安全策略本質上是全局的（系統層面）。一個應用程序應有一份一致的策略。單例確保：
- 配置只設置一次
- 所有庫載入都遵循相同的安全策略
- 全局記憶體統計有意義

**權衡**：

| 優點 | 缺點 |
|------|------|
| 全局一致的安全策略 | 難以多租戶應用（但 FFI 通常不需要） |
| 簡單 API | 測試時需要 reset() |
| 全局記憶體統計 | 執行緒安全性（Bun 單執行緒） |

### 決策 2：所有權區分

**選擇**：`owned` vs `borrowed` 緩衝區

```typescript
// Owned：Xenon 管理生命週期
const owned = Xenon.allocBuffer(256)
Xenon.freeBuffer(owned)

// Borrowed：外部管理生命週期
const borrowed = manager.borrowBuffer(ptr, len, 'label')
// 不呼叫 freeBuffer()
```

**原因**：

不是所有記憶體都由 Xenon 分配。FFI 函數可能返回指針：

```typescript
// 假設庫定義：void* lib_create_context()
const ctxPtr = lib.call('lib_create_context')
// 指針由庫擁有，不能由 Xenon 釋放

// Xenon 需要知道這點
const ctxMeta = manager.borrowBuffer(ctxPtr, 0, 'lib_context')
// 現在記憶體追蹤知道這是 borrowed
```

**實現**：

```typescript
export interface ManagedBuffer {
  ownership: 'owned' | 'borrowed'  // 區分符
  freed: boolean                    // owned: 是否呼叫過 free
  // ...
}

// 針對 owned
function free(ptr: number) {
  const buf = this.buffers.get(ptr)
  if (buf.ownership === 'borrowed') {
    // ❌ 不能釋放 borrowed 緩衝區
    throw new XenonMemoryError('Cannot free borrowed buffer')
  }
  markFreed(buf)
}
```

### 決策 3：雙重釋放檢測

**選擇**：追蹤 `freed` 標誌 + `freed` 阻止再次釋放

```typescript
const buf = Xenon.allocBuffer(256)
Xenon.freeBuffer(buf)
Xenon.freeBuffer(buf) // ❌ 檢測到 freed=true
```

**原因**：

雙重釋放是常見的記憶體錯誤：

```c
// 原生代碼中
void* ptr = malloc(256);
free(ptr);
free(ptr); // ❌ 損壞堆
```

Xenon 無法完全防止（Bun 不追蹤指針有效性），但可以檢測應用層級的重複釋放。

**實現**：

```typescript
export function markFreed(buf: ManagedBuffer): void {
  buf.freed = true
}

export function isFreed(buf: ManagedBuffer): boolean {
  return buf.freed
}

// 在 free() 中
if (isFreed(buf)) {
  throw new XenonMemoryError(`Double-free detected: 0x${ptr.toString(16)}`)
}
```

### 決策 4：路徑匹配（簡單通配符）

**選擇**：支持 `*` 通配符（不支持 `?`, `[...]`）

```typescript
Xenon.configure({
  allowedPaths: [
    '/usr/lib/lib*.so',        // ✅ 簡單星號
    '/opt/lib/lib*.so.1.*',    // ✅ 多個星號
  ],
  blockedPaths: [
    '/etc/**',                 // ✅ 雙星號
  ]
})
```

**原因**：

完整的 glob 模式（`**`, `?`, `[...]`）複雜且容易被繞過。簡單通配符足以滿足大多數用例：

```typescript
private pathMatches(path: string, pattern: string): boolean {
  if (path === pattern) return true  // 精確匹配

  if (pattern.includes('*')) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`)
    return regex.test(path)           // 星號轉換為正則表達式
  }

  return false
}
```

**安全性**：

- ❌ 不支持：`/usr/lib/lib?.so` (單字符)
- ❌ 不支持：`/usr/lib/lib[s3].so` (字符類)
- ✅ 支持：`/usr/lib/lib*.so` (任何長度)
- ✅ 支持：`/etc/**` (遞歸 - 轉換為 `/etc/.*`)

### 決策 5：FinalizationRegistry 用於洩漏檢測

**選擇**：使用 `FinalizationRegistry` 監控 owned 緩衝區

```typescript
const registry = new FinalizationRegistry((ptr) => {
  // 緩衝區被垃圾回收但未釋放
  console.warn(`Memory leak detected: 0x${ptr.toString(16)}`)
})

register(buf, buffer) {
  if (isOwned(buf)) {
    registry.register(buffer, buf.ptr) // 監控此緩衝區
  }
}
```

**原因**：

Xenon 無法強制應用程序呼叫 `freeBuffer()`。`FinalizationRegistry` 提供後備偵測：

```javascript
function badCode() {
  const buf = Xenon.allocBuffer(1024)  // ✅ 分配
  return buf.data                      // ❌ 忘記釋放
}

badCode()
// ...稍後垃圾回收...
// [Xenon] Memory leak detected: ...
```

**權衡**：

| 優點 | 缺點 |
|------|------|
| 檢測真實洩漏 | 開銷（GC 相關） |
| 應用無感 | 發現時間不確定（GC 時機） |
| | 無法防止，只能檢測 |

**最佳實踐**：

```typescript
// 推薦：顯式釋放 + FinalizationRegistry 備選
function goodCode() {
  const buf = Xenon.allocBuffer(1024)
  try {
    // 使用 buf
  } finally {
    Xenon.freeBuffer(buf)  // 顯式且快速
  }
  // FinalizationRegistry 永遠不會觸發
}
```

---

## 模組間通信

### 數據流：load() 操作

```
Xenon.load(name, path, symbols)
    ↓
XenonManager.load()
    ↓
LibraryLoader.load()
    │
    ├─ validatePath(path)
    │     ├─ 檢查 blockedPaths（黑名單優先）
    │     └─ 檢查 allowedPaths（如配置）
    │
    ├─ validateSymbols(symbols)
    │     ├─ TypeGuard.validateSymbolDef()
    │     │     ├─ 檢查每個 return 類型
    │     │     └─ 檢查每個 arg 類型
    │     └─ 禁止 callback 等危險類型
    │
    └─ FFILoader(path, symbols)  // bun:ffi
          └─ dlopen(path, symbols)
    ↓
LibraryHandleImpl (包裝 dlHandle)
    ↓
返回給調用者
```

**關鍵不變性**：

只有通過驗證的 (path, symbols) 才能到達 FFI 層：

```
未驗證 → 拋出安全錯誤
   ↓
已驗證 → dlopen()
   ↓
LibraryHandleImpl 包裝 → 返回
```

### 數據流：allocBuffer() 操作

```
Xenon.allocBuffer(size, label)
    ↓
XenonManager.allocBuffer()
    │
    ├─ 驗證 size > 0
    │
    ├─ 建立 Uint8Array(size)
    │
    ├─ 分配虛擬指針 ptr = nextPtr++
    │
    ├─ 建立 ManagedBuffer 元數據
    │     ├─ ownership: 'owned'
    │     ├─ freed: false
    │     ├─ label
    │     └─ stackTrace
    │
    ├─ MemoryTracker.register(meta, buffer)
    │     ├─ 檢查記憶體限制
    │     ├─ Map<ptr, meta> 儲存
    │     └─ FinalizationRegistry.register(buffer, ptr)
    │
    └─ bufferMap<Uint8Array, ptr> 儲存
    ↓
返回 Uint8Array 給調用者
```

### 模組職責

| 模組 | 職責 | 關鍵函數 |
|------|------|---------|
| **Xenon** | 全局門面 | configure, load, allocBuffer, getMemoryStats |
| **XenonManager** | 協調 | 委託給 Loader 和 Tracker |
| **LibraryLoader** | 安全驗證 + 載入 | validatePath, validateSymbols, load |
| **LibraryHandleImpl** | 函數調用包裝 | call, close |
| **MemoryTracker** | 記憶體生命週期 | register, free, getStats |
| **TypeGuard** | 符號驗證 | validateType, validateSymbols |
| **BoundsChecker** | 邊界檢查 | 未來擴展 |
| **BufferOwnership** | 所有權追蹤 | isOwned, isBorrowed, markFreed |

---

## 安全機制詳解

### 1. 路徑驗證層級

```
Level 1: 黑名單檢查（最高優先級）
┌────────────────────────────────┐
│ 系統路徑永不允許                 │
│ /etc/**, /sys/**, /proc/**    │
│ （由應用程序配置）              │
└────────────────────────────────┘
      ↓（匹配→拒絕）
Level 2: 白名單檢查
┌────────────────────────────────┐
│ 如果配置 allowedPaths 非空      │
│ 路徑必須匹配其中之一             │
│ /usr/lib/lib*.so, /opt/lib/*   │
└────────────────────────────────┘
      ↓（未匹配→拒絕）
Level 3: 通過（預設允許）
┌────────────────────────────────┐
│ 如果白名單為空，允許非黑名單路徑 │
└────────────────────────────────┘
```

**實現**：

```typescript
private validatePath(path: string): void {
  // Level 1：黑名單（優先）
  const blocked = this.config.blockedPaths || []
  if (blocked.some((p) => this.pathMatches(path, p))) {
    throw new XenonSecurityError(`Library path blocked: ${path}`)
  }

  // Level 2：白名單（如配置）
  const allowed = this.config.allowedPaths || []
  if (allowed.length > 0 && !allowed.some((p) => this.pathMatches(path, p))) {
    throw new XenonSecurityError(`Library path not allowed: ${path}`)
  }
}
```

### 2. 類型驗證層級

```
Level 1: 檢查返回類型
┌────────────────────────────────┐
│ returns: 'callback' → 禁止       │
│ returns: 'invalid_type' → 禁止  │
│ returns: 'i32' → 允許            │
└────────────────────────────────┘
      ↓
Level 2: 檢查每個參數類型
┌────────────────────────────────┐
│ args[0]: 'callback' → 禁止       │
│ args[1]: 'i32' → 允許           │
└────────────────────────────────┘
      ↓
允許符號通過
```

**實現**：

```typescript
export function validateSymbolDef(
  symbol: string,
  def: FFISymbolDef
): TypeValidationResult {
  const errors: string[] = []

  // 檢查返回類型
  if (!validateType(def.returns)) {
    errors.push(`Unknown return type: '${def.returns}'`)
  }
  if (FORBIDDEN_TYPES.has(def.returns)) {
    errors.push(`Forbidden return type: '${def.returns}'`)
  }

  // 檢查參數類型
  for (let i = 0; i < def.args.length; i++) {
    const arg = def.args[i]
    if (!validateType(arg)) {
      errors.push(`Unknown arg type at ${i}: '${arg}'`)
    }
    if (FORBIDDEN_TYPES.has(arg)) {
      errors.push(`Forbidden arg type at ${i}: '${arg}'`)
    }
  }

  return { valid: errors.length === 0, errors }
}
```

### 3. 雙重釋放防護

```
State Machine for owned buffer:

┌─────────────┐
│  ALLOCATED  │  (freed: false)
└─────────────┘
      ↓
   free()
      ↓
┌─────────────┐
│   FREED     │  (freed: true)
└─────────────┘
      ↓
   free() again? → ❌ XenonMemoryError
```

**實現**：

```typescript
free(ptr: number): void {
  const buf = this.buffers.get(ptr)
  if (!buf) {
    throw new XenonMemoryError(`Buffer not tracked: 0x${ptr}`)
  }

  // 檢查雙重釋放
  if (isFreed(buf)) {
    throw new XenonMemoryError(`Double-free detected: 0x${ptr}`)
  }

  // 標記為已釋放
  markFreed(buf)
  this.totalFreed += buf.len
}
```

### 4. 記憶體限制強制執行

```
配置: maxTotalMemory = 1 GB

分配 800 MB
  ├─ totalAllocated = 800 MB
  └─ check: 800 <= 1000 ✅

分配 150 MB
  ├─ totalAllocated = 950 MB
  └─ check: 950 <= 1000 ✅

分配 100 MB
  ├─ totalAllocated would be 1050 MB
  └─ check: 1050 <= 1000 ❌ → XenonMemoryError
```

**實現**：

```typescript
register(buf: ManagedBuffer): void {
  // 檢查是否超限
  if (
    this.maxMemory > 0 &&
    this.totalAllocated + buf.len > this.maxMemory
  ) {
    throw new XenonMemoryError(
      `Memory limit exceeded: ${this.totalAllocated + buf.len} > ${this.maxMemory}`
    )
  }

  this.buffers.set(buf.ptr, buf)
  this.totalAllocated += buf.len
}
```

---

## 記憶體模型

### 虛擬指針系統

Xenon 不使用真實的記憶體指針（Bun Uint8Array 不直接暴露地址）。而是使用虛擬指針：

```typescript
// Xenon 內部
private nextPtr = 0x1000  // 起始虛擬指針

allocBuffer(size: number): Uint8Array {
  const buffer = new Uint8Array(size)
  const ptr = this.nextPtr++  // 分配虛擬指針

  // 建立對應
  this.bufferMap.set(buffer, ptr)  // Uint8Array → ptr
  this.tracker.register({ ptr, len: size, ... })
}
```

**優點**：

- ✅ 緩衝區移動時指針保持有效
- ✅ Xenon 可獨立追蹤
- ✅ 簡單和明確

**缺點**：

- ❌ 緩衝區無法直接傳給需要真實地址的 FFI 函數
- ❌ 某些 FFI 函數可能期望真實指針

**解決**：

```typescript
// 簡單情況：直接傳 Uint8Array
const result = lib.call('process_buffer', buffer)

// 複雜情況：使用 borrowed buffer（真實指針）
const realPtr = someNativeFunc()  // 返回真實指針
const meta = manager.borrowBuffer(realPtr, 512)
// Xenon 追蹤但不管理
```

### 記憶體生命週期狀態圖

```
┌──────────────────────────────────────────────────────────┐
│                    ALLOCATION PHASE                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  allocBuffer(size)                                       │
│    ↓                                                     │
│  new Uint8Array(size)  ← 堆棧分配                        │
│    ↓                                                     │
│  Map<Uint8Array, ptr> + MemoryTracker.register           │
│    ↓                                                     │
│  FinalizationRegistry.register(buffer, ptr)              │
│    ↓                                                     │
│  return buffer                                           │
│                                                          │
│  State: ALLOCATED (freed=false)                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
                          ↓ (好路徑)
┌──────────────────────────────────────────────────────────┐
│                    DEALLOCATION PHASE                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  freeBuffer(buffer)                                      │
│    ↓                                                     │
│  Look up ptr from bufferMap                              │
│    ↓                                                     │
│  Check if isFreed(buf) → ❌ Double-free?                │
│    ↓                                                     │
│  markFreed(buf) → freed=true                            │
│    ↓                                                     │
│  Update totalFreed                                       │
│    ↓                                                     │
│  State: FREED (freed=true)                              │
│                                                          │
│  (buffer 仍在記憶體中，但標記為已釋放)                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                  GARBAGE COLLECTION PHASE                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Variable holding buffer goes out of scope               │
│    ↓                                                     │
│  JavaScript GC marks Uint8Array for collection           │
│    ↓                                                     │
│  FinalizationRegistry.onFinalize(ptr)                    │
│    ↓                                                     │
│  Check: isFreed(buf)?                                    │
│    ├─ YES → ✅ All good, expected                        │
│    └─ NO  → ⚠️  LEAK DETECTED                            │
│            console.warn(...)                            │
│    ↓                                                     │
│  State: GC'd (removed from buffers map)                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 記憶體統計解釋

```typescript
const stats = Xenon.getMemoryStats()
// {
//   totalAllocated: 4096,    // 歷史總分配
//   totalFreed: 2048,        // 歷史總釋放
//   activeBuffers: 2,        // 當前活躍（未釋放）
//   peakBuffers: 5           // 歷史峰值
// }
```

**解釋**：

| 統計 | 含義 | 用途 |
|------|------|------|
| `totalAllocated` | 累計分配字節 | 預算、成本計算 |
| `totalFreed` | 累計釋放字節 | 驗證釋放率 |
| `activeBuffers` | 未釋放的活躍數 | 即時檢測洩漏 |
| `peakBuffers` | 歷史最高數 | 容量規劃 |

**監控邏輯**：

```typescript
const stats = Xenon.getMemoryStats()

// ❌ 洩漏警告
if (stats.activeBuffers > 100) {
  logger.warn('High buffer count, possible leak')
}

// ❌ 分配失敗
if (stats.totalAllocated > maxBudget) {
  logger.error('Memory budget exceeded')
}

// ✅ 正常
if (stats.activeBuffers === 0 && stats.totalAllocated === stats.totalFreed) {
  logger.info('All buffers properly managed')
}
```

---

## 擴展點

### 1. 自訂 FFI 加載器

Xenon 支持依賴注入替代 `bun:ffi`：

```typescript
interface FFILoader {
  (path: string, symbols: FFISymbols): any
}

const customLoader: FFILoader = (path, symbols) => {
  // 自訂邏輯，例如：
  // - 使用別的 FFI 庫
  // - 動態重定向路徑
  // - 記錄所有調用
  return actuallyLoadLibrary(path, symbols)
}

const loader = new LibraryLoader(config, customLoader)
```

### 2. 邊界檢查器（未來）

`BoundsChecker` 模組可擴展用於運行時邊界驗證：

```typescript
export interface BoundsChecker {
  check(ptr: number, offset: number, len: number): BoundsCheckResult
  // 驗證 [ptr + offset, ptr + offset + len) 有效
}

// 可由應用程序實現
class StrictBoundsChecker implements BoundsChecker {
  check(ptr: number, offset: number, len: number): BoundsCheckResult {
    const buf = tracker.get(ptr)
    if (!buf || offset + len > buf.len) {
      return { valid: false, reason: 'Out of bounds' }
    }
    return { valid: true }
  }
}
```

### 3. 自訂記憶體追蹤

可替換 `MemoryTracker` 以實現自訂記憶體策略：

```typescript
interface MemoryTracker {
  register(buf: ManagedBuffer, holdRef?: any): void
  free(ptr: number): void
  getStats(): MemoryStats
}

// 例如：實現記憶體池以改進性能
class PooledMemoryTracker implements MemoryTracker {
  private pool: Uint8Array[] = []

  allocBuffer(size: number): Uint8Array {
    // 從池中重用，而不是每次分配新的
    const existing = this.pool.find(b => b.byteLength >= size)
    if (existing) {
      this.pool = this.pool.filter(b => b !== existing)
      return existing
    }
    return new Uint8Array(size)
  }
}
```

---

## 已知限制

### 1. 沒有運行時邊界檢查

Xenon 追蹤緩衝區大小，但無法檢測 FFI 函數內的越界訪問：

```typescript
const buf = Xenon.allocBuffer(10)  // 10 字節

// Xenon 知道這是 10 字節
// 但無法防止：
lib.call('unsafe_write', buf)  // 函數寫入 100 字節

// 結果：堆棧損壞（由 Bun FFI 引起）
```

**緩解**：

```typescript
// ✅ 過度分配和驗證
const buf = Xenon.allocBuffer(1024)  // 1 KB，比需要多得多
// 函數即使寫入稍多也是安全的

// ✅ 仔細閱讀 C 函數簽名
// 確認緩衝區大小要求
const dbPath = './test.db'
lib.call('sqlite3_open', dbPath, bufPtr)
// sqlite3_open 寫入 8 字節（指針），檢查緩衝區 >= 8
```

### 2. 沒有使用後釋放檢測

釋放後訪問無法防止：

```typescript
const buf = Xenon.allocBuffer(256)
Xenon.freeBuffer(buf)

// 無法防止：
lib.call('process', buf)  // ❌ UAF - Bun 無法檢測

// Xenon 只能檢測重複 free()
Xenon.freeBuffer(buf)  // ✅ 檢測到
```

**緩解**：

```typescript
// ✅ 代碼審查和靜態分析
// ✅ 測試和消毒器（如果可用）
// ✅ 明確的生命週期註釋

/**
 * Process data. Buffer must remain有效直到此函數返回.
 * @param buf Uint8Array - 有效 10-100 字節
 */
function processData(buf: Uint8Array) {
  // ...
}

const buf = Xenon.allocBuffer(64)
try {
  processData(buf)  // 函數不得緩存 buf
} finally {
  Xenon.freeBuffer(buf)
}
```

### 3. 單執行緒假設

Xenon 針對 Bun 單執行緒模型進行了優化。在多執行緒環境中不安全：

```typescript
// ❌ 不安全（如果執行緒存在）
Xenon.allocBuffer(256)  // 執行緒 A
Xenon.getMemoryStats()  // 執行緒 B - 競態條件
```

**解決**：

```typescript
// ✅ 如果需要多執行緒：
// 1. 為每個 worker 創建獨立的 XenonManager
// 2. 或實現執行緒本地儲存（TLS）

const manager = new XenonManager(config)  // 每個 worker 一個
manager.allocBuffer(256)
```

### 4. 沒有符號熱重載

一旦庫載入，符號定義是固定的：

```typescript
const lib = Xenon.load('mylib', path, symbols1)

// ❌ 無法更改符號
// 無法添加新符號或修改現有符號

// 必須重新載入
Xenon.close()
Xenon.configure({ ... })
const lib2 = Xenon.load('mylib', path, symbols2)
```

### 5. 虛擬指針限制

虛擬指針不適用於所有 FFI 情景：

```typescript
// ✅ 有效：Uint8Array 作為緩衝區
lib.call('process', buffer)

// ❌ 無效：緩衝區地址作為 C 結構體
struct MyStruct {
  int* ptr;  // 期望真實地址
};
lib.call('init_struct', structPtr)  // structPtr 可能需要真實地址
```

**解決**：

```typescript
// 對於需要真實地址的情況，使用 borrowed buffer
const realPtr = nativeFunc()  // 返回真實指針
const meta = manager.borrowBuffer(realPtr, size)
```

---

## 總結：架構權衡

| 決策 | 優點 | 缺點 | 適用場景 |
|------|------|------|---------|
| 單例模式 | 簡單、全局一致 | 難以多租戶 | 單一應用程序 |
| 所有權區分 | 支持外部記憶體 | 稍複雜 | 混合所有權 |
| 虛擬指針 | 簡單、安全 | 限制功能 | 簡單 FFI |
| FinalizationRegistry | 檢測洩漏 | 開銷、延遲 | 開發/測試 |
| 簡單路徑匹配 | 快速、安全 | 有限表達力 | 大多數用例 |

**設計哲學**：

> 在 **安全第一** 和 **易用性** 之間平衡，接受 **功能限制** 換取 **可靠性** 和 **可觀察性**。

---

**版本**：1.0.0
**最後更新**：2026-02-24
