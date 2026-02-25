# Xenon FFI 與 Satellite SQLite 完整指南

## 概述

本指南涵蓋從安全 FFI 基礎（`@gravito/xenon`）到生產 Satellite 整合（`@gravito/satellite-sqlite`）的完整實現路徑。

## 架構層次

```
應用層
    ↓
PlanetCore (Galaxy Architecture)
    ↓
SatelliteSQLite (業務邏輯)
    ↓
SQLiteService (資源管理)
    ↓
Xenon (安全 FFI 層)
    ├── LibraryLoader (安全載入)
    ├── TypeGuard (符號驗證)
    ├── BoundsChecker (邊界檢查)
    └── MemoryTracker (記憶體追蹤)
    ↓
原生 libsqlite3
```

## @gravito/xenon 核心特性

### 1. 安全 FFI 加載（LibraryLoader）

```typescript
// 配置安全政策
Xenon.configure({
  allowedPaths: ['/usr/lib/lib*.so', '/usr/lib/*.dylib'],
  blockedPaths: ['/etc/**', '/sys/**'],
})

// 加載系統庫
const sqlite3 = Xenon.load('sqlite3', {
  path: '/usr/lib/libsqlite3.dylib',
  symbols: {
    sqlite3_open: { args: ['cstring', 'ptr'], returns: 'i32' },
    sqlite3_exec: { args: ['ptr', 'cstring'], returns: 'i32' },
  },
})

// ✅ 自動驗證：
// - 路徑在允許列表中
// - 符號定義有效（無 callback 類型）
// - 沒有循環依賴或危險載入
```

### 2. 型別安全驗證（TypeGuard）

```typescript
// 禁止的類型檢查
const forbidden = ['callback', 'void*']

// ✅ 允許的安全類型
const allowed = [
  'i8', 'i16', 'i32', 'i64',    // 整數
  'u8', 'u16', 'u32', 'u64',    // 無符號整數
  'f32', 'f64',                  // 浮點數
  'ptr',                          // 指標
  'cstring',                      // C 字串
  'void'                          // 無返回值
]
```

### 3. 邊界檢查（BoundsChecker）

```typescript
// 防止緩衝區溢位
checkBounds(bufferLen: 1024, offset: 100, size: 950)
// ✅ 有效

checkBounds(bufferLen: 1024, offset: 100, size: 1000)
// ❌ 越界：[100, 1100) > 1024

checkBounds(bufferLen: 1024, offset: 0x7fffffff, size: 0x7fffffff)
// ❌ 整數溢位檢測
```

### 4. 記憶體生命週期（MemoryTracker）

```typescript
// Owned 緩衝區（Xenon 管理）
const buf = xenon.allocBuffer(1024, 'mylib')
// ✅ 由 FinalizationRegistry 追蹤
// ✅ GC 時自動偵測洩漏

// Borrowed 緩衝區（外部管理）
const borrowed = xenon.borrowBuffer(ptr, len, 'external')
// ✅ 追蹤但不管理生命週期

// Double-free 防護
xenon.freeBuffer(buf)
xenon.freeBuffer(buf)  // ❌ XenonMemoryError
```

## @gravito/satellite-sqlite 實現

### 架構決策

| 決策 | 原因 |
|------|------|
| 使用 Xenon | 安全第一，符號驗證、邊界檢查、記憶體追蹤 |
| Satellite 模式 | PlanetCore 整合、生命週期管理 |
| Service 層 | 連接池、安全政策集中管理 |
| 型別安全介面 | 隱藏 FFI 複雜性 |

### 安全層次設計

```
應用層提交 SQL
    ↓
SQLiteConnection.execute(sql, params)
    ↓
SQLiteService 驗證路徑
    ↓
Xenon 安全檢查
    - 符號已驗證 ✅
    - 邊界已檢查 ✅
    - 記憶體已追蹤 ✅
    ↓
Native FFI 呼叫
    ↓
安全返回結果
```

### 使用範例

#### 基本使用

```typescript
import { SatelliteSQLite } from '@gravito/satellite-sqlite'

// 配置
const sqlite = SatelliteSQLite.configure({
  dbPath: '/app/data/main.db',
})

// 安裝至 PlanetCore
await core.addSatellite(sqlite)

// 使用（在路由處理器中）
async function getUserHandler(ctx: any) {
  const db = ctx.sqlite
  const conn = await db.createConnection('/app/data/users.db')

  const user = await conn.getOne(
    'SELECT * FROM users WHERE id = ?',
    [ctx.params.id]
  )

  await conn.close()
  return user
}
```

#### 安全政策

