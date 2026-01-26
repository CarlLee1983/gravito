# @gravito/echo 優化改進計劃

> Gravito 框架企業級 Webhook 處理模組的優化藍圖

## 摘要

本文件概述 `@gravito/echo` 套件的全面優化計劃，涵蓋架構重構、效能優化、功能擴展、測試強化與文檔完善五大階段。

## 當前狀況分析

### 套件概覽

- **版本**: 3.0.1
- **定位**: 企業級 Webhook 處理模組
- **核心功能**: 安全接收 Webhook、可靠發送 Webhook
- **內建 Provider**: Stripe、GitHub、Generic

### 現有架構

```
src/
├── OrbitEcho.ts              # 核心模組類別 (107 行)
├── types.ts                   # 類型定義 (195 行)
├── index.ts                   # 公開導出 (76 行)
├── providers/
│   ├── GenericProvider.ts     # 通用 Provider (111 行)
│   ├── GitHubProvider.ts      # GitHub Provider (97 行)
│   ├── StripeProvider.ts      # Stripe Provider (119 行)
│   └── index.ts               # Provider 導出
├── receive/
│   ├── WebhookReceiver.ts     # Webhook 接收器 (196 行)
│   ├── SignatureValidator.ts  # 簽章驗證工具 (107 行)
│   └── index.ts               # 接收模組導出
└── send/
    ├── WebhookDispatcher.ts   # Webhook 發送器 (191 行)
    └── index.ts               # 發送模組導出
```

### 優勢

- ✅ 清晰的模組化結構
- ✅ 支援 Provider 擴展機制
- ✅ 實作指數退避重試策略
- ✅ 時序安全的簽章比較
- ✅ 與 Gravito Core 良好整合

### 待改進項目

- ⚠️ Provider 間存在重複代碼（`getHeader` 方法）
- ⚠️ 缺乏 Webhook 事件持久化機制
- ⚠️ 無可觀測性支援（Metrics、Tracing）
- ⚠️ 僅支援三種 Provider
- ⚠️ 缺少批量發送能力
- ⚠️ 測試覆蓋率可進一步提升

## 優化目標

### 量化指標

| 指標 | 當前 | 目標 |
|------|------|------|
| 測試覆蓋率 | ~75% | 90%+ |
| 內建 Provider 數量 | 3 | 8+ |
| 程式碼重複率 | 中等 | 最小化 |

### 質化目標

- [ ] 完整的類型推斷支援
- [ ] 可插拔的持久化層
- [ ] 完善的可觀測性整合
- [ ] 專業級 API 文檔
- [ ] 零破壞性變更的向後相容

## 階段總覽

| 階段 | 重點領域 | 狀態 | 核心交付物 |
|------|---------|------|-----------|
| [Phase 1](./PHASE-1-ARCHITECTURE.md) | 架構優化 | 📋 計劃中 | Provider 基礎類別、共用工具提取 |
| [Phase 2](./PHASE-2-PROVIDERS.md) | Provider 擴展 | 📋 計劃中 | 新增 5+ 常用 Provider |
| [Phase 3](./PHASE-3-FEATURES.md) | 功能增強 | 📋 計劃中 | 持久化、批量處理、DLQ |
| [Phase 4](./PHASE-4-OBSERVABILITY.md) | 可觀測性 | 📋 計劃中 | Metrics、Tracing、Logging |
| [Phase 5](./PHASE-5-TESTING.md) | 測試與文檔 | 📋 計劃中 | 90%+ 覆蓋率、完整 API 文檔 |

## 實施原則

### 1. 向後相容

所有變更必須維持現有 API 的完全相容性。現有使用者無需修改任何程式碼即可升級。

### 2. 漸進式增強

新功能以可選方式提供，不影響核心模組的輕量性。

### 3. 類型優先

所有新增功能必須具備完整的 TypeScript 類型定義。

### 4. 測試驅動

每個新功能必須附帶相應的單元測試和整合測試。

## 快速導航

- [Phase 1: 架構優化](./PHASE-1-ARCHITECTURE.md)
- [Phase 2: Provider 擴展](./PHASE-2-PROVIDERS.md)
- [Phase 3: 功能增強](./PHASE-3-FEATURES.md)
- [Phase 4: 可觀測性](./PHASE-4-OBSERVABILITY.md)
- [Phase 5: 測試與文檔](./PHASE-5-TESTING.md)

---

**建立日期**: 2026-01-26
**最後更新**: 2026-01-26
