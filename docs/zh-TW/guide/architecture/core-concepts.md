---
title: Gravito 核心概念
description: 深入探討銀河架構 (Galaxy Architecture)、PlanetCore 微內核以及 Gravito 框架的清單驅動開發 (MDD) 哲學。
---

# 🌌 Gravito 核心概念

> **"為創造者打造的高效能框架"**

<div class="not-prose my-5 flex flex-wrap items-center gap-2">
  <a href="https://www.npmjs.com/package/@gravito/core" target="_blank" rel="noreferrer">
    <img alt="npm 版本" src="https://img.shields.io/npm/v/@gravito/core.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noreferrer">
    <img alt="授權：MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://bun.sh/" target="_blank" rel="noreferrer">
    <img alt="Bun" src="https://img.shields.io/badge/Bun-1.0+-black.svg" class="h-5" loading="lazy" />
  </a>
</div>

歡迎來到 Gravito Core。這是一個追求極致效能與架構美學的後端框架，旨在讓開發者在 Bun 時代重拾「手工藝」般的開發樂趣。

---

## 🛰️ 設計哲學：銀河架構 (Galaxy Architecture)

在 Gravito 的世界觀中，系統被視為一個微型銀河系：

- **微核心 (PlanetCore)**：內核僅負責維持系統的健康運作與協調，不干涉具體業務邏輯。
- **軌道 (Orbits)**：基礎設施模組（如 Atlas ORM, Signal 事件匯流排）環繞核心，提供系統核心資源。
- **衛星 (Satellites)**：業務邏輯中心，採用 DDD 模式封裝領域邏輯。

### 四大核心價值

- **高性能 (Performance)**：基於 Bun 實現微秒級的路由轉發與低損耗請求處理。
- **MDD (Manifest-Driven)**：透過宣告式清單 (`manifest.json`) 快速組裝系統。
- **微核心 (Micro-kernel)**：核心僅有幾 KB，功能完全按需引入。
- **AI 優先 (AI-First)**：透過嚴格型別與可預測的代碼模式，實現高品質的人機協作開發。

---

## 🏗️ 架構分層

### 1. PlanetCore (微核心)

引力中心。一個極簡、高效的基礎，負責：

- **生命週期管理**：從啟動 (`Boot`) 到最終升空 (`Liftoff`)。
- **Hook 系統**：透過 Filter 與 Action 實現非侵入式擴展。
- **依賴注入**：輕量級、高性能的 IoC 容器。

### 2. 軌道 (Orbits)

這些模組以外掛化方式擴展核心功能。核心不包含任何業務邏輯，所有的基礎服務（如資料庫 `Atlas` 或事件匯流排 `Signal`）都由 Orbits 提供。

### 3. 衛星 (Satellites)

這是你的領地。所有 UseCase、Controller 與領域邏輯都封裝在 Satellites 中。衛星之間彼此解耦，透過事件匯流排進行通訊。

---

## 🌊 請求生命週期 (Request Lifecycle)

了解請求如何在 Gravito 中流轉，對於掌握框架至關重要：

1.  **進入**：請求到達 Bun 伺服器，由 `HttpAdapter` (Photon 或 BunNative) 接收。
2.  **Context 初始化**：建立 `GravitoContext`，並注入 `core`、`logger`、`config` 等基礎物件。
3.  **過濾器 (Filter) 階段**：觸發 `request:before` 等 Hook，可用於請求預處理或修改。
4.  **全域中介層 (Middleware)**：執行註冊在核心層級的所有全域中介層。
5.  **路由匹配**：`Router` 根據路徑與 HTTP 謂詞匹配對應的控制器方法。
6.  **路由中介層**：執行該特定路由自定義的中介層處理。
7.  **執行控制器 (Controller)**：邏輯被執行並回傳 `Response` 物件。
8.  **結果過濾**：觸發 `response:before` Hook，允許在回傳前修改內容。
9.  **發送**：最終結果送回用戶端。

---

## 📥 服務容器 (IoC)

Gravito 內建一個強大且輕量級的 **IoC (Inversion of Control) 容器**。它是管理類別依賴與實現服務注入的中心。

### 綁定 (Binding)

您可以將服務綁定到容器中：

```typescript
// 簡單綁定（每次解析都會建立新實例）
core.container.bind('Analytics', (container) => {
  return new AnalyticsService()
})

// 單例綁定（全應用程式共享同一個實例）
core.container.singleton('Stripe', (container) => {
  return new StripeClient(container.make('config').get('stripe.key'))
})
```

### 解析 (Resolving)

在應用的任何地方取出服務：

```typescript
const analytics = core.container.make<AnalyticsService>('Analytics')
```

---

## 🚀 服務提供者 (Service Providers)

**服務提供者**是 Gravito 應用程式啟動的中心。所有核心 Orbit 或您的自定義業務邏輯，都是透過服務提供者註冊到系統中的。

一個典型的 Service Provider 包含兩個階段：

1.  **`register()`**：**僅用於綁定**。在此階段中，您不應該嘗試使用任何其他服務，因為它們可能尚未被載入。
2.  **`boot()`**：在此階段中，所有服務都已註冊完畢，您可以自由地跨模組調用資源。

---

## 🔗 延伸閱讀

- 🚦 [基礎路由導覽](../basics/routing.md)
- 📦 [Atlas ORM 實踐](../database/orm-usage.md)
- 🚀 [佈署指南](../deployment/deployment.md)
- 📡 [Xenon 並行運行時](./xenon-architecture-deep-dive.md)

---

## 授權 (License)

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
