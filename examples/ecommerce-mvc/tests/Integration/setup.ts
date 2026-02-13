/**
 * Integration Test Database Setup
 *
 * Shared setup for all integration tests.
 * Configures in-memory SQLite database and creates required tables.
 */

import { DB } from '@gravito/atlas'

let dbConfigured = false

export async function setupTestDatabase() {
  // Configure in-memory SQLite for all integration tests
  // Only configure once per test run
  if (dbConfigured) {
    return
  }

  if (!DB.initialized) {
    DB.addConnection('default', {
      driver: 'sqlite',
      filename: ':memory:',
    })
  }

  dbConfigured = true
}

export async function createCartTables() {
  // Ensure database is configured before creating tables
  await setupTestDatabase()

  await DB.raw(`
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await DB.raw(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cart_id) REFERENCES carts(id)
    )
  `)
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
      await DB.raw(`DELETE FROM ${table}`)
    } catch (_e) {
      // Table might not exist, ignore
    }
  }
}

export async function cleanupAllTables() {
  await cleanupTables('order_items', 'orders', 'cart_items', 'carts', 'products', 'users')
}
