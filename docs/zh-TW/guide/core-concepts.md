---
title: Gravito 核心概念
---

# Gravito 核心概念

> **"為創造者打造的高效能框架"**

<div class="not-prose my-5 flex flex-wrap items-center gap-2">
  <a href="https://www.npmjs.com/package/gravito-core" target="_blank" rel="noreferrer">
    <img alt="npm 版本" src="https://img.shields.io/npm/v/gravito-core.svg" class="h-5" loading="lazy" />
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
- **動力模組 (Kinetic Modules)**：基礎設施模組以插件化方式擴展核心功能，完全解耦。

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
import { PlanetCore } from 'gravito-core'

const core = await PlanetCore.boot({
  modules: [Ion, Luminosity], // 僅加載 1.0 穩定模組
})

export default core.liftoff() // 點火升空
```

### 2. 動力模組 (1.0 Kinetic Modules)

目前 1.0 版本提供以下穩定動力模組：

- **`@gravito/ion`**：全棧橋接器，實現「後端 MVC，前端 SPA」的極致開發體驗。
- **`@gravito/luminosity`**：智慧型 SmartMap 引擎與 Meta 標籤自動化管理。
- **`@gravito/sentinel`**：提供安全穩固的身份驗證與授權系統。
- **`@gravito/prism`**：極致影像優化的樣板渲染引擎。
- **`@gravito/cosmos`**：企業級國際化解決方案。
- **`@gravito/constellation`**：自動化 Sitemap 與搜尋引擎優化工具。
- **`@gravito/pulse`**：自動化骨架生成與生產力工具。

> **Roadmap (v1.5 預計發佈)**: 
> `資料庫` (@gravito/atlas), `Mail` (@gravito/signal), `Queue` (@gravito/kinetic), `Scheduler` (@gravito/chronon).

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

## 快速開始

### 安裝
```bash
bun add gravito-core
```

### 第一個應用程式
```typescript
import { PlanetCore } from 'gravito-core'

const app = new PlanetCore()

app.router.get('/', (c) => c.text('Hello Singularity!'))

export default app.liftoff()
```

---

## 延伸閱讀

- [與 Laravel 12 的對齊程度](./laravel-12-mvc-parity.md)
- [佈署指南 (Deployment Guide)](./deployment.md)
- [路由系統 (Routing)](./routing.md)
- [ORM 實踐 (Drizzle)](./orm-usage.md)

---

## 授權 (License)

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
