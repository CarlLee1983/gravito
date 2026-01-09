---
title: Gravito 核心概念
---

# Gravito 核心概念

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

## 設計哲學：奇點與引力

在 Gravito 的世界觀中，系統被視為一個微型銀河系：

- **單一奇點 (Singularity)**：所有的請求最終都優化為單一的路徑跳轉，消弭框架開銷。
- **核心引力 (Gravity)**：Kernel 僅負責維持系統的運作與協調，而不干涉具體業務。
- **動力模組 (Kinetic Modules)**：基礎設施模組以外掛化方式擴展核心功能，完全解耦。

### 四大核心價值

- **高效能 (Performance)**：基於自研核心 & Bun，實現微秒級的路由轉發。
- **零損耗 (Zero Overhead)**：啟動時解析路由與依賴，避免執行時的過度掃描。
- **微核心 (Micro-kernel)**：核心僅有幾 KB，功能完全按需引入。
- **AI 友善 (AI-First)**：透過嚴格的介面契約與型別推導，讓 Copilot/Cursor 更聰明。

---

## 奇點架構 (Singularity Architecture)

### 1. PlanetCore (微核心)

引力中心。一個極簡、高效的基礎，負責：

- **生命週期管理**：從啟動 (Boot) 到升空 (Liftoff)。
- **Hook 系統**：透過 Filter 與 Action 實現非侵入式擴展。
- **依賴注入**：輕量級的 IoC 容器。

```typescript
import { PlanetCore } from '@gravito/core'

const core = await PlanetCore.boot({
  modules: [Ion, Luminosity], // 僅加載 1.0 穩定模組
})

export default core.liftoff() // 點火升空
```

### 2. 動力模組 (Kinetic Modules)

這些模組以外掛化方式擴展核心功能。為了解耦與效能，核心不包含任何業務邏輯，所有的功能（如資料庫、身份驗證、前端橋接）都由動力模組提供。

> 了解更多：[動力生態系 (Kinetic Ecosystem)](./ecosystem.md)

### 3. Satellites (業務衛星)

這是你的領地。所有 Controller、Service 與業務邏輯都封裝在 Satellites 中，掛載於核心或專屬動力模組之上。

---

## 核心特性

### 內容協商 (Content Negotiation)

Gravito 內建智慧型內容協商，同一個 Controller 能根據請求標頭自動切換回應類型：

```typescript
export class UserController {
  index(ctx: Context) {
    return ctx.view('Users/Index', { users: [] })
    // 如果是 Inertia 請求 -> 回傳 JSON
    // 如果是首頁/爬蟲 -> 回傳 SSR HTML (App Shell)
  }
}
```

### 二進位發佈策略 (Binary-First)

我們推崇「單一執行檔」部署。透過 Bun 的編譯能力，你可以將整個應用（含 Runtime）打包成一個二進位檔案，徹底擺脫正式環境的 `node_modules` 噩夢。

---

---

## 請求生命週期 (Request Lifecycle)

了解請求如何在 Gravito 中流轉，對於掌握框架至關重要：

1. **進入 HTTP 核心**：請求到達 Bun 伺服器，由 `HttpAdapter` (Photon 或 BunNative) 接收。
2. **Context 初始化**：建立 `GravitoContext`，並注入 `core`、`logger`、`config` 等基礎物件。
3. **過濾器 (Filter) 階段**：觸發 `request:before` 等 Hook，可用於修改請求或預處理。
4. **全域中介層 (Middleware)**：執行註冊在核心層級的所有全域中介層。
5. **路由匹配**：`Router` 根據路徑與 HTTP 謂詞匹配對應的控制器方法。
6. **路由中介層**：執行該特定路由自定義的中介層處理。
7. **執行控制器 (Controller)**：邏輯被執行並回傳 Response 物件。
8. **結果過濾**：觸發 `response:before` Hook，允許在回傳前修改內容。
9. **回應發送**：最終結果送回用戶端。

---

## 服務容器 (Service Container)

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

## 服務提供者 (Service Providers)

**服務提供者**是 Gravito 應用程式啟動的中心。所有核心 Orbit 或您的自定義業務邏輯，都是透過服務提供者註冊到系統中的。

一個典型的 Service Provider 包含兩個階段：

1. **`register()`**：**僅用於綁定**。在此階段中，您不應該嘗試使用任何其他服務，因為它們可能尚未被載入。
2. **`boot()`**：在此階段中，所有服務都已註冊完畢，您可以自由地跨模組調用資源。

### 延遲加載 (Deferred Providers)

為了達成極致的「零損耗」，您可以將提供者標記為 `deferred`。除非應用程式真的需要該服務，否則它不會被處理。

```typescript
export class HeavyServiceProvider extends ServiceProvider {
  public deferred = true

  provides() {
    return ['heavy.service']
  }

  register(container: Container) {
    container.singleton('heavy.service', () => new HeavyService())
  }
}
```

---

## 下一步 (Next Steps)

- [佈署指南 (Deployment Guide)](./deployment.md)
- [路由系統 (Routing)](./routing.md)
- [ORM 實踐 (Drizzle)](./orm-usage.md)

---

## 授權 (License)

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
