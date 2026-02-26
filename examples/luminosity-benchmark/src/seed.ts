import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { faker } from '@faker-js/faker'

const DB_PATH = path.join(process.cwd(), 'db.sqlite')
const TOTAL_RECORDS = 1_000_000

console.log('🌌 Luminosity Benchmark: Initializing Big Bang Sequence...')

// 1. Setup Database
if (fs.existsSync(DB_PATH)) {
  console.log('🗑️  Cleaning up old universe...')
  fs.unlinkSync(DB_PATH)
}

const db = new Database(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')

console.log('🛠️  Creating schema...')
db.exec(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    priority REAL DEFAULT 0.5
  );
  CREATE INDEX idx_products_updated_at ON products(updated_at);
`)

// 2. Seeding Loop
console.log(`🌱 Seeding ${TOTAL_RECORDS.toLocaleString()} records...`)
const insertStmt = db.prepare('INSERT INTO products (slug, updated_at, priority) VALUES (?, ?, ?)')

const startTime = performance.now()

for (let i = 0; i < TOTAL_RECORDS; i++) {
  const slug = `product-${faker.helpers.slugify(faker.commerce.productName())}-${i}`
  const updatedAt = faker.date.recent().toISOString()
  const priority = Math.random().toFixed(1)

  insertStmt.run(slug, updatedAt, priority)

  if ((i + 1) % 100_000 === 0) {
    console.log(
      `   ... ${(((i + 1) / TOTAL_RECORDS) * 100).toFixed(0)}% (${(i + 1).toLocaleString()} stars created)`
    )
  }
}

db.close()

const endTime = performance.now()
const duration = (endTime - startTime) / 1000

console.log(`
✨ Big Bang Complete!`)
console.log(`📦 Database Size: ${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(2)} MB`)
console.log(`⏱️  Time Elapsed: ${duration.toFixed(2)}s`)
console.log(`🚀 Velocity: ${(TOTAL_RECORDS / duration).toFixed(0)} records/sec`)
