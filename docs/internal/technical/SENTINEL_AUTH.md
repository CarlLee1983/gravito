# Sentinel & Fortify: The Security & Auth Orbit

**Version**: 4.0.1 (Sentinel) / 3.1.1 (Fortify)
**Module**: `@gravito/sentinel`, `@gravito/fortify`
**Focus**: Authentication, Authorization, End-to-End Workflows, JWT, Session

---

## 1. 核心概念 (Core Concepts)

Gravito 的安全體系由兩個核心模組組成：
1.  **Sentinel**: 引擎層。提供 Guards (守衛)、Providers (用戶來源) 與 Gates (權限門控)。
2.  **Fortify**: 工作流層。提供完整的業務邏輯實作，如註冊、登入、密碼重置與郵件驗證。

---

## 2. Sentinel 架構 (Engine Layer)

Sentinel 採用了多驅動的守衛架構，支持在同一個應用中混合多種認證模式。

### 2.1 守衛類型 (Guards)
*   **SessionGuard**: 基於 Cookie 的傳統 Session 認證，支持 "Remember Me"。
*   **JwtGuard**: 基於 JWT 的無狀態認證。
*   **JwtRefreshGuard**: 支援 Access Token + Refresh Token 的安全刷新機制。
*   **TokenGuard**: 簡單的 API Token 認證（適用於 Webhook 或微服務間通訊）。

### 2.2 用戶提供者 (User Providers)
*   **DatabaseUserProvider**: 配合 Atlas ORM 從資料庫獲取用戶。
*   **CachedUserProvider**: 透過快取層優化用戶讀取性能。
*   **CallbackUserProvider**: 完全自定義的用戶查詢邏輯。

---

## 3. Fortify 工作流 (Feature Layer)

Fortify 不提供 UI，而是提供預先構建且標準化的「無頭 (Headless)」控制路徑。

### 3.1 支援的功能
*   **認證管理**: 登入、登出、兩步驟驗證 (2FA/OTP)。
*   **帳號維護**: 註冊、個人資料更新、密碼修改。
*   **恢復機制**: 密碼重置郵件發送與重置邏輯。
*   **安全防護**: 暴力破解限制 (`throttleAuth`)。

---

## 4. 權限控管 (Authorization)

基於 **Gates (門控)** 與 **Policies (策略)** 的設計。

```typescript
// 定義門控
auth.gate('update-post', (user, post) => user.id === post.user_id);

// 檢查權限
if (await auth.can('update-post', post)) {
    // 允許執行
}
```

---

## 5. 安全實踐 (Security Practices)

*   **零信任密碼**: 支援 Bcrypt 與 Argon2id 雜湊演算法。
*   **令牌黑名單**: 當 JWT 被撤銷時，自動進入黑名單直至過期。
*   **安全 Cookie**: 預設啟用 `HttpOnly`, `Secure`, `SameSite=Lax` 防止 XSS 與 CSRF。
