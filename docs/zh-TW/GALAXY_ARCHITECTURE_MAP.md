# 🌌 Gravito 銀河全景圖 (Galaxy Master Map)

歡迎來到 **Gravito Galaxy** 的完整全景圖。本文件是整個生態系統中所有模組、工具和衛星的 100% 全面索引。

---

## 🪐 核心與 DNA (基礎)
銀河系的重力中心與整個生態系統的建築基石。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/core`** | **PlanetCore** | 微內核、IoC 容器與生命週期管理器。 |
| **`@gravito/enterprise`**| **架構 DNA**| DDD, CQRS 與整潔架構 (Clean Architecture) 原語。 |
| **`@gravito/gravito`** | **Galaxy Umbrella** | 所有軌道模組的統一入口與 CLI 封裝。 |

---

## 💻 指揮中心 (編排與工具)
如何從終端機建構、擴展與管理銀河系。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/cli`** | **指揮中心** | 管理 Gravito 專案的主要 CLI 介面。 |
| **`@gravito/scaffold`** | **藍圖引擎** | 新衛星的專案生成器與結構強制執行工具。 |
| **`create-gravito-app`**| **誕生脈衝** | 快速啟動新銀河系的工具。 |
| **`@gravito/launchpad`**| **發射平台** | 亞秒級、零停機的容器化部署。 |

---

## 📡 感知層 (Web, API 與驗證)
銀河系如何與外界互動並過濾傳入的信號。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/photon`** | **感知層** | 基於 Hono 的高效能 HTTP 引擎。 |
| **`@gravito/ether`** | **感知過濾器** | 基於 Bun HTMLRewriter 的流式 HTML 轉換引擎。 |
| **`@gravito/impulse`** | **感知過濾器** | 宣告式請求驗證與資料完整性保護。 |
| **`@gravito/beam`** | **傳送門層** | 零損耗、型別安全的 RPC（客戶端對衛星或 M2M）。 |
| **`@gravito/graphql`** | **語義閘道器**| 統一的 GraphQL 介面，跨衛星聚合資料。 |
| **`@gravito/astral`** | **探索層** | 影子契約 OpenAPI 生成器與 Swagger UI。 |
| **`impulse-bridge`** | **過濾橋接** | 將後端驗證規則連接到前端 UI。 |

---

## 💾 重力層 (持久化與狀態)
銀河系如何在 SQL, NoSQL 與多級快取中持久化知識。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/atlas`** | **資料重力 (SQL)**| Bun 原生 ORM 與查詢建構器 (Postgres/SQLite)。 |
| **`@gravito/dark-matter`**| **NoSQL 重力** | Bun 原生 MongoDB 客戶端與 Change Streams。 |
| **`@gravito/plasma`** | **能量網格** | Bun 原生 Redis 整合，用於共享狀態與鎖定。 |
| **`@gravito/stasis`** | **熱緩衝區** | 分級 L1/L2 快取與預測性預熱。 |
| **`@gravito/nebula`** | **儲存核心** | 多磁碟檔案管理（在地、S3 透過 `nebula-s3`）。 |
| **`@gravito/monolith`** | **知識核心** | 基於檔案的 Markdown CMS，用於文件與內容。 |

---

## 🧠 神經系統 (邏輯與即時)
資訊如何在銀河系內流轉與邏輯編排。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/flux`** | **邏輯編排器**| 分佈式工作流引擎與 Saga 協調器。 |
| **`@gravito/stream`** | **非同步引擎** | 背景任務處理與 EDA (事件驅動架構)。 |
| **`@gravito/signal`** | **通訊層** | 多驅動郵件框架與模板渲染。 |
| **`@gravito/flare`** | **通訊通量** | 多管道通知 (Slack, SMS, Push)。 |
| **`@gravito/ripple`** | **引力波** | 雙向 WebSocket 脈衝（客戶端透過 `ripple-client`）。 |
| **`@gravito/radiance`** | **事件視界** | 透過 Pusher/Redis 實現即時狀態同步。 |
| **`@gravito/echo`** | **深空雷達** | 企業級 Webhook 接收與可靠分發。 |

---

## 🛡️ 免疫系統 (安全與容錯)
銀河系如何防禦故障與攻擊。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/fortify`** | **安全之盾** | E2E 認證、M2M 令牌與分佈式 RBAC。 |
| **`@gravito/sentinel`** | **身份基地** | 核心身份管理、Guards 與 ACL 策略。 |
| **`@gravito/mass`** | **資料品質層**| 高效能 TypeBox 模式驗證。 |
| **`@gravito/resilience`**| **守護者層** | 熔斷器 (Circuit Breakers)、DLQ、重試與工作池。 |

---

## 👁️ 視覺皮層 (呈現與 SEO)
銀河系如何為人類與搜尋引擎呈現。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/prism`** | **視覺焦點** | 邊緣模板引擎、SSG 與圖片優化。 |
| **`@gravito/ion`** | **神經橋接** | 用於現代單體應用的 Inertia.js v2 適配器。 |
| **`@gravito/chromatic`**| **美學光譜**| 統一風格、色彩運算與分佈式主題。 |
| **`@gravito/freeze`** | **水合層** | 恢復性引擎 (React 透過 `freeze-react`, Vue 透過 `freeze-vue`)。 |
| **`@gravito/luminosity`**| **智慧地圖引擎** | 企業級 SEO、Sitemap 分片與 Meta 索引。 |

---

## 🏛️ 行政皮層 (後台管理)
用於管理整個銀河系的企業級管理介面。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/admin-sdk`** | **治理 SDK** | 建構管理功能的基礎工具包。 |
| **`admin-shell-react`** | **治理外殼** | 基於 React 的行政管理容器。 |
| **`admin-ui-*`** | **領域模組** | 存取、廣告、分析、目錄、儀表板、發票等。 |

---

## ⚙️ 引擎室 (系統與邊緣)
銀河系如何與物理作業系統及邊緣環境互動。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/horizon`** | **發條裝置** | 具備節點角色感知的解耦排程器。 |
| **`@gravito/forge`** | **工業核心** | CPU 密集型媒體處理管道 (FFmpeg)。 |
| **`@gravito/nova`** | **外部推進器**| 型別安全的 Shell 編排與指令執行。 |
| **`@gravito/quark`** | **量子鏈路** | 超低延遲的 Bun 原生 TCP 引擎。 |
| **`@gravito/xenon`** | **原生橋接** | 安全的 FFI 綁定，用於 Rust/C++ 整合。 |
| **`orbit-cloudflare`** | **邊緣適配器** | 對 Cloudflare 生態系統的專化整合。 |

---

## 🔭 觀測站 (維運與監控)
工程師如何監控與管理銀河系的內部健康。

| 模組 | 銀河角色 | 說明 |
|:---|:---|:---|
| **`@gravito/zenith`** | **控制平面** | 視覺化儀表板，監控隊列與工作進程。 |
| **`@gravito/quasar`** | **心跳代理** | 向 Zenith 報告的分佈式遙測代理。 |
| **`@gravito/monitor`** | **生命體徵** | 健康檢查、指標與 OpenTelemetry 追蹤。 |
| **`@gravito/spectrum`** | **視覺望遠鏡**| 具備請求關聯的實時在地調試 UI。 |
| **`@gravito/constellation`**| **星圖** | 多衛星 SEO Sitemaps 與影子部署。 |

---

## 📄 授權
MIT © 2026 Gravito Framework Team
