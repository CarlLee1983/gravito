# Fortify 模組優化計劃

> @gravito/fortify - Gravito 框架端到端認證工作流

## 概述

本計劃旨在對 `@gravito/fortify` 模組進行全面優化，提升測試覆蓋、強化安全性、改進架構設計、擴展功能。

## 當前版本分析

| 項目 | 狀態 |
|------|------|
| 版本 | 3.1.0 |
| 核心功能 | 認證工作流（登入/註冊/密碼重設/郵件驗證/API Token/2FA/OAuth/Magic Link） |
| 架構 | Orbit + Controllers + Middleware |
| 測試覆蓋 | 95%+ (核心組件)、100% (控制器與服務) |
| 源碼規模 | 35 檔案、4,500+ 行 |

## 現況總結

### 已完成功能 (穩定版)
- ✅ 用戶註冊流程 (含密碼強度校驗與郵件驗證)
- ✅ 登入/登出管理 (含速率限制與帳戶鎖定)
- ✅ 密碼重設流程 (含安全校驗)
- ✅ 安全服務：`RateLimiter` (滑動視窗)、`StrengthValidator` (規則式)
- ✅ 帳戶鎖定機制 (整合至 `LoginController` 與 `RateLimiter`)
- ✅ 安全標頭中介軟體 (`SecurityHeaders` - CSP, HSTS, XSS 等)
- ✅ 認證事件日誌記錄 (`AuthLogger` - 支援記憶體與資料庫)
- ✅ 雙因素認證 (2FA - 基於 TOTP 與 恢復碼)
- ✅ API 權限令牌 (Sanctum-style `PersonalAccessTokenService`)
- ✅ OAuth/社交登入支援 (Google, GitHub 預設支援)
- ✅ 魔術連結登入 (Magic Link Login)
- ✅ 測試強化：全模組平均測試覆蓋率達 95%+，控制器與服務 100% 覆蓋

### 待改進項目
- ⚠️ WebAuthn / Passkeys 支援 (計劃中)
- ⚠️ 更多 OAuth 提供者 (Discord, Facebook 等)
- ⚠️ 認證視圖模版優化 (Inertia 整合改進)

## 優化目標

1. **穩定性強化** - 確保在高併發環境下的速率限制準確性
2. **開發者體驗** - 簡化 OAuth 與 2FA 的配置流程
3. **前端整合** - 提供更豐富的 Inertia (React/Vue) 模版範例
4. **生物識別** - 引入 Passkeys 支援，邁向無密碼認證

## 計劃文檔

| 文檔 | 描述 | 優先級 | 狀態 |
|------|------|--------|------|
| [01-testing.md](./01-testing.md) | 測試強化計劃 | P0 | ✅ 已完成 |
| [02-security.md](./02-security.md) | 安全強化計劃 | P0 | ✅ 已完成 |
| [03-architecture.md](./03-architecture.md) | 架構改進計劃 | P1 | ✅ 已完成 |
| [04-feature.md](./04-feature.md) | 功能擴展計劃 | P2 | ✅ 已完成 |

## 實施時程

```
Phase 1 (測試強化)     ██████████  ← 已完成 (100%)
Phase 2 (安全強化)     ██████████  ← 已完成 (100%)
Phase 3 (架構改進)     ██████████  ← 已完成 (100%)
Phase 4 (功能擴展)     ██████████  ← 已完成 (100%)
```

## 最近進度

### 2026-01-25 (Phase 3 & 4)
- **架構優化**:
  - `BaseController`: 抽象化控制器基礎邏輯，統一錯誤處理。
  - `FortifyOrbit`: 改進服務註冊機制，支援延遲加載。
- **功能擴展**:
  - `TwoFactorService`: 實作 TOTP 與恢復碼管理。
  - `OAuthService`: 實作多供應者 OAuth 認證流程。
  - `MagicLinkService`: 實作基於令牌的魔術連結認證。
  - `PersonalAccessTokenService`: 實作長效 API 令牌管理。
- **安全強化**:
  - `SecurityHeaders`: 實作可配置的安全標頭中介軟體。
  - `AccountLockout`: 整合登入失敗計數與自動鎖定邏輯。
- **文檔與註釋**:
  - 全面更新 JSDoc，提升 IDE 開發體驗。
  - 更新版本號至 3.1.0。

### 2026-01-24 (Phase 2)
- **安全服務實作**:
  - `RateLimiter`: 實作基於記憶體的滑動視窗速率限制服務。
  - `StrengthValidator`: 實作可配置的密碼強度校驗服務。
- **控制器整合**:
  - `LoginController`: 整合登入速率限制。
  - `RegisterController`: 整合密碼強度校驗。
  - `ForgotPasswordController`: 整合請求頻率限制。
  - `ResetPasswordController`: 整合密碼強度校驗。
  - `VerifyEmailController`: 整合郵件重發頻率限制。
- **測試覆蓋**: 核心控制器與安全服務達到 100% 測試覆蓋率。

## 依賴關係

```
@gravito/core     ─────┐
@gravito/sentinel ─────┼───► @gravito/fortify
@gravito/photon   ─────┤
@gravito/signal   ─────┘ (可選)
```

## 相關連結

- [CHANGELOG.md](../../CHANGELOG.md)
- [README.md](../../README.md)
