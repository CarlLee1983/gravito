# Fortify 模組優化計劃

> @gravito/fortify - Gravito 框架端到端認證工作流

## 概述

本計劃旨在對 `@gravito/fortify` 模組進行全面優化，提升測試覆蓋、強化安全性、改進架構設計、擴展功能。

## 當前版本分析

| 項目 | 狀態 |
|------|------|
| 版本 | 3.0.3 |
| 核心功能 | 認證工作流（登入/註冊/密碼重設/郵件驗證） |
| 架構 | Orbit + Controllers + Middleware |
| 測試覆蓋 | 80%+ (核心組件)、100% (控制器與服務) |
| 源碼規模 | 24 檔案、2,900+ 行 |

## 現況總結

### 已完成功能 (優化中)
- ✅ 用戶註冊流程 (已整合密碼強度校驗)
- ✅ 登入/登出管理 (已整合登入速率限制)
- ✅ 密碼重設 (已整合速率限制與強度校驗)
- ✅ 電子郵件驗證 (已整合重發頻率限制)
- ✅ 安全服務：`RateLimiter` (滑動視窗)、`StrengthValidator` (規則式)
- ✅ 測試強化：控制器與服務達到 100% 覆蓋

### 待改進項目
- ⚠️ 帳戶鎖定機制 (需資料庫遷移與邏輯整合)
- ⚠️ 安全標頭中介軟體 (CSP, HSTS 等)
- ⚠️ 認證事件日誌記錄 (AuthLogger)
- ⚠️ 雙因素認證 (2FA)
- ⚠️ OAuth/社交登入支援

## 優化目標

1. **測試強化** - 達成 80%+ 覆蓋率，補齊邊界案例
2. **安全強化** - 速率限制、帳戶鎖定、安全標頭
3. **架構改進** - 控制器抽象、錯誤處理統一
4. **功能擴展** - 雙因素認證、OAuth 整合

## 計劃文檔

| 文檔 | 描述 | 優先級 |
|------|------|--------|
| [01-testing.md](./01-testing.md) | 測試強化計劃 | P0 |
| [02-security.md](./02-security.md) | 安全強化計劃 | P0 |
| [03-architecture.md](./03-architecture.md) | 架構改進計劃 | P1 |
| [04-feature.md](./04-feature.md) | 功能擴展計劃 | P2 |

## 實施時程

```
Phase 1 (測試強化)     █████████░  ← 優化中 (90%)
Phase 2 (安全強化)     █████░░░░░  ← 進行中 (50%)
Phase 3 (架構改進)     ░░░░░░░░░░  ← 待開始
Phase 4 (功能擴展)     ░░░░░░░░░░  ← 待開始
```

## 最近進度

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
