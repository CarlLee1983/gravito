---
title: Sentinel Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Sentinel Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/sentinel` 的內部架構、多重 Guard 系統設計以及與核心安全機制的整合。

---

## 1. 核心哲學：Multi-Guard Security

Sentinel 受到 Laravel Auth 的啟發，旨在提供一個靈活、可擴展的身份驗證系統。
- **Guard Pattern**：將「如何驗證」封裝在 Guard 中，支援多種並存的驗證方式 (Session, JWT, Token)。
- **Provider Pattern**：將「如何獲取用戶」封裝在 UserProvider 中，解耦驗證邏輯與資料來源。
- **Policy/Gate**：提供細粒度的授權控制，支援基於角色的存取控制 (RBAC) 與基於屬性的存取控制 (ABAC)。

---

## 2. 模組組件分析

### 2.1 AuthManager (Facade)
- **職責**：管理所有的 Guards 與 UserProviders。
- **位置**：`src/AuthManager.ts`
- **機制**：
  - `guard(name)`: 懶加載並緩存 Guard 實例。
  - `createUserProvider(name)`: 根據配置創建 Provider (e.g., `CallbackUserProvider`, `CachedUserProvider`)。
  - **Dynamic Resolution**：支援透過 `auth.extend()` 註冊自定義 Guard，實現高度擴展性。

### 2.2 Guards (Authentication Strategies)
- **職責**：執行具體的驗證邏輯。
- **位置**：`src/guards/`
- **內建 Guards**：
  - `SessionGuard`: 基於 Session ID 與 `OrbitPulsar` 整合，支援 "Remember Me" (長期 Cookie)。
  - `JwtGuard`: 驗證 `Authorization: Bearer` 標頭中的 JWT，支援 `HS256`/`RS256`。
  - `TokenGuard`: 驗證 API Token (如 Personal Access Token)，支援 SHA-256 雜湊存儲。

### 2.3 User Providers (Data Source)
- **職責**：從資料庫或其他來源獲取用戶實體。
- **位置**：`src/providers/`
- **核心實作**：
  - `CallbackUserProvider`: 最通用的 Provider，透過回調函數 (`retrieveById`, `retrieveByCredentials`) 橋接任意 ORM (Atlas, Prisma, TypeORM)。
  - `CachedUserProvider`: 包裝其他 Provider，利用 Redis 快取用戶資料，減少資料庫查詢。

### 2.4 Gate & Policy (Authorization)
- **職責**：判斷已驗證的用戶是否有權執行特定操作。
- **位置**：`src/Gate.ts`
- **機制**：
  - `define(ability, callback)`: 定義全域規則。
  - `allows(ability, ...args)`: 檢查權限。
  - **Auto-Discovery** (Future): 未來將支援自動掃描 Policy 類別並綁定到 Model。

---

## 3. 技術規格與設計決策

### 3.1 Remember Me 機制
SessionGuard 實作了安全的 Remember Me 功能：
- **Token 生成**：`randomUUID() + randomUUID()` 生成高熵 Token。
- **Cookie 安全**：`HttpOnly`, `Secure` (Production), `Path=/`。
- **驗證流程**：
  1. 檢查 Session 是否存在。
  2. 若無，檢查 Remember Cookie。
  3. 若 Cookie 有效，自動登入並重建 Session (Session Fixation Protection)。

### 3.2 Token Hashing
`TokenGuard` 支援將 API Token 進行雜湊後存儲。
- **優點**：即使資料庫洩漏，攻擊者也無法還原原始 Token (類似密碼)。
- **代價**：無法在資料庫中明文顯示 Token，驗證時需對輸入進行雜湊比對。

### 3.3 密碼重設 (Password Broker)
Sentinel 內建了完整的密碼重設流程 (`PasswordBroker`)。
- **Repository**：負責存儲重設 Token (支援 Redis 或 Database)。
- **Token 生命週期**：預設 60 分鐘過期。
- **整合**：與 `OrbitMail` (未來) 整合發送重設郵件。

---

## 4. 潛在風險與效能評估

### 4.1 JWT 吊銷 (Revocation)
標準 JWT 是無狀態的，一旦發出在過期前皆有效。
- **風險**：若用戶權限被移除或帳號被盜，無法立即失效。
- **解法**：Sentinel 引入了 `JwtRefreshGuard` 與 `TokenBlacklist` (Redis-based)，允許將特定 JWT 加入黑名單 (JTI Claim)，實現即時吊銷。

### 4.2 暴力破解 (Brute Force)
`throttleAuth` 中間件提供了登入頻率限制。
- **機制**：基於 IP + Username 進行計數 (Rate Limiting)。
- **配置**：預設 5 次失敗後鎖定 1 分鐘。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **OIDC / OAuth2 Support**：整合 Social Login (Google, GitHub)，提供統一的 `SocialUserProvider`。
2. **Multi-Tenancy**：增強 Guard 以支援多租戶架構 (自動過濾 Tenant ID)。

### 中期 (v1.2)
1. **RBAC Middleware**：提供 `role:admin` 與 `permission:edit-post` 中間件，簡化路由權限控制。

### 長期 (v2.0)
1. **FIDO2 / WebAuthn**：原生支援 Passkeys 無密碼登入。

---
*Created by Gravito Architect.*
