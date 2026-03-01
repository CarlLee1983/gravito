# satellite-admin + satellite-rbac 開發指南

## 🎯 團隊目標

建立完整的後台管理員系統與細粒度權限管理，達成 **~166 個測試，100% 通過**。

## 📍 當前進度

✅ **Phase 1 骨架完成** （14 個檔案）
- satellite-admin：Admin Entity、ValueObjects、Errors、Roles
- satellite-rbac：Role、Permission Entity、ValueObjects、Errors、Roles

⏳ **下一步：Phase 1 測試 + Phase 2 基礎設施**

## 🚀 立即開始的任務

### Priority 1: Phase 1 Domain 層測試（完成度：0%）

**satellite-admin/tests/Domain/**
```
AdminEmail.test.ts          (6 個測試)
Admin.test.ts               (9 個測試)
AuthenticatableAdminRole.test.ts  (3 個測試)
AdminManagerRole.test.ts    (2 個測試)
→ 小計：20 個測試
```

**satellite-rbac/tests/Domain/**
```
PermissionKey.test.ts       (8 個測試)
Permission.test.ts          (6 個測試)
Role.test.ts                (8 個測試)
RoleManagerRole.test.ts     (3 個測試)
AssignmentRole.test.ts      (2 個測試)
→ 小計：27 個測試
```

**驗收標準**：
- [ ] 所有 47 個測試通過
- [ ] 覆蓋率 80%+
- [ ] 零 `as any`

### Priority 2: Phase 2 Infrastructure（並行進行）

這一層可以與 Phase 1 測試並行。團隊成員可以分工：

**Team A - satellite-admin Infrastructure**
1. `Infrastructure/Persistence/AtlasAdminRepository.ts` - Atlas ORM 實作
2. `Infrastructure/Persistence/Migrations/20250201_create_admins_table.ts` - 資料庫遷移
3. `Infrastructure/Auth/SentinelAdminProvider.ts` - Sentinel 整合
4. `Infrastructure/TokenBlacklist/AdminTokenBlacklist.ts` - Token 管理
5. Domain/DCI/Contexts/AdminAuthContext.ts - 認證流程編排
6. Domain/DCI/Contexts/AdminManagementContext.ts - 管理流程編排

**Team B - satellite-rbac Infrastructure**
1. `Infrastructure/Persistence/AtlasRoleRepository.ts` - 角色存儲
2. `Infrastructure/Persistence/AtlasPermissionRepository.ts` - 權限存儲
3. `Infrastructure/Persistence/Migrations/20250201_create_rbac_tables.ts` - 資料庫遷移
4. `Application/Registry/PermissionRegistry.ts` - 動態權限註冊
5. `Infrastructure/Gate/RbacGateSetup.ts` - Sentinel Gate 配置
6. Domain/DCI/Contexts/* - 3 個 Contexts

## 📋 檔案清單與驗收標準

### 已建立的檔案（14 個）
✅ satellites/admin/src/
- Application/Errors/AdminError.ts
- Domain/ValueObjects/AdminEmail.ts
- Domain/Entities/Admin.ts
- Domain/Contracts/IAdminRepository.ts
- Domain/DCI/Roles/AuthenticatableAdminRole.ts
- Domain/DCI/Roles/AdminManagerRole.ts
- index.ts

✅ satellites/rbac/src/
- Application/Errors/RbacError.ts
- Domain/ValueObjects/PermissionKey.ts
- Domain/Entities/Permission.ts
- Domain/Entities/Role.ts
- Domain/Contracts/IRoleRepository.ts
- Domain/Contracts/IPermissionRepository.ts
- Domain/Contracts/IPermissionRegistry.ts
- Domain/DCI/Roles/RoleManagerRole.ts
- Domain/DCI/Roles/AssignmentRole.ts
- index.ts

### 待建立的檔案（~70 個）

**Phase 1.5 測試（47 個）**

**Phase 2 DCI + Infrastructure（~40 個）**
- 2 個 Contexts (admin) + 3 個 Contexts (rbac)
- 2 個 Repository 實作 (admin) + 3 個 (rbac) + Registry
- 2 個 Migrations
- 2 個 Auth 提供商
- Token Blacklist

**Phase 3 Application（~18 個）**
- 8 個 UseCases (admin) + 10 個 (rbac)
- 4 個 DTOs
- 1 個 JWT Strategy

**Phase 4 Interface（~15 個）**
- 2 個 Controllers (admin) + 2 個 (rbac)
- 2 個 Middleware
- 2 個 ServiceProvider (index.ts)

## 🔧 開發流程

### 寫測試優先（TDD）
```bash
# 1. 在 tests/ 中建立 *.test.ts
# 2. 執行測試（失敗）
bun test satellites/admin/tests/Domain/Admin.test.ts

# 3. 實作代碼使測試通過
# 4. 執行完整測試
cd satellites/admin && bun test

# 5. 類型檢查
bun run typecheck
```

### 參考模式
- **錯誤**：`satellites/catalog/src/Application/Errors/CatalogError.ts`
- **Entity**：`satellites/catalog/src/Domain/Entities/Product.ts`
- **DCI Roles**：`satellites/catalog/src/Domain/DCI/Roles/`
- **Repository**：`satellites/membership/src/Infrastructure/Persistence/`
- **Middleware**：`satellites/membership/src/Interface/Http/Middleware/`

### 代碼風格
- 100 字元寬度
- 2 空格縮排
- 單引號
- 無分號
- TypeScript strict 模式
- 零 `as any`（使用 type guard 或泛型）

## 📊 進度追蹤

| Phase | 檔案數 | 測試數 | 狀態 |
|-------|-------|-------|------|
| 1 骨架 | 14 | - | ✅ 完成 |
| 1 測試 | - | 47 | ⏳ 進行中 |
| 2 DCI | ~6 | - | 待開始 |
| 2 基礎 | ~7 | ~45 | 待開始 |
| 3 應用 | ~18 | ~38 | 待開始 |
| 4 介面 | ~15 | ~36 | 待開始 |
| **總計** | **~67** | **166** | 進行中 |

## 🎓 範例：添加第一個測試

### 步驟 1：建立測試檔案
```typescript
// satellites/admin/tests/Domain/AdminEmail.test.ts
import { expect, describe, it } from 'bun:test'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'

describe('AdminEmail', () => {
  it('should create valid email', () => {
    const email = AdminEmail.create('test@example.com')
    expect(email.value).toBe('test@example.com')
  })

  it('should throw on invalid format', () => {
    expect(() => AdminEmail.create('invalid')).toThrow()
  })
})
```

### 步驟 2：執行測試（會失敗）
```bash
cd satellites/admin && bun test tests/Domain/AdminEmail.test.ts
```

### 步驟 3：驗證代碼已建立
檔案 `src/Domain/ValueObjects/AdminEmail.ts` 已存在

### 步驟 4：執行測試（應通過）
```bash
cd satellites/admin && bun test tests/Domain/AdminEmail.test.ts
```

## ✨ 關鍵特性

### 認證流程
```
POST /api/admin/auth/login
→ AdminAuthContext (找 admin, 驗證 password, 記錄 login)
→ JwtAdminAuthStrategy (簽發 access + refresh token)
→ emit admin:authenticated hook
```

### 權限檢查
```
GET /api/admin/v1/catalog/products + requirePermission('products:read')
→ CheckPermission UseCase
→ 查詢 admin_roles → 查詢 role_permissions
→ 支援萬用字元："products:*" 符合 "products:read", "products:create"
→ Super admin 快速通過 (isSuper === true)
```

### 動態權限註冊
```typescript
// 任意 satellite 的 boot() 中
await core.hooks.doAction('rbac:register-permissions', [
  { key: 'products:create', label: '建立商品' },
])
```

## 🔗 相關文件

- 完整實現計畫：`IMPLEMENTATION_PLAN_ADMIN_RBAC.md`
- 專案 CLAUDE.md：`CLAUDE.md`
- 代碼風格：`.biome.json`

## 💬 問題？

檢查以下順序：
1. 參考現有 satellite 的模式（catalog, membership, commerce）
2. 查看 IMPLEMENTATION_PLAN_ADMIN_RBAC.md 中的架構部分
3. 確認遵循 DDD + DCI 模式

祝開發順利！🚀
