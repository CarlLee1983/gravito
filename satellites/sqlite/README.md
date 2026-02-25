# @gravito/satellite-sqlite

SQLite FFI 綁定 - 透過 Xenon 安全存取原生 SQLite 資料庫

## 特性

- **安全 FFI 綁定**：使用 Xenon 進行型別安全、邊界檢查的原生函式庫存取
- **路徑驗證**：白名單/黑名單政策防止未授權資料庫存取
- **PlanetCore 整合**：作為 Satellite 無縫整合至 Galaxy Architecture
- **連接管理**：自動生命週期管理和資源清理

## 安裝

```bash
bun add @gravito/satellite-sqlite
```

## 使用方式

### 基本設定

```typescript
import { SatelliteSQLite } from '@gravito/satellite-sqlite'

// 創建 Satellite
const sqliteSatellite = SatelliteSQLite.configure({
  dbPath: '/app/data/main.db',
  libPath: '/usr/lib/libsqlite3.dylib', // 可選
})

// 安裝至 PlanetCore
await core.addSatellite(sqliteSatellite)
```

### 使用 SQLite 服務

```typescript
// 從 context 取得服務
const sqlite = ctx.sqlite

// 建立連接
const conn = await sqlite.createConnection('/app/data/users.db')

// 執行查詢
const users = await conn.execute('SELECT * FROM users')

// 取得單筆結果
const user = await conn.getOne('SELECT * FROM users WHERE id = ?', [1])

// 執行不返回結果的語句
await conn.run('INSERT INTO users (name) VALUES (?)', ['John'])

// 關閉連接
await conn.close()
```

## 安全特性

### 路徑驗證

```typescript
SatelliteSQLite.configure({
  dbPath: '/app/data/main.db',
  xenonConfig: {
    allowedPaths: [
      '/app/data/**',           // 允許 /app/data 下所有檔案
      '/var/lib/gravito/**',    // 允許 /var/lib/gravito 下所有檔案
    ],
    blockedPaths: [
      '/etc/**',                // 禁止存取 /etc
      '/sys/**',                // 禁止存取 /sys
    ],
  },
})
```

### Xenon 整合

該 Satellite 使用 Xenon 的安全機制：

- **符號驗證**：確保只呼叫安全的 SQLite API
- **邊界檢查**：防止緩衝區溢位
- **記憶體追蹤**：自動檢測記憶體洩漏
- **Double-free 防護**：防止double-free 錯誤

## 架構

```
SatelliteSQLite (PlanetCore 整合)
    └── SQLiteService
            └── Xenon (安全 FFI 層)
                    ├── LibSQLite3
                    ├── 路徑驗證
                    └── 記憶體管理
```

## 生命週期

```typescript
// 1. 配置
const satellite = SatelliteSQLite.configure({ dbPath: '...' })

// 2. 安裝（PlanetCore bootstrap 階段）
await core.addSatellite(satellite)

// 3. 使用
const service = ctx.sqlite
await service.createConnection('...')

// 4. 卸載（PlanetCore shutdown 階段）
// 自動觸發 - 關閉所有連接並釋放資源
```

## 限制

- 當前實現為模擬版本（便於測試）
- 生產環境實現會使用真實 FFI 呼叫
- 需要系統安裝 libsqlite3

## 相關包

- `@gravito/xenon` - 安全 FFI 封裝
- `@gravito/core` - PlanetCore 框架
- `@gravito/orbit-*` - 其他 Orbit 整合

## 許可證

MIT
