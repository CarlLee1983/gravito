# 包功能速查表

> **用途**：所有 66 個核心包和 15 個 satellite 的功能對照表
> **何時查閱**：需要了解某個包的職責或尋找合適的包時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## 依賴層次概覽

```
Foundation Layer (基礎層)
├── @gravito/core          ← 微核心（所有包的基礎）
├── @gravito/photon        ← HTTP 引擎
├── @gravito/atlas         ← ORM
└── @gravito/signal        ← 事件總線

Advanced Layer (進階層)
├── @gravito/stream        ← 流處理
├── @gravito/astral        ← 高級特性
├── @gravito/enterprise    ← 企業架構
└── @gravito/monolith      ← 整合層

Infrastructure & Data (基礎設施與資料)
├── @gravito/plasma        ← Redis 客戶端
├── @gravito/dark-matter   ← MongoDB 客戶端
├── @gravito/nebula        ← 存儲
├── @gravito/stasis        ← 快取層
└── @gravito/mass          ← 批次處理

Satellites (業務領域)
├── @gravito/satellite-*   ← 業務外掛（15 個）
└── ...
```

---

## Foundation Layer（基礎層）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/core** | 微核心：IoC 容器、Hooks、生命週期管理、應用啟動 | 無 | 所有包的依賴基礎 |
| **@gravito/photon** | HTTP 引擎，基於 Hono 的 web 框架集成 | core | 構建 HTTP 伺服器時 |
| **@gravito/atlas** | ORM + 資料庫遷移，支持 MySQL、PostgreSQL、SQLite | core | 需要資料庫訪問時 |
| **@gravito/signal** | 事件總線，跨包通訊和訂閱-發佈 | core | 實現 Satellite 間通訊時 |

---

## Advanced Layer（進階層）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/stream** | 流處理和異步隊列（BullMQ）整合 | core, signal | 需要后台任務或消息隊列時 |
| **@gravito/astral** | Schema 驅動的 OpenAPI 生成和 Swagger UI | core | 自動生成 API 文檔時 |
| **@gravito/enterprise** | 企業架構模式（DDD、Clean Architecture） | core | 構建複雜業務邏輯時 |
| **@gravito/monolith** | 整合層，連接多個模組 | core, photon, atlas, signal | 集成多個包的應用時 |

---

## Security & Authentication（安全與認證）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/fortify** | 端到端認證流程（登錄、註冊、密碼重置、郵件驗證） | core, atlas, signal, flare | 需要完整認證系統時 |
| **@gravito/sentinel** | 安全驗證和授權 | core | 實現訪問控制時 |

---

## Storage & Cache（存儲與快取）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/plasma** | Redis 客戶端，Laravel 風格 API | core | 需要 Redis 時 |
| **@gravito/dark-matter** | MongoDB 客戶端，Laravel 風格 API | core | 需要 MongoDB 時 |
| **@gravito/nebula** | 標準存儲模組 | core, atlas | 文件和 blob 存儲時 |
| **@gravito/nebula-s3** | S3 存儲適配器（v2.0.0，Bun 原生 API） | nebula | 使用 AWS S3、Cloudflare R2、MinIO 時 |
| **@gravito/stasis** | 快取層（支持 Redis、in-memory） | core | 需要快取策略時 |

---

## Communication & Notifications（通訊與通知）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/flare** | 輕量級通知系統（郵件、資料庫、廣播、Slack、SMS） | core, signal | 發送多渠道通知時 |
| **@gravito/echo** | 企業級 webhook 處理（接收和發送） | core | 需要 webhook 時 |
| **@gravito/ripple** | 即時事件系統（WebSocket） | core, signal | 需要實時通訊時 |
| **@gravito/ripple-client** | 前端 WebSocket 客戶端（React、Vue） | 無（前端） | 前端實時連接時 |

---

## Processing & Workflows（處理和工作流）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/flux** | 平台無關的工作流引擎 | core, signal | 需要工作流編排時 |
| **@gravito/forge** | 文件處理（視頻和圖像處理，實時狀態追蹤） | core | 需要多媒體處理時 |
| **@gravito/mass** | TypeBox 驗證（高性能 schema 驗證） | core | 需要數據驗證時 |
| **@gravito/horizon** | 任務排程和定時器 | core, stream | 需要定時執行任務時 |

---

## Internationalization & Localization（國際化與本地化）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/cosmos** | 國際化（i18n）模組 | core | 多語言應用時 |

---

## Frontend & SSG（前端和靜態生成）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/ion** | Inertia.js SSR 集成 | core, photon | 使用 Inertia.js 時 |
| **@gravito/prism** | 模板引擎 | core | 伺服器端模板渲染時 |
| **@gravito/freeze** | 靜態網站生成（SSG）核心 | core | 需要 SSG 時 |
| **@gravito/freeze-react** | React SSG 適配器 | freeze | React 項目 SSG 時 |
| **@gravito/freeze-vue** | Vue SSG 適配器 | freeze | Vue 項目 SSG 時 |
| **@gravito/luminosity** | SmartMap 引擎（SSR） | core, photon | 智能地圖渲染時 |
| **@gravito/freeze** | 靜態架構基礎 | core | 構建靜態網站時 |

