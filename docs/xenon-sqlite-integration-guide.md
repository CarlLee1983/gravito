# Xenon + SQLite 整合完整指南

## 目錄

1. [快速開始](#快速開始)
2. [完整實現](#完整實現)
3. [常見模式](#常見模式)
4. [測試策略](#測試策略)
5. [故障排除](#故障排除)
6. [效能優化](#效能優化)

---

## 快速開始

### 安裝

```bash
# SQLite Satellite 依賴 Xenon
bun add @gravito/xenon @gravito/satellite-sqlite
```

### 最小範例

```typescript
import { Xenon } from '@gravito/xenon'
import { SatelliteSQLite } from '@gravito/satellite-sqlite'

// 1. 配置安全策略
Xenon.configure({
  allowedPaths: [
    '/usr/lib/libsqlite3.so*',
    '/usr/lib/libsqlite3.dylib',
  ],
})

// 2. 建立衛星
const satellite = SatelliteSQLite.configure({
  libPath: '/usr/lib/libsqlite3.so.0',
})

// 3. 建立應用並掛載
const app = createApp({
  satellites: [satellite],
})

// 4. 在任何地方使用
app.use(async (ctx) => {
  const sqlite = ctx.sqlite
  const conn = await sqlite.createConnection('app.db')
  const rows = await conn.execute('SELECT * FROM users')
  await conn.close()
})
```

---

## 完整實現

### 第 1 步：定義 SQLite 符號

```typescript
// src/ffi/sqlite-symbols.ts

import type { FFISymbols } from '@gravito/xenon'

/**
 * SQLite FFI 符號定義
 * 所有函數簽名均基於 SQLite 官方 C API
 * https://www.sqlite.org/c3ref/intro.html
 */
export const SQLITE_SYMBOLS: FFISymbols = {
  // 數據庫連接管理
  sqlite3_open: {
    args: ['cstring', 'ptr'],  // const char *filename, sqlite3 **ppDb
    returns: 'i32',             // int
    // 打開資料庫連接
  },
  sqlite3_open_v2: {
    args: ['cstring', 'ptr', 'i32', 'cstring'],  // filename, ppDb, flags, zVfs
    returns: 'i32',
    // 打開資料庫（帶標誌）
  },
  sqlite3_close: {
    args: ['ptr'],              // sqlite3 *db
    returns: 'i32',
    // 關閉資料庫連接
  },
  sqlite3_close_v2: {
    args: ['ptr'],
    returns: 'i32',
    // 優雅關閉（允許 stmt 活躍）
  },

  // SQL 執行
  sqlite3_exec: {
    args: ['ptr', 'cstring', 'ptr', 'ptr', 'ptr'],
    returns: 'i32',
    // sqlite3_exec(db, sql, callback, arg, errmsg)
  },
  sqlite3_prepare_v2: {
    args: ['ptr', 'cstring', 'i32', 'ptr', 'ptr'],
    returns: 'i32',
    // sqlite3_prepare_v2(db, sql, nbyte, ppStmt, pzTail)
  },
  sqlite3_finalize: {
    args: ['ptr'],
    returns: 'i32',
    // sqlite3_finalize(pStmt)
  },

  // 語句執行
  sqlite3_step: {
    args: ['ptr'],              // sqlite3_stmt *pStmt
    returns: 'i32',
    // 行（100）、完成（101）或錯誤
  },
  sqlite3_reset: {
    args: ['ptr'],
    returns: 'i32',
  },

  // 列數據檢索
  sqlite3_column_count: {
    args: ['ptr'],
    returns: 'i32',
  },
  sqlite3_column_name: {
    args: ['ptr', 'i32'],       // pStmt, iCol
    returns: 'cstring',
  },
  sqlite3_column_text: {
    args: ['ptr', 'i32'],
    returns: 'cstring',
  },
  sqlite3_column_int: {
    args: ['ptr', 'i32'],
    returns: 'i32',
  },
  sqlite3_column_int64: {
    args: ['ptr', 'i32'],
    returns: 'i64',
  },
  sqlite3_column_double: {
    args: ['ptr', 'i32'],
    returns: 'f64',
  },

  // 參數綁定
  sqlite3_bind_text: {
    args: ['ptr', 'i32', 'cstring', 'i32', 'ptr'],
    returns: 'i32',
    // stmt, idx, value, nbyte, destructor
  },
  sqlite3_bind_int: {
    args: ['ptr', 'i32', 'i32'],
    returns: 'i32',
  },
  sqlite3_bind_int64: {
    args: ['ptr', 'i32', 'i64'],
    returns: 'i32',
  },

  // 錯誤處理
  sqlite3_errmsg: {
    args: ['ptr'],
    returns: 'cstring',
  },
  sqlite3_errcode: {
    args: ['ptr'],
    returns: 'i32',
  },

  // 元數據
  sqlite3_last_insert_rowid: {
    args: ['ptr'],
    returns: 'i64',
  },
  sqlite3_changes: {
    args: ['ptr'],
    returns: 'i32',
  },

  // 版本
  sqlite3_libversion: {
    args: [],
    returns: 'cstring',
  },
}
```

### 第 2 步：建立連接類

```typescript
// src/sqlite/SQLiteConnection.ts

import { Xenon, type LibraryHandle, XenonMemoryError } from '@gravito/xenon'
import type { SQLiteConnection as IConnection } from '../types'

const SQLITE_ROW = 100
const SQLITE_DONE = 101
const SQLITE_OK = 0

/**
 * SQLite 連接包裝器
 */
export class SQLiteConnection implements IConnection {
  private handle: LibraryHandle
  private dbPtr: number | null = null
  private dbPtrBuf: Uint8Array | null = null
  private isClosed = false

  constructor(handle: LibraryHandle, dbPath: string) {
    this.handle = handle

    // 分配存儲返回指針的緩衝區
    this.dbPtrBuf = Xenon.allocBuffer(8, `sqlite_conn_${dbPath}`)

    try {
      const rc = this.handle.call('sqlite3_open', dbPath, this.dbPtrBuf)
      if (rc !== SQLITE_OK) {
        throw new Error(`sqlite3_open failed with code ${rc}`)
      }

      // 讀取返回的指針（按 DataView 讀取）
      const view = new DataView(this.dbPtrBuf)
      this.dbPtr = Number(view.getBigInt64(0, true))  // 小端序
    } catch (e) {
      if (this.dbPtrBuf) {
        Xenon.freeBuffer(this.dbPtrBuf)
      }
      throw e
    }
  }

  /**
   * 執行 SQL 查詢（不返回行）
   */
  async run(sql: string): Promise<void> {
    this.checkOpen()

    const errMsgBuf = Xenon.allocBuffer(256, 'sqlite_errmsg')
    try {
      const rc = this.handle.call(
        'sqlite3_exec',
        this.dbPtr,
        sql,
        0,  // callback (null)
        0,  // arg
        errMsgBuf
      )

      if (rc !== SQLITE_OK) {
        const msg = this.getLastError()
        throw new Error(`SQL execution failed: ${msg}`)
      }
    } finally {
      Xenon.freeBuffer(errMsgBuf)
    }
  }

  /**
   * 執行查詢並返回所有行
   */
  async execute(sql: string): Promise<Record<string, any>[]> {
    this.checkOpen()

    const stmtBuf = Xenon.allocBuffer(8, 'sqlite_stmt')
    const tailBuf = Xenon.allocBuffer(256, 'sqlite_tail')

    try {
      // 準備語句
      const rc1 = this.handle.call(
        'sqlite3_prepare_v2',
        this.dbPtr,
        sql,
        -1,        // nbyte = -1（以 null 結尾）
        stmtBuf,
        tailBuf
      )

      if (rc1 !== SQLITE_OK) {
        throw new Error(`sqlite3_prepare_v2 failed: ${this.getLastError()}`)
      }

      // 讀取語句指針
      const view = new DataView(stmtBuf)
      const stmt = Number(view.getBigInt64(0, true))

      // 執行並收集行
      const rows: Record<string, any>[] = []

      while (true) {
        const rc2 = this.handle.call('sqlite3_step', stmt)

        if (rc2 === SQLITE_DONE) {
          break  // 完成
        } else if (rc2 === SQLITE_ROW) {
          // 讀取行數據
          const colCount = this.handle.call('sqlite3_column_count', stmt)
          const row: Record<string, any> = {}

          for (let i = 0; i < colCount; i++) {
            const name = this.handle.call('sqlite3_column_name', stmt, i)
            const value = this.handle.call('sqlite3_column_text', stmt, i)
            row[name] = value
          }

          rows.push(row)
        } else {
          throw new Error(`sqlite3_step failed: ${this.getLastError()}`)
        }
      }

      // 清理語句
      this.handle.call('sqlite3_finalize', stmt)

      return rows
    } finally {
      Xenon.freeBuffer(stmtBuf)
      Xenon.freeBuffer(tailBuf)
    }
  }

  /**
   * 執行查詢並返回單行
   */
  async getOne(sql: string): Promise<Record<string, any> | null> {
    const rows = await this.execute(sql)
    return rows.length > 0 ? rows[0] : null
  }

  /**
   * 關閉連接
   */
  async close(): Promise<void> {
    if (this.isClosed || this.dbPtr === null) {
      return
    }

    try {
      this.handle.call('sqlite3_close', this.dbPtr)
    } catch (e) {
      console.warn('sqlite3_close error:', e)
    } finally {
      if (this.dbPtrBuf) {
        try {
          Xenon.freeBuffer(this.dbPtrBuf)
        } catch (e) {
          console.warn('Failed to free dbPtr buffer:', e)
        }
        this.dbPtrBuf = null
      }
      this.dbPtr = null
      this.isClosed = true
    }
  }

  /**
   * 檢查連接是否開啟
   */
  isOpen(): boolean {
    return !this.isClosed && this.dbPtr !== null
  }

  /**
   * 獲取最後錯誤信息
   */
  private getLastError(): string {
    if (this.dbPtr === null) return 'Connection closed'
    try {
      return this.handle.call('sqlite3_errmsg', this.dbPtr)
    } catch {
      return 'Unknown error'
    }
  }

  /**
   * 驗證連接狀態
   */
  private checkOpen(): void {
    if (this.isClosed || this.dbPtr === null) {
      throw new Error('Connection is closed')
    }
  }
}
```

### 第 3 步：建立服務類

```typescript
// src/sqlite/SQLiteService.ts

import { Xenon, type LibraryHandle } from '@gravito/xenon'
import { SQLiteConnection } from './SQLiteConnection'
import { SQLITE_SYMBOLS } from '../ffi/sqlite-symbols'
import type { SQLiteServiceConfig } from '../types'

/**
 * SQLite 服務
 * 管理庫載入和連接池
 */
export class SQLiteService {
  private lib: LibraryHandle | null = null
  private connections: Map<string, SQLiteConnection> = new Map()
  private config: SQLiteServiceConfig

  constructor(config: SQLiteServiceConfig) {
    this.config = {
      libPath: config.libPath || this.getSystemSQLitePath(),
      ...config,
    }
  }

  /**
   * 初始化服務（載入庫）
   */
  async initialize(): Promise<void> {
    // 載入 SQLite 庫
    this.lib = Xenon.load('sqlite3', this.config.libPath, SQLITE_SYMBOLS)

    // 驗證版本
    const version = this.lib.call('sqlite3_libversion')
    console.log(`Loaded SQLite ${version}`)
  }

  /**
   * 建立數據庫連接
   */
  async createConnection(dbPath: string): Promise<SQLiteConnection> {
    if (!this.lib) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    // 檢查現有連接
    if (this.connections.has(dbPath)) {
      const existing = this.connections.get(dbPath)!
      if (existing.isOpen()) {
        return existing
      }
    }

    // 建立新連接
    const conn = new SQLiteConnection(this.lib, dbPath)
    this.connections.set(dbPath, conn)

    return conn
  }

  /**
   * 獲取現有連接
   */
  getConnection(dbPath: string): SQLiteConnection | null {
    return this.connections.get(dbPath) || null
  }

  /**
   * 關閉所有連接
   */
  async closeAll(): Promise<void> {
    for (const conn of this.connections.values()) {
      await conn.close()
    }
    this.connections.clear()

    if (this.lib) {
      this.lib.close()
      this.lib = null
    }
  }

  /**
   * 獲取系統 SQLite 庫路徑
   */
  private getSystemSQLitePath(): string {
    const platform = process.platform

    switch (platform) {
      case 'darwin':
        return '/usr/lib/libsqlite3.dylib'
      case 'linux':
        return '/usr/lib/x86_64-linux-gnu/libsqlite3.so.0'
      case 'win32':
        return 'C:\\Windows\\System32\\sqlite3.dll'
      default:
        return 'libsqlite3.so'
    }
  }

  /**
   * 獲取服務配置
   */
  getConfig(): SQLiteServiceConfig {
    return { ...this.config }
  }
}
```

### 第 4 步：衛星整合

```typescript
// src/SatelliteSQLite.ts

import { SQLiteService } from './sqlite/SQLiteService'
import type { SQLiteServiceConfig } from './types'

/**
 * SQLite Satellite for PlanetCore
 */
export class SatelliteSQLite {
  readonly name = 'satellite:sqlite'
  private service: SQLiteService | null = null
  private config: SQLiteServiceConfig

  constructor(config: SQLiteServiceConfig) {
    this.config = config
  }

  /**
   * 工廠方法
   */
  static configure(config: SQLiteServiceConfig): SatelliteSQLite {
    return new SatelliteSQLite(config)
  }

  /**
   * PlanetCore 生命週期：安裝
   */
  async install(ctx: any): Promise<void> {
    this.service = new SQLiteService(this.config)
    await this.service.initialize()

    // 暴露到上下文
    ctx.sqlite = this.service
  }

  /**
   * PlanetCore 生命週期：卸載
   */
  async uninstall(): Promise<void> {
    if (this.service) {
      await this.service.closeAll()
      this.service = null
    }
  }

  /**
   * 獲取服務實例
   */
  getService(): SQLiteService | null {
    return this.service
  }
}
```

---

## 常見模式

### 模式 1：單連接（簡單應用）

```typescript
import { SatelliteSQLite } from '@gravito/satellite-sqlite'

const app = createApp({
  satellites: [
    SatelliteSQLite.configure({
      libPath: '/usr/lib/libsqlite3.so.0',
    }),
  ],
})

app.use(async (ctx) => {
  const sqlite = ctx.sqlite
  const db = await sqlite.createConnection(':memory:')

  try {
    await db.run('CREATE TABLE users (id INTEGER, name TEXT)')
    await db.run("INSERT INTO users VALUES (1, 'Alice')")

    const row = await db.getOne('SELECT * FROM users WHERE id = 1')
    ctx.json({ user: row })
  } finally {
    await db.close()
  }
})
```

### 模式 2：連接池（高並發）

```typescript
// src/sqlite/ConnectionPool.ts

export class SQLiteConnectionPool {
  private pool: Map<string, SQLiteConnection[]> = new Map()
  private config: PoolConfig

  constructor(
    private service: SQLiteService,
    config: PoolConfig
  ) {
    this.config = {
      maxConnections: 10,
      ...config,
    }
  }

  /**
   * 獲取連接（從池中或建立新的）
   */
  async acquire(dbPath: string): Promise<SQLiteConnection> {
    const poolKey = dbPath
    let available = this.pool.get(poolKey) || []

    if (available.length > 0) {
      return available.pop()!
    }

    if (available.length < this.config.maxConnections) {
      return await this.service.createConnection(dbPath)
    }

    // 等待可用連接
    throw new Error('Connection pool exhausted')
  }

  /**
   * 歸還連接到池
   */
  release(dbPath: string, conn: SQLiteConnection): void {
    if (!conn.isOpen()) {
      return
    }

    let available = this.pool.get(dbPath) || []
    if (available.length < this.config.maxConnections) {
      available.push(conn)
      this.pool.set(dbPath, available)
    } else {
      conn.close()
    }
  }

  /**
   * 排水池
   */
  async drain(): Promise<void> {
    for (const [_, conns] of this.pool) {
      for (const conn of conns) {
        await conn.close()
      }
    }
    this.pool.clear()
  }
}

// 使用
app.use(async (ctx) => {
  const sqlite = ctx.sqlite
  const pool = new SQLiteConnectionPool(sqlite, { maxConnections: 10 })

  const db = await pool.acquire(':memory:')
  try {
    const results = await db.execute('SELECT * FROM users')
    ctx.json(results)
  } finally {
    pool.release(':memory:', db)
  }
})
```

### 模式 3：事務管理

```typescript
// 使用助手類

class SQLiteTransaction {
  constructor(private conn: SQLiteConnection) {}

  async begin(): Promise<void> {
    await this.conn.run('BEGIN TRANSACTION')
  }

  async commit(): Promise<void> {
    await this.conn.run('COMMIT')
  }

  async rollback(): Promise<void> {
    await this.conn.run('ROLLBACK')
  }
}

// 使用
app.use(async (ctx) => {
  const sqlite = ctx.sqlite
  const db = await sqlite.createConnection('app.db')
  const tx = new SQLiteTransaction(db)

  try {
    await tx.begin()

    await db.run("INSERT INTO accounts (name, balance) VALUES ('Alice', 100)")
    await db.run("INSERT INTO accounts (name, balance) VALUES ('Bob', 100)")
    await db.run("UPDATE accounts SET balance = balance - 10 WHERE name = 'Alice'")
    await db.run("UPDATE accounts SET balance = balance + 10 WHERE name = 'Bob'")

    await tx.commit()
    ctx.json({ status: 'ok' })
  } catch (e) {
    await tx.rollback()
    throw e
  } finally {
    await db.close()
  }
})
```

### 模式 4：準備語句（參數化查詢）

```typescript
// 擴展 SQLiteConnection

export class SQLiteConnection {
  /**
   * 執行參數化查詢
   */
  async executePrepared(
    sql: string,
    params: Record<string, any>
  ): Promise<Record<string, any>[]> {
    this.checkOpen()

    // 準備語句
    const stmt = this.prepare(sql)

    try {
      // 綁定參數
      let paramIndex = 1
      for (const [_key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          this.handle.call('sqlite3_bind_text', stmt, paramIndex, value, -1, 0)
        } else if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            this.handle.call('sqlite3_bind_int', stmt, paramIndex, value)
          } else {
            // f64
            console.warn('Double binding not implemented')
          }
        }
        paramIndex++
      }

      // 執行
      const rows: Record<string, any>[] = []
      while (this.handle.call('sqlite3_step', stmt) === SQLITE_ROW) {
        const colCount = this.handle.call('sqlite3_column_count', stmt)
        const row: Record<string, any> = {}
        for (let i = 0; i < colCount; i++) {
          const name = this.handle.call('sqlite3_column_name', stmt, i)
          const value = this.handle.call('sqlite3_column_text', stmt, i)
          row[name] = value
        }
        rows.push(row)
      }

      return rows
    } finally {
      this.handle.call('sqlite3_finalize', stmt)
    }
  }

  private prepare(sql: string): number {
    const stmtBuf = Xenon.allocBuffer(8, 'stmt')
    try {
      this.handle.call('sqlite3_prepare_v2', this.dbPtr, sql, -1, stmtBuf, 0)
      const view = new DataView(stmtBuf)
      return Number(view.getBigInt64(0, true))
    } finally {
      Xenon.freeBuffer(stmtBuf)
    }
  }
}

// 使用
app.use(async (ctx) => {
  const sqlite = ctx.sqlite
  const db = await sqlite.createConnection('app.db')

  try {
    const userId = ctx.query.get('id')
    const user = await db.executePrepared(
      'SELECT * FROM users WHERE id = ?',
      { id: userId }
    )
    ctx.json(user[0] || null)
  } finally {
    await db.close()
  }
})
```

---

## 測試策略

### 單元測試：連接

```typescript
import { expect, test, beforeEach, afterEach } from 'bun:test'
import { Xenon } from '@gravito/xenon'
import { SQLiteService } from '../src/sqlite/SQLiteService'

test.group('SQLiteService', () => {
  let service: SQLiteService

  beforeEach(() => {
    Xenon.configure({
      allowedPaths: ['/usr/lib/libsqlite3*'],
    })
    service = new SQLiteService({
      libPath: '/usr/lib/libsqlite3.so.0',
    })
  })

  afterEach(async () => {
    await service.closeAll()
    Xenon.close()
  })

  test('should create in-memory database', async () => {
    await service.initialize()
    const db = await service.createConnection(':memory:')
    expect(db.isOpen()).toBe(true)
    await db.close()
  })

  test('should execute SQL', async () => {
    await service.initialize()
    const db = await service.createConnection(':memory:')

    await db.run('CREATE TABLE test (id INTEGER, name TEXT)')
    await db.run("INSERT INTO test VALUES (1, 'Alice')")

    const rows = await db.execute('SELECT * FROM test')
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Alice')

    await db.close()
  })

  test('should handle errors', async () => {
    await service.initialize()
    const db = await service.createConnection(':memory:')

    expect(async () => {
      await db.execute('INVALID SQL')
    }).toThrow()

    await db.close()
  })
})
```

### 集成測試：事務

```typescript
test('should handle transactions', async () => {
  const db = await service.createConnection(':memory:')
  const tx = new SQLiteTransaction(db)

  try {
    await tx.begin()
    await db.run('CREATE TABLE accounts (name TEXT, balance INTEGER)')
    await db.run("INSERT INTO accounts VALUES ('Alice', 100)")
    await tx.commit()

    const rows = await db.execute('SELECT * FROM accounts')
    expect(rows).toHaveLength(1)
  } finally {
    await db.close()
  }
})

test('should rollback on error', async () => {
  const db = await service.createConnection(':memory:')
  const tx = new SQLiteTransaction(db)

  try {
    await tx.begin()
    await db.run('CREATE TABLE test (id INTEGER)')
    await db.run('INSERT INTO test VALUES (1)')

    // 模擬錯誤
    throw new Error('Simulated error')
  } catch (e) {
    await tx.rollback()
  } finally {
    await db.close()
  }

  // 驗證回滾
  const db2 = await service.createConnection(':memory:')
  const rows = await db2.execute("SELECT name FROM sqlite_master WHERE type='table'")
  expect(rows).toHaveLength(0)  // 表不存在
  await db2.close()
})
```

---

## 故障排除

### 問題 1：「Library path not allowed」

```
XenonSecurityError: Library path not allowed: /usr/lib/libsqlite3.so.0
```

**原因**：路徑被安全策略阻止

**解決**：

```typescript
// 檢查配置
console.log(Xenon.getConfig().allowedPaths)

// 調整配置
Xenon.configure({
  allowedPaths: [
    '/usr/lib/libsqlite3.so*',  // 添加模式
    '/usr/lib/libsqlite3.dylib', // macOS
  ],
})
```

### 問題 2：「undefined: sqlite3_open」

```
XenonLibraryError: Symbol 'sqlite3_open' not found in library 'sqlite3'
```

**原因**：符號定義缺失或名稱錯誤

**解決**：

```typescript
// 檢查符號是否在定義中
if (!SQLITE_SYMBOLS['sqlite3_open']) {
  console.error('Missing sqlite3_open definition')
}

// 驗證拼寫
const symbols = {
  sqlite3_open: { args: ['cstring', 'ptr'], returns: 'i32' },
  // 不是 sqlite_open 或 sqlite3Open
}
```

### 問題 3：「Double-free detected」

```
XenonMemoryError: Double-free detected: 0x1000
```

**原因**：緩衝區釋放多次

**解決**：

```typescript
// ❌ 不好
const buf = Xenon.allocBuffer(256)
Xenon.freeBuffer(buf)
Xenon.freeBuffer(buf)  // ❌ 第二次

// ✅ 好
const buf = Xenon.allocBuffer(256)
try {
  // 使用 buf
} finally {
  Xenon.freeBuffer(buf)  // 只一次
}
```

### 問題 4：「Connection is closed」

```
Error: Connection is closed
```

**原因**：嘗試使用已關閉的連接

**解決**：

```typescript
// ✅ 驗證打開狀態
if (db.isOpen()) {
  const rows = await db.execute(sql)
}

// ✅ 追蹤生命週期
const db = await sqlite.createConnection(':memory:')
try {
  const rows = await db.execute(sql)
  ctx.json(rows)
} finally {
  await db.close()  // 確保關閉
}
```

### 問題 5：「Memory limit exceeded」

```
XenonMemoryError: Memory limit exceeded: 1050 > 1000
```

**原因**：分配超過配置的限制

**解決**：

```typescript
// 增加限制
Xenon.configure({
  maxTotalMemory: 2 * 1024 * 1024 * 1024,  // 2 GB
})

// 或優化使用
const buf1 = Xenon.allocBuffer(256)  // 小緩衝區
// 使用完後釋放
Xenon.freeBuffer(buf1)

const buf2 = Xenon.allocBuffer(256)  // 重用
```

---

## 效能優化

### 優化 1：連接復用

```typescript
// ❌ 低效：每次建立新連接
for (let i = 0; i < 1000; i++) {
  const db = await sqlite.createConnection('app.db')
  await db.execute(sql)
  await db.close()  // 1000 次打開/關閉
}

// ✅ 高效：復用連接
const db = await sqlite.createConnection('app.db')
try {
  for (let i = 0; i < 1000; i++) {
    await db.execute(sql)
  }
} finally {
  await db.close()  // 1 次
}
```

### 優化 2：批量操作

```typescript
// ❌ 低效：逐行執行
for (const user of users) {
  await db.run(
    `INSERT INTO users (name, email) VALUES ('${user.name}', '${user.email}')`
  )
}

// ✅ 高效：事務批處理
const tx = new SQLiteTransaction(db)
await tx.begin()
try {
  for (const user of users) {
    await db.run(
      `INSERT INTO users (name, email) VALUES ('${user.name}', '${user.email}')`
    )
  }
  await tx.commit()
} catch (e) {
  await tx.rollback()
  throw e
}
```

### 優化 3：準備語句重用

```typescript
// ❌ 低效：每次重新準備
for (const id of ids) {
  await db.execute(`SELECT * FROM users WHERE id = ${id}`)
}

// ✅ 高效：參數化
await db.executePrepared(
  'SELECT * FROM users WHERE id = ?',
  { id: userId }
)
// SQLite 緩存準備的語句
```

### 優化 4：適當索引

```typescript
// 在應用啟動時建立索引
async function initializeDatabase(db: SQLiteConnection) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT
    )
  `)

  // 為常用查詢建立索引
  await db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
  await db.run('CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)')
}
```

### 優化 5：監控記憶體

```typescript
setInterval(() => {
  const stats = Xenon.getMemoryStats()
  console.log('Memory stats:', {
    allocated: stats.totalAllocated,
    freed: stats.totalFreed,
    active: stats.activeBuffers,
    peak: stats.peakBuffers,
  })

  // 檢測洩漏
  if (stats.activeBuffers > 100) {
    console.warn('High buffer count, possible leak')
  }
}, 60000)  // 每分鐘
```

---

## 完整應用範例

```typescript
// src/app.ts

import { Xenon } from '@gravito/xenon'
import { SatelliteSQLite } from '@gravito/satellite-sqlite'
import { createApp } from '@gravito/core'
import { SQLiteTransaction } from './sqlite/Transaction'

// 初始化
Xenon.configure({
  allowedPaths: ['/usr/lib/libsqlite3*', '/usr/lib/libsqlite3.dylib'],
  blockedPaths: ['/etc/**', '/sys/**'],
  maxTotalMemory: 512 * 1024 * 1024,
})

const app = createApp({
  name: 'sqlite-demo',
  satellites: [
    SatelliteSQLite.configure({
      libPath: process.platform === 'darwin'
        ? '/usr/lib/libsqlite3.dylib'
        : '/usr/lib/libsqlite3.so.0',
    }),
  ],
})

// 初始化資料庫
app.use(async (ctx) => {
  if (ctx.path === '/init') {
    const sqlite = ctx.sqlite
    const db = await sqlite.createConnection('app.db')

    try {
      await db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      ctx.json({ status: 'initialized' })
    } finally {
      await db.close()
    }
  }
})

// 查詢用戶
app.use(async (ctx) => {
  if (ctx.path === '/users') {
    const sqlite = ctx.sqlite
    const db = await sqlite.createConnection('app.db')

    try {
      const users = await db.execute('SELECT * FROM users')
      ctx.json(users)
    } finally {
      await db.close()
    }
  }
})

// 建立用戶
app.use(async (ctx) => {
  if (ctx.path === '/users' && ctx.method === 'POST') {
    const sqlite = ctx.sqlite
    const db = await sqlite.createConnection('app.db')
    const body = await ctx.body.json()

    try {
      await db.run(
        `INSERT INTO users (name, email) VALUES ('${body.name}', '${body.email}')`
      )
      ctx.json({ status: 'created' })
    } catch (e) {
      ctx.status = 400
      ctx.json({ error: e.message })
    } finally {
      await db.close()
    }
  }
})

// 監控
setInterval(() => {
  const stats = Xenon.getMemoryStats()
  console.log(`[Memory] Active: ${stats.activeBuffers}, Peak: ${stats.peakBuffers}`)
}, 30000)

export default app
```

---

**版本**：1.0.0
**最後更新**：2026-02-24
