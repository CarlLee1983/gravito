/**
 * Database Migrations
 *
 * SQLite schema setup for the e-commerce application.
 * Run via DatabaseProvider on application bootstrap.
 */

import { DB } from '@gravito/atlas'

export async function runMigrations(): Promise<void> {
  // ─────────────────────────────────────────────────────────────
  // Users Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Categories Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Products Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price INTEGER NOT NULL,
      compare_at_price INTEGER,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Carts Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Cart Items Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Orders Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_number TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
      subtotal INTEGER NOT NULL,
      tax INTEGER DEFAULT 0,
      shipping INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      shipping_address TEXT,
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Order Items Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Indexes for Performance
  // ─────────────────────────────────────────────────────────────
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)')

  console.log('✅ Database migrations completed')
}
