/**
 * Database Seeders
 *
 * Seed the database with sample data for development.
 */

import { DB } from '@gravito/atlas'

export async function runSeeders(): Promise<void> {
  // Check if already seeded
  const result = await DB.raw<{ count: number }>('SELECT COUNT(*) as count FROM categories')
  if (result.rows[0] && result.rows[0].count > 0) {
    console.log('📦 Database already seeded, skipping...')
    return
  }

  console.log('🌱 Seeding database...')

  // ─────────────────────────────────────────────────────────────
  // Seed Users
  // ─────────────────────────────────────────────────────────────
  const adminPassword = await Bun.password.hash('admin123', { algorithm: 'bcrypt' })
  const userPassword = await Bun.password.hash('password123', { algorithm: 'bcrypt' })

  await DB.raw(
    `
    INSERT INTO users (name, email, password, role) VALUES
    ('Admin', 'admin@example.com', ?, 'admin'),
    ('Customer', 'user@example.com', ?, 'customer')
  `,
    [adminPassword, userPassword]
  )

  // ─────────────────────────────────────────────────────────────
  // Seed Categories
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES
    ('Electronics', 'electronics', '電子產品與配件', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=600&auto=format&fit=crop', 1),
    ('Clothing', 'clothing', '時尚服飾', 'https://images.unsplash.com/photo-1445205170230-053b830c6050?q=80&w=600&auto=format&fit=crop', 2),
    ('Home & Living', 'home-living', '居家與生活用品', 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?q=80&w=600&auto=format&fit=crop', 3),
    ('Books', 'books', '書籍與文具', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=600&auto=format&fit=crop', 4),
    ('Sports', 'sports', '運動與戶外', 'https://images.unsplash.com/photo-1461896736644-8b89339a26e1?q=80&w=600&auto=format&fit=crop', 5)
  `)

  // ─────────────────────────────────────────────────────────────
  // Seed Products
  // ─────────────────────────────────────────────────────────────
  await DB.raw(`
    INSERT INTO products (category_id, name, slug, description, price, compare_at_price, stock, image_url, is_featured) VALUES
    (1, 'Wireless Headphones', 'wireless-headphones', '高品質無線藍牙耳機，支援降噪功能', 299900, 399900, 50, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop', 1),
    (1, 'Smart Watch', 'smart-watch', '智慧手錶，健康追蹤與通知功能', 599900, NULL, 30, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop', 1),
    (1, 'USB-C Hub', 'usb-c-hub', '多功能 USB-C 擴充座，7合1設計', 129900, 149900, 100, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop', 0),
    (1, 'Mechanical Keyboard', 'mechanical-keyboard', 'RGB 機械鍵盤，Cherry MX 軸體', 349900, NULL, 25, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop', 1),
    (2, 'Cotton T-Shirt', 'cotton-tshirt', '100% 純棉舒適T恤', 59900, NULL, 200, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop', 0),
    (2, 'Denim Jeans', 'denim-jeans', '經典牛仔褲，修身版型', 159900, 199900, 80, 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop', 1),
    (2, 'Winter Jacket', 'winter-jacket', '保暖防風外套，適合冬季穿著', 289900, 359900, 40, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop', 1),
    (3, 'Minimalist Desk Lamp', 'desk-lamp', '極簡設計檯燈，三段亮度調節', 89900, NULL, 60, 'https://images.unsplash.com/photo-1534073828943-f801091bb18c?q=80&w=800&auto=format&fit=crop', 0),
    (3, 'Ceramic Mug Set', 'ceramic-mug-set', '手工陶瓷馬克杯套組 (4入)', 79900, 99900, 45, 'https://images.unsplash.com/photo-1514228742587-6b1558fbed20?q=80&w=800&auto=format&fit=crop', 0),
    (3, 'Memory Foam Pillow', 'memory-foam-pillow', '記憶棉枕頭，人體工學設計', 149900, NULL, 70, 'https://images.unsplash.com/photo-1595191830227-a008b64aa4ca?q=80&w=800&auto=format&fit=crop', 1),
    (4, 'Programming Guide', 'programming-guide', 'TypeScript 程式設計完全指南', 75000, NULL, 100, 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?q=80&w=800&auto=format&fit=crop', 0),
    (4, 'Notebook Set', 'notebook-set', '精裝筆記本套組 (3本入)', 45000, NULL, 150, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=800&auto=format&fit=crop', 0),
    (5, 'Yoga Mat', 'yoga-mat', '加厚瑜珈墊，防滑材質', 89900, NULL, 90, 'https://images.unsplash.com/photo-1601925260318-72f009334346?q=80&w=800&auto=format&fit=crop', 0),
    (5, 'Running Shoes', 'running-shoes', '輕量跑鞋，透氣網布設計', 249900, 299900, 35, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop', 1),
    (5, 'Water Bottle', 'water-bottle', '不鏽鋼保溫瓶 750ml', 49900, NULL, 120, 'https://images.unsplash.com/photo-1602143301015-ced19029a26b?q=80&w=800&auto=format&fit=crop', 0)
  `)

  console.log('✅ Database seeded successfully')
  console.log('   Admin: admin@example.com / admin123')
}
