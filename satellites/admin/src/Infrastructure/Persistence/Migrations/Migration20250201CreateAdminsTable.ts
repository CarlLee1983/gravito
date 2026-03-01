/**
 * 建立 admins 表格
 * Migration 類型：Atlas @gravito/atlas
 */
export const migration20250201CreateAdminsTable = {
  name: '20250201_create_admins_table',
  version: 1,

  /**
   * UP：建立表格
   */
  async up(db: any): Promise<void> {
    // 實際實作應使用 @gravito/atlas 的 schema builder
    // await db.schema.createTable('admins', (table) => {
    //   table.string('id').primary()
    //   table.string('email').unique().notNullable()
    //   table.string('name').notNullable()
    //   table.string('password_hash').notNullable()
    //   table.enum('status', ['active', 'suspended', 'inactive']).defaultTo('active')
    //   table.boolean('is_super').defaultTo(false)
    //   table.datetime('last_login_at').nullable()
    //   table.string('password_reset_token').nullable()
    //   table.datetime('password_reset_expires_at').nullable()
    //   table.string('created_by').nullable()
    //   table.datetime('created_at').defaultTo(db.fn.now())
    //   table.datetime('updated_at').nullable()
    //   table.json('metadata').nullable()
    //   table.index(['email'])
    //   table.index(['status'])
    // })
  },

  /**
   * DOWN：刪除表格
   */
  async down(db: any): Promise<void> {
    // await db.schema.dropTable('admins')
  },
}

/**
 * SQL 定義（供參考）
 */
export const adminsMigrationSQL = `
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_super INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT NULL,
  password_reset_token TEXT NULL,
  password_reset_expires_at TEXT NULL,
  created_by TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NULL,
  metadata TEXT NULL
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_status ON admins(status);
`
