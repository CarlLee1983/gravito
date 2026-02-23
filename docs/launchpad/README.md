# Gravito Launchpad

隨插即用的極速預覽環境擴展。透過容器預熱技術，讓您的 Pull Request 代碼在數秒內即可上線預覽。

---

## 📖 核心文件

| 文檔 | 說明 |
| :--- | :--- |
| [🚀 部署手冊](./DEPLOYMENT.md) | 引導您在 Linux 伺服器上安裝與配置 Launchpad 服務。 |
| [📐 設計架構](./DESIGN.md) | 詳細說明「火箭池 (Rocket Pool)」架構與狀態機設計。 |
| [🛠️ 技術規格](../internal/technical/LAUNCHPAD_ORCHESTRATION.md) | 深度分析領域驅動設計 (DDD) 實作與內部調度機制。 |

---

## ⚡ 為什麼選擇 Launchpad？

### 傳統流程：慢速且冗餘
`Push -> Build Image (3min) -> Push Image (1min) -> Pull Image (1min) -> Run -> Ready (共 5-10 分鐘)`

### Launchpad 模式：極速噴射
`Push -> GitHub Webhook -> Payload Injection (2s) -> Ready (共 10 秒內)`

---

## 🎯 適用場景
*   **PR 自動預覽**: 為每個 Pull Request 生成獨一無二的測試網址。
*   **即時 Demo**: 向客戶或團隊展示最新功能。
*   **雲端開發**: 快速啟動臨時的 Bun 開發環境。

---
*Created by Antigravity Architect | 2026-02-23*
