# 計畫：satellite-admin + satellite-rbac 開發

## 專案概覽

建立兩個獨立的 Gravito Satellite，實現完整的後台管理員系統與細粒度權限控制：
- **satellite-admin**：管理員帳號、JWT 認證、CRUD 管理
- **satellite-rbac**：角色、權限管理，整合至 Sentinel Gate

目標：~159 個測試，100% 通過，零 `as any`，遵循 DDD + DCI 架構模式

## 進度概覽

### ✅ 已完成

**Phase 1: Domain Layer 骨架（~14 個檔案）**
- satellite-admin：AdminError, AdminEmail, Admin Entity, IAdminRepository, 2 個 Roles, index.ts
- satellite-rbac：RbacError, PermissionKey, Permission, Role Entity, 3 個 Contracts, 2 個 Roles, index.ts

## 開發步驟

### Phase 1.5: Domain 層測試 (優先級：高)

測試檔案結構已建立，需完成：

**satellite-admin/tests/Domain/**
```
AdminEmail.test.ts          (6 個測試: valid email, invalid format, duplicate, etc.)
Admin.test.ts               (9 個測試: create, reconstitute, suspend, activate, login, password, etc.)
AuthenticatableAdminRole.test.ts  (3 個測試: isActive, verifyPassword, recordLogin)
AdminManagerRole.test.ts    (2 個測試: canManage, canDelete, canSuspend permissions)
```

**satellite-rbac/tests/Domain/**
```
PermissionKey.test.ts       (8 個測試: create, parse, validate format, wildcards, patterns)
Permission.test.ts          (6 個測試: create, reconstitute, getters)
Role.test.ts                (8 個測試: grant, revoke, sync, hasPermission, update)
RoleManagerRole.test.ts     (3 個測試: canCreate, canUpdate, canDelete)
AssignmentRole.test.ts      (2 個測試: canAssign, canRevoke)
```

**預期結果**：~47 個測試，100% 通過

### Phase 2: DCI Contexts + Infrastructure (優先級：高)

需建立以下檔案：

**satellite-admin/src/Domain/DCI/Contexts/**
```
AdminAuthContext.ts
- findAdminByEmail()
- verifyCredentials()
- recordLogin()
- emitAuthenticatedHook()
```

**satellite-admin/src/Infrastructure/**
```
Persistence/AtlasAdminRepository.ts
Persistence/Migrations/20250201_create_admins_table.ts
Auth/SentinelAdminProvider.ts
TokenBlacklist/AdminTokenBlacklist.ts
```

**satellite-rbac/src/Domain/DCI/Contexts/**
```
RoleManagementContext.ts
PermissionManagementContext.ts
AuthorizationContext.ts
```

**satellite-rbac/src/Infrastructure/**
```
Persistence/AtlasRoleRepository.ts
Persistence/AtlasPermissionRepository.ts
Persistence/Migrations/20250201_create_rbac_tables.ts
Gate/RbacGateSetup.ts
Application/Registry/PermissionRegistry.ts
```

**測試**：~45 個新測試（InMemoryRepository 模擬）

### Phase 3: Application 層 (優先級：中)

**satellite-admin/src/Application/UseCases/**
- LoginAdmin
- RefreshAdminToken
- LogoutAdmin
- ListAdmins
- GetAdmin
- CreateAdmin
- UpdateAdmin
- DeleteAdmin

**satellite-admin/src/Application/DTOs/**
- AdminDTO.ts + AdminMapper
- AdminAuthResponseDTO.ts

**satellite-admin/src/Interface/Http/Strategies/**
- JwtAdminAuthStrategy.ts

**satellite-rbac/src/Application/UseCases/** (10 個)
- ListRoles, GetRole, CreateRole, UpdateRole, DeleteRole
- AssignRoleToAdmin, RevokeRoleFromAdmin
- ListPermissions, SyncRolePermissions, CheckPermission

**測試**：~38 個新測試

### Phase 4: Interface + ServiceProvider (優先級：中)

**satellite-admin/src/Interface/Http/**
```
Middleware/adminAuthMiddleware.ts
Controllers/AdminAuthController.ts
Controllers/AdminController.ts
```

**satellite-admin/src/index.ts**
```
AdminServiceProvider with:
- register()：IoC 綁定
- boot()：路由 + Hooks + Bootstrap super admin
```

**satellite-rbac/src/Interface/Http/**
```
Middleware/requirePermission.ts
Controllers/RoleController.ts
Controllers/PermissionController.ts
```

**satellite-rbac/src/index.ts**
```
RbacServiceProvider with:
- register()：IoC 綁定
- boot()：路由 + Hooks + seed 系統 Permissions + Gate
```

**測試**：~36 個新測試

## 資料庫 Schema

### Admins Table
```sql
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
```

### RBAC Tables
```sql
-- Roles
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NULL
);

-- Permissions
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
CREATE INDEX idx_permissions_group ON permissions(group_name);

-- Role <-> Permission mapping
CREATE TABLE role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Admin <-> Role mapping
CREATE TABLE admin_roles (
  admin_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT NULL,
  PRIMARY KEY (admin_id, role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
CREATE INDEX idx_admin_roles_admin_id ON admin_roles(admin_id);
```

## 開發者 API

### 動態註冊權限
```typescript
// 方式 1: 直接取得 registry
const registry = core.container.make<IPermissionRegistry>('rbac.registry')
await registry.registerMany([
  { key: 'products:create', label: '建立商品' },
])

// 方式 2: 透過 Hook（推薦，安全降級）
await core.hooks.doAction('rbac:register-permissions', [
  { key: 'products:create', label: '建立商品' },
])
```

### 路由保護
```typescript
router.post('/api/admin/v1/catalog/products',
  adminAuthMiddleware(core),
  requirePermission('products:create'),
  (ctx) => controller.store(ctx)
)
```

## Hooks 通訊

### satellite-admin 觸發
- `admin:authenticated`：登入成功
- `admin:created`：管理員建立
- `admin:suspended`：管理員停用
- `admin:deleted`：管理員刪除

### satellite-rbac 觸發
- `rbac:role-assigned`：角色指派
- `rbac:role-revoked`：指派撤銷
- `rbac:permissions-synced`：批次同步完成

### satellite-rbac 監聽
- `admin:deleted`：清除 admin_roles 記錄

## Bootstrap Super Admin

環境變數配置自動建立超級管理員：
```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
ADMIN_NAME=系統管理員
```

## API 路由表

### satellite-admin (9 個)
| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/admin/auth/login` | 登入 |
| POST | `/api/admin/auth/logout` | 登出 |
| POST | `/api/admin/auth/refresh` | 刷新 token |
| GET | `/api/admin/auth/me` | 目前登入者 |
| GET | `/api/admin/v1/admins` | 管理員列表 |
| GET | `/api/admin/v1/admins/:id` | 管理員詳情 |
| POST | `/api/admin/v1/admins` | 建立管理員 |
| PATCH | `/api/admin/v1/admins/:id` | 更新管理員 |
| DELETE | `/api/admin/v1/admins/:id` | 刪除管理員 |

### satellite-rbac (11 個)
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/admin/v1/rbac/roles` | 角色列表 |
| GET | `/api/admin/v1/rbac/roles/:id` | 角色詳情 |
| POST | `/api/admin/v1/rbac/roles` | 建立角色 |
| PATCH | `/api/admin/v1/rbac/roles/:id` | 更新角色 |
| DELETE | `/api/admin/v1/rbac/roles/:id` | 刪除角色 |
| PUT | `/api/admin/v1/rbac/roles/:id/permissions` | 同步角色權限 |
| GET | `/api/admin/v1/rbac/permissions` | 權限列表 |
| POST | `/api/admin/v1/rbac/admins/:adminId/roles` | 指派角色 |
| DELETE | `/api/admin/v1/rbac/admins/:adminId/roles/:roleId` | 撤銷角色 |

## 驗收檢查清單

- [ ] Phase 1 Domain 層：47 個測試通過
- [ ] Phase 2 DCI + Infrastructure：45 個測試通過
- [ ] Phase 3 Application：38 個測試通過
- [ ] Phase 4 Interface：36 個測試通過
- [ ] **總計：166 個測試，100% 通過**
- [ ] TypeScript 嚴格模式：零 `as any`
- [ ] Bootstrap super admin：環境變數自動建立
- [ ] JWT 認證流程：login → access token + refresh token → logout (blacklist)
- [ ] Permission 萬用字元：`products:*` 符合 `products:create`, `products:update:price`
- [ ] Super admin 快速通過：`requirePermission()` 直接返回 true
- [ ] 兩個 satellite 獨立安裝：無互相依賴

## 參考架構

參考檔案位置：
- Error 模式：`satellites/catalog/src/Application/Errors/CatalogError.ts`
- Entity 模式：`satellites/catalog/src/Domain/Entities/Product.ts`
- DCI Roles：`satellites/catalog/src/Domain/DCI/Roles/`
- Repository 模式：`satellites/membership/src/Infrastructure/Persistence/`
- JWT 策略：`satellites/membership/src/Interface/Http/Strategies/JwtAuthStrategy.ts`
- ServiceProvider：`satellites/membership/src/index.ts`

## 下一步

1. **立即開始**：Phase 1 Domain 層測試（~47 個）
2. **並行進行**：Phase 2 Infrastructure（所有層）
3. **階段推進**：Phase 3 Application + Phase 4 Interface

## 團隊協調

- 使用 `bun run typecheck` 驗證型別
- 使用 `bun test` 執行測試
- 使用 `bun run build` 驗證構建
- 在 PR 前執行 `bun run check:fix` 修復 lint
