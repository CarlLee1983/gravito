/**
 * Database Migrations
 *
 * Schema setup for the e-commerce application.
 * Supports SQLite and PostgreSQL via dialect detection.
 * Run via DatabaseProvider on application bootstrap.
 */

import { DB } from '@gravito/atlas'

export async function runMigrations(): Promise<void> {
  const isPostgres = process.env.DB_CONNECTION === 'postgres'

  // Dialect-specific types
  const PK = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'
  const TIMESTAMP = isPostgres
    ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    : 'TEXT DEFAULT CURRENT_TIMESTAMP'
  const BOOL_TYPE = isPostgres ? 'BOOLEAN' : 'INTEGER'
  const TRUE_DEFAULT = isPostgres ? 'DEFAULT TRUE' : 'DEFAULT 1'
  const FALSE_DEFAULT = isPostgres ? 'DEFAULT FALSE' : 'DEFAULT 0'

  // ─────────────────────────────────────────────────────────────
  // Users Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id ${PK},
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
      is_active ${BOOL_TYPE} ${TRUE_DEFAULT},
      created_at ${TIMESTAMP},
      updated_at ${TIMESTAMP}
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Categories Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS categories (
      id ${PK},
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      is_active ${BOOL_TYPE} ${TRUE_DEFAULT},
      sort_order INTEGER DEFAULT 0,
      created_at ${TIMESTAMP}
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Products Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS products (
      id ${PK},
      category_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price INTEGER NOT NULL,
      compare_at_price INTEGER,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      is_active ${BOOL_TYPE} ${TRUE_DEFAULT},
      is_featured ${BOOL_TYPE} ${FALSE_DEFAULT},
      created_at ${TIMESTAMP},
      updated_at ${TIMESTAMP},
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Carts Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS carts (
      id ${PK},
      user_id INTEGER,
      session_id TEXT,
      created_at ${TIMESTAMP},
      updated_at ${TIMESTAMP},
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Cart Items Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id ${PK},
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      created_at ${TIMESTAMP},
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Orders Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS orders (
      id ${PK},
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
      created_at ${TIMESTAMP},
      updated_at ${TIMESTAMP},
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Order Items Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS order_items (
      id ${PK},
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
  // Wishlists Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id ${PK},
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at ${TIMESTAMP},
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)

  // ─────────────────────────────────────────────────────────────
  // Addresses Table
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS addresses (
      id ${PK},
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      street TEXT NOT NULL,
      zip_code TEXT,
      is_default ${BOOL_TYPE} ${FALSE_DEFAULT},
      created_at ${TIMESTAMP},
      updated_at ${TIMESTAMP},
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_wishlists_product ON wishlists(product_id)')
  await DB.raw('CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id)')

  console.log('✅ Database migrations completed')
}
