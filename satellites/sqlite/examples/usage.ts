/**
 * SQLite Satellite 使用範例
 * 展示如何在 Gravito 應用中整合 SQLite 資料庫
 */

import { SatelliteSQLite } from '../src'

/**
 * 範例 1：基本設定與使用
 */
export async function basicExample() {
  // 配置 SQLite Satellite，指定資料庫路徑
  const sqliteSatellite = SatelliteSQLite.configure({
    dbPath: '/app/data/main.db',
    // 可選：指定 libsqlite3 路徑
    libPath: '/usr/lib/libsqlite3.dylib',
  })

  // 模擬 PlanetCore context
  const ctx = {}

  // 安裝 Satellite（會初始化 SQLite 服務）
  await sqliteSatellite.install(ctx)

  // 從 context 取得 SQLite 服務
  const sqlite = (ctx as any).sqlite

  // 建立資料庫連接
  const conn = await sqlite.createConnection('/app/data/users.db')

  // 執行查詢
  const users = await conn.execute('SELECT * FROM users LIMIT 10')
  console.log('Users:', users)

  // 插入資料
  await conn.run('INSERT INTO users (name, email) VALUES (?, ?)', ['Alice', 'alice@example.com'])

  // 取得單筆結果
  const alice = await conn.getOne('SELECT * FROM users WHERE name = ?', ['Alice'])
  console.log('Found user:', alice)

  // 關閉連接
  await conn.close()

  // 卸載 Satellite（清理資源）
  await sqliteSatellite.uninstall()
}

/**
 * 範例 2：安全路徑政策
 */
export async function securityExample() {
  // 配置嚴格的安全政策
  const sqliteSatellite = SatelliteSQLite.configure({
    dbPath: '/app/data/secure.db',
    xenonConfig: {
      // 白名單：只允許特定目錄的資料庫
      allowedPaths: [
        '/app/data/**', // 應用資料目錄
        '/var/lib/gravito/**', // Gravito 系統目錄
      ],
      // 黑名單：明確禁止存取系統目錄
      blockedPaths: [
        '/etc/**', // 系統設定
        '/sys/**', // 系統檔案
        '/root/**', // Root 主目錄
      ],
    },
  })

  const ctx = {}
  await sqliteSatellite.install(ctx)

  // ✅ 允許存取
  const allowedConn = await (ctx as any).sqlite.createConnection('/app/data/allowed.db')

  // ❌ 拒絕存取（會拋出錯誤）
  try {
    await (ctx as any).sqlite.createConnection('/etc/shadow.db')
  } catch (e) {
    console.log('Security check prevented access:', (e as Error).message)
  }

  await allowedConn.close()
  await sqliteSatellite.uninstall()
}

/**
 * 範例 3：自訂 context key
 */
export async function customContextExample() {
  // 使用自訂的 context 鍵名
  const sqliteSatellite = SatelliteSQLite.configure({
    dbPath: '/app/data/custom.db',
    exposeAs: 'db', // 使用 'db' 而不是預設的 'sqlite'
  })

  const ctx = {}
  await sqliteSatellite.install(ctx)

  // 從自訂鍵名存取服務
  const db = (ctx as any).db
  console.log('Service exposed as "db":', db !== undefined)

  await sqliteSatellite.uninstall()
}

/**
 * 範例 4：多個資料庫連接
 */
export async function multiDatabaseExample() {
  const sqliteSatellite = SatelliteSQLite.configure({
    dbPath: '/app/data/main.db',
  })

  const ctx = {}
  await sqliteSatellite.install(ctx)
  const sqlite = (ctx as any).sqlite

  // 開啟多個連接
  const primaryConn = await sqlite.createConnection('/app/data/primary.db')
  const replicaConn = await sqlite.createConnection('/app/data/replica.db')
  const cacheConn = await sqlite.createConnection('/app/data/cache.db')

  // 在不同連接上執行操作
  const primaryData = await primaryConn.execute('SELECT * FROM products')
  const _replicaData = await replicaConn.execute('SELECT * FROM products')

  // 在快取資料庫中寫入結果
  await cacheConn.run('INSERT INTO cache_results VALUES (?)', [JSON.stringify(primaryData)])

  // 關閉所有連接
  await primaryConn.close()
  await replicaConn.close()
  await cacheConn.close()

  await sqliteSatellite.uninstall()
}

/**
 * 範例 5：PlanetCore 完整整合
 */
export async function planetCoreIntegrationExample() {
  // 這是在實際 Gravito 應用中的使用方式

  // 在應用啟動時註冊 Satellite
  // const app = new Gravito()
  // app.addSatellite(
  //   SatelliteSQLite.configure({
  //     dbPath: '/app/data/production.db',
  //     xenonConfig: {
  //       allowedPaths: ['/app/data/**'],
  //     },
  //   })
  // )
  // await app.start()

  // 在路由處理器中使用
  // async function getUserHandler(ctx) {
  //   const sqlite = ctx.sqlite  // 由 Satellite 注入
  //   const conn = await sqlite.createConnection('/app/data/users.db')
  //   const user = await conn.getOne('SELECT * FROM users WHERE id = ?', [ctx.params.id])
  //   await conn.close()
  //   return { success: true, data: user }
  // }

  console.log('See code comments for PlanetCore integration pattern')
}

// 運行所有範例
if (import.meta.main) {
  console.log('=== Example 1: Basic Usage ===')
  await basicExample()

  console.log('\n=== Example 2: Security Policy ===')
  await securityExample()

  console.log('\n=== Example 3: Custom Context Key ===')
  await customContextExample()

  console.log('\n=== Example 4: Multiple Databases ===')
  await multiDatabaseExample()

  console.log('\n=== Example 5: PlanetCore Integration ===')
  planetCoreIntegrationExample()

  console.log('\n✅ All examples completed!')
}
