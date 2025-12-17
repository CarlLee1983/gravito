# Gravito 核心概念

> **"為工匠打造的高效能框架。"**
> The High-Performance Framework for Artisans.

[![npm version](https://img.shields.io/npm/v/gravito-core.svg)](https://www.npmjs.com/package/gravito-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

歡迎來到 Gravito Core！🚀 本指南將介紹框架的基本概念與架構。

---

## 🎯 產品定位

### 關鍵差異

| 對比 | Gravito 優勢 |
|------|--------------|
| **Laravel** | 基於 Bun + Hono，毫秒級啟動速度，保有優雅開發體驗 |
| **Next.js** | 二進位優先 (Binary-First) 策略，單一執行檔部署，脫離 `node_modules` 地獄 |
| **Express/Koa** | 強制 MVC 分層結構，避免後端邏輯散亂 |

---

## 📚 技術棧 (Tech Stack)

```
┌─────────────────────────────────────────────────────────────┐
│                      TypeScript (Strict)                     │
│                    AI 友善的型別提示與嚴格模式                │
├─────────────────────────────────────────────────────────────┤
│  Inertia.js              │            Vite                  │
│  (Frontend Bridge)       │       (Build Tool)               │
│  後端 MVC，SPA 體驗       │    React/Vue 熱更新 (HMR)        │
├──────────────────────────┴──────────────────────────────────┤
│                         Hono                                 │
│              世界最快的 JavaScript Web 框架                    │
│            (Router + Request Parser)                         │
├─────────────────────────────────────────────────────────────┤
│                          Bun                                 │
│           超高速 JavaScript Runtime + Bundler                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌌 銀河架構 (Galaxy Architecture)

Gravito 遵循一套受天文力學啟發的獨特設計模式：

### 1. PlanetCore (微核心)

引力中心。一個極簡、高效的基礎，負責：

- 生命週期管理 (Liftoff)
- Hook 系統 (Filters & Actions)
- 錯誤處理
- Config 與 Logger 管理

它**完全不知道**資料庫、驗證或業務邏輯的存在。

```typescript
const core = await PlanetCore.boot({
  orbits: [OrbitDB, OrbitAuth, OrbitInertia], // 按需掛載插件
})

export default core.liftoff() // 啟動伺服器
```

### 2. Orbits (基礎設施模組)

圍繞核心運行的標準擴充模組：

- `@gravito/orbit-db`: 資料庫整合 (Drizzle ORM)
- `@gravito/orbit-auth`: 身分驗證 (JWT/Session)
- `@gravito/orbit-storage`: 檔案儲存
- `@gravito/orbit-cache`: 快取機制
- `@gravito/orbit-inertia`: Inertia.js 整合

### 3. Satellites (業務邏輯衛星)

這是**你的**程式碼所在之處。小巧、專注的模組 (例如 `Users`, `Products`, `Payment`)，掛載於 Orbits 之上。

---

## ⚡ 核心引擎特性

### A. 微核心設計 (Micro-Kernel)

- **零依賴核心**: 僅處理 I/O 和插件編排
- **啟動時解析 (Boot-time Resolution)**: 路由與依賴在啟動時編譯，確保 Runtime 是 Read-only 且極快

### B. 智慧 Context (Smart Context)

#### `c.view(template, props)` - 核心黑魔法

**內容協商**: 自動偵測請求來源

| 請求類型 | 回應內容 | 使用場景 |
|---------|----------|----------|
| **Inertia Request** | JSON | React/Vue 前端接管路由 |
| **HTML Request** | Server-Side Rendered HTML (App Shell) | 爬蟲、首次頁面載入 |

### C. 插件系統 (Plugin System)

- **可選用 (Opt-in)**: 預設沒有 DB 或 Auth，只加你需要的
- **基於介面**: 透過 Hono Middleware 機制封裝

---

## 🚀 快速開始

### 1. 專案結構

Gravito 推崇扁平、潔淨的結構：

```
src/
  controllers/
  models/
  views/
  index.ts
```

### 2. 初始化 (IoC)

Gravito v0.3+ 引入了 **IoC (控制反轉)** 透過 `PlanetCore.boot()` 簡化整合：

```typescript
// index.ts
import { PlanetCore } from 'gravito-core'
import { OrbitInertia } from '@gravito/orbit-inertia'
import { OrbitView } from '@gravito/orbit-view'

// 初始化核心與 Orbits
const core = await PlanetCore.boot({
  orbits: [
      OrbitInertia,
      OrbitView
  ],
  config: {
      app: { name: 'My Gravito App' }
  }
});

// 註冊路由
core.router.group(root => {
  root.get('/', ctx => ctx.text('你好，銀河！'));
});

// 發射升空 🚀
export default core.liftoff();
```

### 3. 真實範例 (Real World Example)

請查看 `examples/` 目錄下的 [Gravito 官方網站範例](https://github.com/CarlLee1983/gravito-core/tree/main/examples/official-site)，展示了：
- **Inertia.js + React** 前端整合
- **i18n** 國際化多語系
- **Tailwind CSS v4** 整合
- **Markdown 文檔引擎**

---

## 📖 API 參考

### `PlanetCore`

| 方法/屬性 | 描述 |
|-----------|------|
| `boot(options)` | 靜態方法，使用 IoC 初始化系統 |
| `liftoff(port?)` | 回傳 `Bun.serve` 所需的 config 物件 |
| `router` | 存取 Gravito Router |
| `hooks` | 存取 HookManager |
| `logger` | 存取 Logger 實例 |

---

## 📝 License

MIT © [Carl Lee](https://github.com/CarlLee1983)