---

## State Management（狀態管理）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/freeze** | 前端狀態管理基礎 | core | 前端狀態同步時 |

---

## API & Schema（API 和 Schema）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/astral** | Schema 驅動的 OpenAPI 生成 | core | 自動生成 API 文檔時 |
| **@gravito/beam** | 輕量級、類型安全的 RPC 客戶端 | core | 跨應用 RPC 調用時 |

---

## Observability & Monitoring（可觀測性與監控）

| 包名 | 用途 | 關鍵依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/monitor** | 可觀測性模組（健康檢查、指標、追蹤） | core | 監控和診斷時 |
| **@gravito/constellation** | Sitemap 生成（動態/靜態，分片，快取） | core | 生成網站地圖時 |

---

## Admin UI Components（後台管理 UI）

| 包名 | 用途 | 依賴 | 何時使用 |
|---|---|---|---|
| **@gravito/admin-ui-dashboard** | 儀表板 UI | admin-sdk | 主頁面 |
| **@gravito/admin-ui-catalog** | 商品管理 UI | admin-sdk | 商品管理 |
| **@gravito/admin-ui-order** | 訂單管理 UI | admin-sdk | 訂單管理 |
| **@gravito/admin-ui-support** | 支持中心 UI | admin-sdk | 支持系統 |
| **@gravito/admin-ui-announcement** | 公告管理 UI | admin-sdk | 系統公告 |
| **@gravito/admin-ui-marketing** | 行銷管理 UI | admin-sdk | 行銷活動 |
| **@gravito/admin-ui-analytics** | 分析儀表板 UI | admin-sdk | 數據分析 |
| **@gravito/admin-ui-invoice** | 發票管理 UI | admin-sdk | 發票管理 |
| **@gravito/admin-ui-ad** | 廣告管理 UI | admin-sdk | 廣告系統 |
| **@gravito/admin-ui-news** | 新聞管理 UI | admin-sdk | 新聞系統 |
| **@gravito/admin-ui-access** | 訪問控制 UI | admin-sdk | 權限管理 |

---

## SDK & Tools（SDK 和工具）

| 包名 | 用途 | 何時使用 |
|---|---|---|
| **@gravito/admin-sdk** | 後台管理 SDK | 後台開發 |
| **@gravito/admin-shell-react** | React 後台框架 | React 後台 |
| **create-gravito-app** | 專案腳手架 | 新項目初始化 |
| **@gravito/cli** (@gravito/pulse) | 官方 CLI | 項目管理 |
| **@gravito/luminosity-cli** | SmartMap CLI | 地圖配置 |

---

## Satellites（業務領域外掛）

所有 satellite 都位於 `satellites/` 目錄，不透過 npm 發佈（workspace 依賴）。

| Satellite | 用途 | 依賴 |
|---|---|---|
| **@gravito/satellite-catalog** | 商品管理系統 | core, atlas, signal |
| **@gravito/satellite-membership** | 用戶和成員管理 | core, atlas, signal, fortify |
| **@gravito/satellite-commerce** | 訂單和交易管理 | core, atlas, signal |
| **@gravito/satellite-payment** | 支付處理 | core, atlas, signal |
| **@gravito/satellite-analytics** | 分析和報告 | core, atlas, signal |
| **@gravito/satellite-support** | 支持和票券系統 | core, atlas, signal |
| **@gravito/satellite-news** | 新聞和內容管理 | core, atlas, signal |
| **@gravito/satellite-announcement** | 系統公告管理 | core, atlas, signal |
| **@gravito/satellite-marketing** | 行銷活動管理 | core, atlas, signal |
| **@gravito/satellite-invoice** | 發票和計費 | core, atlas, signal |
| **@gravito/satellite-ad** | 廣告系統 | core, atlas, signal |
| **@gravito/satellite-logistics** | 物流管理 | core, atlas, signal |
| **@gravito/satellite-cart** | 購物車管理 | core, atlas, signal |
| **@gravito/satellite-inventory-lock** | 庫存鎖定 | core, atlas, signal |
| **@gravito/satellite-flash-sale** | 限時促銷 | core, atlas, signal |

---

## 包依賴指南

### 选择包的原則

1. **優先使用基礎層**：如無特殊需求，用 core、photon、atlas、signal
2. **避免不必要的進階包**：stream、flux 等進階功能按需添加
3. **Satellite 隔離**：Satellite 間透過 signal（事件）通訊，禁止直接導入
4. **檢查循環依賴**：新增依賴前，執行 `bun run scripts/generate-dependency-graph.ts`

### 常見的包組合

| 場景 | 推薦包 |
|---|---|
| 簡單 REST API | core + photon + atlas |
| 實時應用 | core + photon + atlas + ripple |
| 後台管理系統 | core + photon + atlas + fortify + admin-ui-* |
| 完整電商系統 | core + photon + atlas + fortify + satellites/* |
| 高負載應用 | core + photon + atlas + stream + stasis |

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [架構約束](./architecture.md)
- [開發工作流程](./development.md)
- [命令參考](./commands.md)
- [docs/spec/ARCHITECTURE_SPEC.md](../spec/ARCHITECTURE_SPEC.md) - 詳細架構規格
