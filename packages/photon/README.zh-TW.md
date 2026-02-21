# @gravito/photon

> 驅動 Gravito Galaxy 架構的高效能 HTTP 引擎。

[![npm version](https://img.shields.io/npm/v/@gravito/photon.svg)](https://www.npmjs.com/package/@gravito/photon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/photon** 是 Gravito 框架的核心 HTTP 引擎。它提供了 `@gravito/core` 和所有 Orbit 模組所使用的基礎路由、中介軟體和請求/回應處理功能。

## 📊 專案現況

| 指標 | 狀態 | 測試覆蓋率 |
|--------|--------|----------|
| **核心引擎 (Core)** | ✅ 穩定 (Stable) | 99.21% |
| **JWT 模組** | ✅ 型別安全 | 92.86% |
| **二進位 (CBOR)** | ✅ 已優化 | 100% |

> 查看 [完整優化歷史紀錄](./doc/HISTORY_OPTIMIZATIONS.md)。

---

## ✨ 特色

- 🚀 **極速效能**：專為 Bun 運行時打造，實現最大吞吐量。
- 🎯 **型別安全路由**：完整的 TypeScript 支援，智慧型別推論。
- 🔌 **中介軟體系統**：可組合的中介軟體，用於認證、驗證等。
- 📡 **RPC 支援**：為 `@gravito/beam` 提供型別安全的客戶端-伺服器通訊。

## 🚀 快速開始

```typescript
import { Photon } from '@gravito/photon'
const app = new Photon()

app.get('/', (c) => c.text('Hello from Photon!'))
export default app
```

---

## 📚 文件指南 (Documentation)

詳細的使用說明與參考資料：

- [📖 **API 使用指南**](./doc/GUIDE.md) — 路由、Context 與應用程式 API。
- [🔌 **中介軟體 (Middleware)**](./doc/MIDDLEWARE.md) — 內建中介軟體 (HTMX, Binary, Logger) 與自定義。
- [🛡️ **安全與 JWT**](./doc/SECURITY.md) — 認證、Token 處理與安全實踐。
- [🏗️ **架構設計**](./doc/ARCHITECTURE.md) — 內部設計與實作細節。

---

## 🤝 貢獻

歡迎貢獻！請先閱讀主要的 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 📝 授權

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
