/**
 * 建立 RBAC 相關表格
 * 包括：roles, permissions, role_permissions, admin_roles
 */
export const migration20250201CreateRbacTables = {
  name: '20250201_create_rbac_tables',
  version: 1,

  /**
   * UP：建立所有表格
   */
  async up(_db: any): Promise<void> {
    // 實際實作應使用 @gravito/atlas 的 schema builder
    // 1. Create roles table
    // 2. Create permissions table
    // 3. Create role_permissions table
    // 4. Create admin_roles table
  },

  /**
   * DOWN：刪除所有表格
   */
  async down(_db: any): Promise<void> {
    // 刪除順序：admin_roles -> role_permissions -> roles -> permissions
  },
}

/**
 * SQL 定義（供參考）
 */
export const rbacMigrationSQL = `
-- Roles 表
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NULL
);

-- Permissions 表
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  group_name TEXT NOT NULL,
  action TEXT NOT NULL,
  field TEXT NULL,
  label TEXT NOT NULL,
  description TEXT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Role 與 Permission 的多對多關聯
CREATE TABLE role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Admin 與 Role 的多對多關聯
CREATE TABLE admin_roles (
  admin_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT NULL,
  PRIMARY KEY (admin_id, role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_permissions_group ON permissions(group_name);
CREATE INDEX idx_admin_roles_admin_id ON admin_roles(admin_id);
`
