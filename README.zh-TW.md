# Gravito 星系架構 (Galaxy Architecture)

Gravito 是一個基於 TypeScript 的微核心框架，旨在構建可擴展、模組化的後端系統。
它採用獨特的 **星系架構 (Galaxy Architecture)** —— 靈感來自天體力學，用於管理生命週期、擴充模組 (Orbits) 和輕量級插件 (Satellites)。

## 🌟 核心特色

- **微核心 (PlanetCore)**: 極輕量、高效能的核心 (自研核心)，僅負責生命週期和 Hook 系統。
- **軌道 (Orbits)**: 功能豐富的擴充模組 (如資料庫、驗證、儲存)，完全解耦地圍繞核心運行。
- **衛星 (Satellites)**: 輕量級的業務邏輯插件，可掛載於核心或軌道之上。
- **高效能**: 針對 Bun 執行環境優化，提供極快的啟動速度與請求處理能力。
- **開發體驗**: 強烈關注 TypeScript 支援、智能預設值與標準化。

## 🚀 快速開始

### 安裝

```bash
bun add gravito-core
```

### 基本用法

```typescript
import { PlanetCore } from 'gravito-core';

const core = new PlanetCore();

// 加入一個簡單的 Hook
core.hooks.addAction('app:ready', () => {
  console.log('我們升空了！ 🚀');
});

// 啟動伺服器
core.liftoff();
```

## 📚 文件資源

詳細文件請見 [docs](./docs) 目錄。

- [核心概念與用法](./docs/zh-TW/guide/core-concepts.md)
- [插件開發指南](./docs/zh-TW/guide/plugin-development.md)
- [English Documentation](./README.md)

## 📦 生態系 (Orbits)

Gravito 提供了豐富的官方 Orbit 模組，所有模組皆為可插拔設計 (Pluggable)：

| 套件 | 對應名稱 | 功能描述 | 狀態 |
|---|---|---|---|
| `gravito-core` | **PlanetCore** | 極輕量微內核，提供 Hook 與生命週期管理。 | ✅ Stable |
| `@gravito/orbit-db` | **Orbit** | 基於 Drizzle ORM 的資料庫層，提供遷移與種子系統。 | ✅ Stable |
| `@gravito/sentinel` | **Sentinel** | 現代化身份驗證軌道 (JWT/Session)。 | ✅ Alpha |
| `@gravito/nebula` | **Nebula** | 檔案儲存與 CDN 整合 (Local/S3/R2)。 | ✅ Beta |
| `@gravito/stasis` | **Stasis** | 多層快取系統 (Memory/Redis)。 | ✅ Stable |
| `@gravito/prism` | **Prism** | 視圖引擎，整合圖像優化與模板渲染 (Edge)。 | ✅ Stable |
| `@gravito/luminosity` | **Luminosity** | 企業級 SEO 引擎 (Sitemaps/Meta/Robots)。 | ✅ Stable |
| `@gravito/flare` | **Flare** | 多管道通知與郵件佇列系統 (SMTP/Resend)。 | ✅ Alpha |
| `@gravito/ion` | **Ion** | Inertia.js 協議適配器，連結 React/Vue 前端。 | ✅ Stable |
| `@gravito/constellation` | **Constellation** | 基於 Radix Tree 的高效路由系統。 | ✅ Stable |

## 🤝 貢獻

歡迎貢獻！請先閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📄 授權

MIT © Carl Lee
