# @gravito/zenith (Flux Console) 🧭

> 專為 Gravito Flux 與 Stream 設計的零配置控制面板與監控儀表板。

`@gravito/zenith` (又稱為 **Flux Console**) 是 Gravito 非同步生態系統的官方管理界面。它為您的隊列 (Queues)、工作者 (Workers) 以及背景任務提供即時的可視化監控，讓您能夠在零配置的情況下實現強大的營運控制。

## 🌟 核心特性

- **📊 即時監控**：透過動態更新的圖表，即時掌握任務吞吐量、錯誤率與隊列延遲。
- **👷 工作者健康狀況**：追蹤集群中所有活躍的 Gravito 與 Laravel Worker 的 CPU、記憶體佔用與運行時間。
- **🛠️ 隊列管理**：隨時暫停或恢復隊列，並深入檢查處於等待 (Waiting)、延遲 (Delayed) 或失敗 (Failed) 狀態的任務。
- **♻️ 死信隊列 (DLQ) 操作**：直接從 UI 批量重試或清除失敗任務，一鍵搞定。
- **🔍 任務審計與搜尋**：對存儲於 SQL (SQLite/MySQL) 或 Redis 中的歷史任務進行深度搜尋。
- **📜 營運日誌封存**：為 Worker 活動與系統事件提供持久化存儲與全文檢索。
- **🚨 自動化告警**：原生整合 Slack、Discord 與電子郵件，當錯誤率飆升或隊列堆積時自動通知。
- **📅 排程管理**：完整的 UI 界面來管理並手動觸發您的 `@gravito/stream` Cron 定時任務。

## 📦 安裝

```bash
bun add @gravito/zenith
```

或者使用 `bunx` 直接執行：

```bash
bunx zenith
```

## 🚀 快速上手

### 1. 啟動儀表板

您可以使用內建的 CLI 啟動控制台，它會自動嘗試連接至您的本地 Redis。

```bash
# 在預設埠 3000 啟動
bunx zenith start

# 透過環境變數自定義配置
REDIS_URL=redis://production:6379 DB_DRIVER=mysql zenith start
```

### 2. 配置監控代理

在您的 Gravito 應用程式中註冊 **Pulse** 代理程式，以便向 Zenith 回報健康指標。

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitStream } from '@gravito/stream'
import { QuasarAgent } from '@gravito/quasar' // 指標回報器

const core = await PlanetCore.boot({
  orbits: [
    OrbitStream.configure({ /* ... */ }),
  ],
})

// 開始回報數據至 Zenith
const agent = new QuasarAgent({ service: 'orders-worker' })
await agent.start()
```

## 🛠️ 配置選項

| 環境變數 | 預設值 | 說明 |
|---|---|---|
| `PORT` | `3000` | 儀表板運行的埠號。 |
| `REDIS_URL` | `redis://localhost:6379` | 隊列後端的連接字串。 |
| `DB_DRIVER` | `sqlite` | 歷史任務的持久化驅動 (`sqlite` 或 `mysql`)。 |
| `AUTH_PASSWORD` | `none` | 若設置，將為 UI 界面啟用密碼保護。 |

## 🧩 儀表板區塊

- **總覽 (Overview)**：集群整體的健康狀況與任務吞吐量。
- **隊列 (Queues)**：各別隊列的詳細狀態與任務檢查。
- **工作者 (Workers)**：運行中的進程節點列表及其資源佔用。
- **Pulse**：所有服務實例的即時心跳監控。
- **排程 (Schedules)**：Cron 任務定義與執行歷史。
- **指標 (Metrics)**：用於容量規劃的長期歷史數據。

## 🤝 參與貢獻

我們歡迎任何形式的貢獻！詳細資訊請參閱 [貢獻指南](../../CONTRIBUTING.md)。

## 📄 開源授權

MIT © Carl Lee
