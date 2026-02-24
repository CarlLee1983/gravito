# @gravito/satellite-sqlite 架構

## 概述

SatelliteSQLite 展示了如何使用 `@gravito/xenon` 安全 FFI 層建立一個實際的 Satellite，演示了：

1. **安全第一**：路徑驗證、符號檢查、記憶體管理
2. **Satellite 架構**：PlanetCore 整合、生命週期管理
3. **業務邏輯**：資料庫連接、查詢執行

## 層級架構

```
┌─────────────────────────────────────────┐
│     應用層（Gravito 應用）              │
│  使用 ctx.sqlite 進行資料庫操作         │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     SatelliteSQLite                      │
│  - PlanetCore 生命週期整合              │
│  - 依賴注入（DI）                       │
│  - 服務暴露                             │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     SQLiteService                        │
│  - 連接管理                              │
│  - 路徑驗證（白名單/黑名單）            │
│  - 配置管理                              │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     Xenon FFI 層                         │
│  - 安全 dlopen()                         │
│  - 符號驗證（no callbacks）             │
│  - 邊界檢查                              │
│  - 記憶體追蹤 + GC 協作                 │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     原生 libsqlite3                      │
│  - sqlite3_open()                        │
│  - sqlite3_exec()                        │
│  - sqlite3_step()                        │
│  - sqlite3_close()                       │
└─────────────────────────────────────────┘
```

## 安全層次

### 1. 路徑驗證（SQLiteService）

```typescript
allowedPaths: ['/app/data/**']    // 白名單
blockedPaths: ['/etc/**']         // 黑名單
```

### 2. FFI 符號驗證（Xenon）

```typescript
// 僅允許這些符號
{
  sqlite3_open: { args: ['cstring', 'ptr'], returns: 'i32' },
  sqlite3_exec: { args: ['ptr', 'cstring'], returns: 'i32' },
  sqlite3_close: { args: ['ptr'], returns: 'i32' },
}

// 禁止 callback 類型（危險）
```

### 3. 邊界檢查（Xenon）

```typescript
// checkBounds() 防止：
- 整數溢位
- 緩衝區越界
- 無效指標
```

### 4. 記憶體管理（Xenon）

```typescript
// MemoryTracker 確保：
- owned 緩衝區自動追蹤
- double-free 檢測
- GC 協作洩漏警告
```

## 生命週期

### 初始化

```
new SatelliteSQLite()
    ↓
Xenon.configure()   // 安全政策
    ↓
新 SQLiteService
    ↓
安裝至 PlanetCore context
```

### 操作

```
ctx.sqlite.createConnection()
    ↓
驗證路徑
    ↓
Xenon.load() → libsqlite3
    ↓
返回 SQLiteConnection 介面
```

### 清理

```
conn.close()       // 關閉連接
    ↓
sqlite.closeAll()  // 釋放所有資源
    ↓
uninstall()        // 移除 Satellite
```

## 設計模式

### 1. Adapter 模式

SQLiteConnection 介面隱藏 FFI 複雜性：

```typescript
interface SQLiteConnection {
  execute(sql, params)  // 簡潔的 API
  run(sql, params)
  getOne(sql, params)
  close()
}
```

### 2. Service 模式

SQLiteService 管理連接生命週期：

```typescript
class SQLiteService {
  createConnection()   // 工廠方法
  closeAll()          // 統一清理
}
```

### 3. Policy 模式

安全政策（路徑驗證）可配置：

```typescript
xenonConfig: {
  allowedPaths: [...],
  blockedPaths: [...]
}
```

## 安全設計

### 威脅模型

| 威脅 | 防護機制 |
|------|---------|
| 任意檔案存取 | 路徑白名單/黑名單 |
| 危險的 FFI 符號 | Xenon 符號驗證 |
| 緩衝區溢位 | Xenon 邊界檢查 |
| 記憶體洩漏 | Xenon MemoryTracker |
| Double-free | Xenon owned/borrowed 模型 |

### 防禦深度

```
應用層驗證
    ↓
SQLiteService 路徑檢查
    ↓
Xenon 安全政策
    ↓
Xenon FFI 驗證
    ↓
作業系統保護
```

## 與 Xenon 的整合

### 用途

- **LibraryLoader**：安全加載 libsqlite3
- **TypeGuard**：驗證 sqlite3 符號定義
- **BoundsChecker**：檢查 SQL 參數邊界
- **MemoryTracker**：追蹤 SQLite 分配的記憶體

### 範例

```typescript
// SQLiteService 使用 Xenon
const sqlite3 = Xenon.load('sqlite3', {
  path: '/usr/lib/libsqlite3.dylib',
  symbols: {
    sqlite3_open: { args: ['cstring', 'ptr'], returns: 'i32' },
    sqlite3_exec: { args: ['ptr', 'cstring'], returns: 'i32' },
  },
})

// 自動獲得安全保障
// ✅ 路徑驗證
// ✅ 符號驗證（無 callback）
// ✅ 邊界檢查
// ✅ 記憶體追蹤
```

## 未來擴展

1. **實現真實 FFI**：用真實 sqlite3 呼叫替換模擬
2. **連接池**：高效連接管理
3. **查詢快取**：效能優化
4. **事務支援**：ACID 操作
5. **遷移工具**：資料庫 schema 管理
6. **監控**：查詢統計、效能分析

## 相關資源

- `@gravito/xenon` - 安全 FFI 基礎
- `@gravito/core` - PlanetCore 框架
- SQLite 官方文檔 - C API 參考