```typescript
const sqlite = SatelliteSQLite.configure({
  dbPath: '/app/data/main.db',
  xenonConfig: {
    // 白名單：只允許這些路徑
    allowedPaths: [
      '/app/data/**',
      '/var/lib/gravito/**',
    ],
    // 黑名單：明確禁止
    blockedPaths: [
      '/etc/**',
      '/sys/**',
      '/root/**',
    ],
  },
})
```

## 安全保證

### 威脅模型與防護

| 威脅 | Xenon 防護 | 說明 |
|------|-----------|------|
| 任意檔案讀取 | LibraryLoader 路徑驗證 | 白名單/黑名單政策 |
| 危險 FFI 符號 | TypeGuard 符號驗證 | 禁止 callback、型別檢查 |
| 緩衝區溢位 | BoundsChecker | 整數溢位、越界檢測 |
| 記憶體洩漏 | MemoryTracker | GC 協作、洩漏警告 |
| Double-free | MemoryTracker | owned/borrowed 模型 |
| 未授權存取 | SQLiteService 路徑檢查 | 應用層策略執行 |

### 驗證層次

```
第 1 層：應用層驗證
  ↓
第 2 層：SQLiteService 路徑檢查
  ↓
第 3 層：Xenon 符號驗證
  ↓
第 4 層：Xenon 邊界檢查
  ↓
第 5 層：Xenon 記憶體追蹤
  ↓
第 6 層：作業系統保護
```

## 開發指南

### 創建新 Satellite（範本）

```typescript
// 1. 定義型別
interface MyServiceConfig { /* ... */ }

// 2. 實現 Service（使用 Xenon）
class MyService {
  private xenon = new XenonManager(config)

  async loadLibrary() {
    return this.xenon.load('mylib', {
      path: '/usr/lib/libmylib.so',
      symbols: { /* ... */ },
    })
  }
}

// 3. 創建 Satellite
class SatelliteMyService {
  async install(ctx: any) {
    ctx.myservice = new MyService()
  }

  async uninstall() {
    // 清理資源
  }
}
```

### 測試策略

```typescript
// ✅ 單元測試（不需要實際 FFI）
// 使用 createMockFfiLoader() 模擬

// ✅ 整合測試
// 使用 Xenon 的模擬實現

// ✅ E2E 測試（可選）
// 使用真實的 libsqlite3（可控環境）
```

## 性能考慮

### Xenon 開銷

| 操作 | 開銷 | 註解 |
|------|------|------|
| dlopen | 一次性 | 應用啟動時 |
| 符號驗證 | 一次性 | 符號定義時 |
| 邊界檢查 | 每次呼叫 | 可接受（ns 級別） |
| 記憶體追蹤 | GC 時 | 不影響熱路徑 |

### 最佳化建議

```typescript
// ✅ 好：緩存連接
const conn = await db.createConnection(path)
const results1 = await conn.execute(sql1)
const results2 = await conn.execute(sql2)
await conn.close()

// ❌ 差：重複載入
for (let i = 0; i < 1000; i++) {
  const conn = await db.createConnection(path)
  // ...
  await conn.close()
}
```

## 從 Xenon 到生產 Satellite 的檢查清單

- [ ] 定義型別與介面
- [ ] 實現服務層（使用 Xenon）
- [ ] 建立 Satellite 包裝
- [ ] 編寫單元測試（模擬 FFI）
- [ ] 編寫整合測試
- [ ] 文檔化 API
- [ ] 文檔化安全政策
- [ ] 性能基準測試
- [ ] 安全審查
- [ ] 生產部署檢查

## 相關資源

### 文檔
- `packages/xenon/README.md` - Xenon FFI 基礎
- `satellites/sqlite/README.md` - SQLite Satellite 使用
- `satellites/sqlite/ARCHITECTURE.md` - 詳細設計

### 範例
- `satellites/sqlite/examples/usage.ts` - 5 個使用場景
- `satellites/sqlite/tests/` - 完整測試範例

### 參考
- Bun FFI 文檔
- SQLite C API 參考
- Galaxy Architecture 白皮書

## 常見問題

### Q: 為什麼需要 Xenon？
A: 原始 FFI 容易出現：記憶體洩漏、緩衝區溢位、雙重釋放。Xenon 提供安全層。

### Q: Xenon 有多快？
A: 開銷可忽略（ns 級別），符號驗證在應用啟動時進行，邊界檢查在 FFI 呼叫時進行。

### Q: 可以用於生產嗎？
A: 是的。Xenon 與 SQLite Satellite 都支援生產使用（當實現真實 FFI 呼叫時）。

### Q: 如何處理 C 複雜結構？
A: 在 Xenon 層上增加序列化層，或使用指標 + 邊界檢查。

## 更多信息

查看完整的 Whitepaper：[WHITEPAPER_ZH_TW.md](./WHITEPAPER_ZH_TW.md)
