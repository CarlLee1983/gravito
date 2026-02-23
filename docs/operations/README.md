# 運維與開發指南 (Operations & Development Hub)

歡迎來到 Gravito 運維中心。本目錄收納了所有關於開發規範、部署流程、系統遷移與基礎設施配置的指南。

---

## 🛠️ 開發與規範 (Guides)

| 指南 | 說明 |
| :--- | :--- |
| [🚀 開發者指南](./guides/development.md) | 涵蓋開發流程、工具鏈 (Bun/Biome) 以及常見問題排查。 |
| [📦 NPM 發佈指南](./guides/npm-publishing.md) | 官方套件發佈流程、版本管理與安全規範。 |
| [🔐 NPM 2FA 配置](./guides/npm-otp.md) | 如何為發佈帳號配置雙因素認證。 |
| [🏷️ 版本策略](./guides/version-strategy.md) | 語義化版本 (SemVer) 規範與 Changesets 使用。 |
| [🎨 文檔風格指南](./guides/style-guide.md) | 為 AI Agent 與貢獻者定義的文檔編寫標準與用語規範。 |

---

## 🏗️ 基礎設施與 CI (Infrastructure)

| 指南 | 說明 |
| :--- | :--- |
| [⚡ Turbo Remote Cache](./infrastructure/remote-cache.md) | Vercel 遠程緩存配置，加速團隊與 CI 構建。 |
| [🚀 Turborepo 集成](./infrastructure/turborepo.md) | Monorepo 構建流水線與任務定義指南。 |
| [📝 Changesets 工作流](./infrastructure/changesets.md) | 變更日誌自動化與多包版本同步機制。 |
| [🧪 本地 CI 驗證](./infrastructure/local-ci.md) | 如何在本地模擬完整的 GitHub Actions 環境。 |

---

## 🔄 系統遷移 (Migration)

針對不同版本或架構轉型的深度遷移手冊：

*   **API 與功能遷移**
    *   [⚠️ API 棄用遷移清單](./migration/api-deprecations.md) - 從舊版 API 轉換至現代版本的對照表。
    *   [🌍 從 Hono 遷移](./migration/platform-hono.md) - 將現有 Web 服務遷移至 Gravito Photon 的步驟。
*   **架構演進**
    *   [⚡ 異步事件系統](./migration/async-events.md) - 從同步 Hook 轉換至高吞吐量異步事件。
    *   [🗂️ 持久化隊列](./migration/queue.md) - 從內存隊列遷移至 Redis (BullMQ) 基礎設施。
    *   [🔌 連接池優化](./migration/pool.md) - Atlas ORM v1.3+ 連接池新特性配置。
*   **索引與導航**
    *   [📌 遷移首頁](./migration/README.md) - 遷移決策樹與架構變動總覽。

---

## 🧩 專業領域 (Specialized)

*   [🧩 擴展 Atlas ORM](./specialized/extending-atlas.md) - 如何自定義資料庫驅動、語法產生器或 Model 特性。

---
*最後更新：2026-02-23*
*由 Antigravity Architect 維護*
