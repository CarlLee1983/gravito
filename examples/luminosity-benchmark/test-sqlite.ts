import { Database as BunDatabase } from 'bun:sqlite'
import path from 'node:path'
import BetterSqlite3 from 'better-sqlite3'

const DB_PATH = path.join(process.cwd(), 'db.sqlite')

function testBunSqlite() {
  console.log('Testing bun:sqlite...')
  const db = new BunDatabase(DB_PATH, { readonly: true })
  const stmt = db.prepare('SELECT id, slug, updated_at, priority FROM products')
  const start = performance.now()
  let count = 0
  for (const _row of stmt.all()) {
    count++
  }
  const duration = performance.now() - start
  console.log(`bun:sqlite (.all()): ${count} rows in ${duration.toFixed(2)}ms`)

  const start2 = performance.now()
  count = 0
  const stmt2 = db.query('SELECT id, slug, updated_at, priority FROM products')
  for (const _row of stmt2) {
    count++
  }
  const duration2 = performance.now() - start2
  console.log(`bun:sqlite (iterator): ${count} rows in ${duration2.toFixed(2)}ms`)

  db.close()
}

function testBetterSqlite3() {
  console.log('\nTesting better-sqlite3...')
  const db = new BetterSqlite3(DB_PATH, { readonly: true })
  const stmt = db.prepare('SELECT id, slug, updated_at, priority FROM products')
  const start = performance.now()
  let count = 0
  for (const _row of stmt.all()) {
    count++
  }
  const duration = performance.now() - start
  console.log(`better-sqlite3 (.all()): ${count} rows in ${duration.toFixed(2)}ms`)

  const start2 = performance.now()
  count = 0
  const stmt2 = db.prepare('SELECT id, slug, updated_at, priority FROM products')
  for (const _row of stmt2.iterate()) {
    count++
  }
  const duration2 = performance.now() - start2
  console.log(`better-sqlite3 (iterator): ${count} rows in ${duration2.toFixed(2)}ms`)

  db.close()
}

testBunSqlite()
testBetterSqlite3()
