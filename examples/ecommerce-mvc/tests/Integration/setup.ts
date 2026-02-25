/**
 * Integration Test Database Setup
 *
 * Shared setup for all integration tests.
 * Configures in-memory SQLite database and creates required tables.
 */

import { DB } from '@gravito/atlas'
import { sql } from '../../src/utils/db'

let testDbInitialized = false
let testDbPath: string

export async function setupTestDatabase() {
  // Configure SQLite for all integration tests
  // Use DB.initialized to check if ANY connection exists
  if (testDbInitialized || DB.initialized) {
    return
  }

  // Use a unique file-based database for testing (helps with debugging)
  // For in-memory, we'd use ':memory:' but file-based is more reliable for testing
  if (!testDbPath) {
    testDbPath = `:memory:`
  }

  DB.addConnection('default', {
    driver: 'sqlite',
    filename: testDbPath,
  })

  testDbInitialized = true
}

export async function createCartTables() {
  // Ensure database is configured before creating tables
  await setupTestDatabase()

  const cartTableSql = `
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `

  const cartItemTableSql = `
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cart_id) REFERENCES carts(id)
    )
  `

  try {
    await DB.raw(cartTableSql)
    await DB.raw(cartItemTableSql)
  } catch (error) {
    throw new Error(
      `Failed to create cart tables: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export async function createProductTables() {
  // Ensure database is configured before creating tables
  await setupTestDatabase()

  await DB.raw(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      image_url TEXT,
      stock INTEGER NOT NULL,
      price INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1
    )
  `)
}

export async function createOrderTables() {
  // Ensure database is configured before creating tables
  await setupTestDatabase()

  await DB.raw(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      tax INTEGER DEFAULT 0,
      shipping INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      shipping_address TEXT,
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await DB.raw(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `)
}

export async function createUserTables() {
  // Ensure database is configured before creating tables
  await setupTestDatabase()

  await DB.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'customer',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export async function cleanupTables(...tableNames: string[]) {
  for (const table of tableNames) {
    try {
      await DB.raw(sql(`DELETE FROM ${table}`))
    } catch (_e) {
      // Table might not exist, ignore
    }
  }
}

export async function cleanupAllTables() {
  await cleanupTables('order_items', 'orders', 'cart_items', 'carts', 'products', 'users')

  // Reset auto-increment counters for SQLite
  // This is necessary because SQLite doesn't reset auto-increment when deleting rows
  try {
    await DB.raw(`DELETE FROM sqlite_sequence`)
  } catch (_e) {
    // Table might not exist, ignore
  }
}
