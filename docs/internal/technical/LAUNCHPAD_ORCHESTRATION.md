# Launchpad: Instant Deployment Orchestrator

**Version**: 1.3.2
**Module**: `@gravito/launchpad`
**Focus**: Container Lifecycle, Pre-warmed Pools, Rapid Preview Environments

---

## 1. 核心設計：預熱火箭池 (Rocket Pool)

Launchpad 的核心在於解決傳統 CI/CD 構建速度緩慢的問題。它不遵循「代碼 -> 構建 -> 部署」的傳統路徑，而是採用 **預熱噴射 (Pre-warmed Injection)** 模式。

### 1.1 Rocket (火箭) 狀態機
每個 Rocket 代表一個獨立的 Docker 容器實體，其生命週期由嚴格的狀態機管理：
*   **IDLE (空閒)**: 容器已啟動並運行 Bun 環境，等待任務分配。
*   **PREPARING (準備中)**: 正在執行 `git clone` 或 `docker cp` 代碼注入。
*   **ORBITING (運行中)**: 應用程式已啟動並對外提供服務。
*   **REFURBISHING (整修中)**: 任務結束，清理磁碟與環境，將容器歸還至 IDLE 池。

### 1.2 注入機制 (Payload Injection)
透過 `docker cp` 將源碼直接推入運行的容器，跳過 `docker build`。
*   **優勢**: 部署時間從分鐘級降低至 **< 10 秒**。
*   **適用場景**: PR 預覽 (Preview)、即時 Demo、短期開發環境。

---

## 2. 領域驅動設計 (DDD Structure)

### 2.1 領域層 (Domain)
*   **Rocket Aggregate**: 封裝容器 ID、連接埠映射與狀態轉換邏輯。
*   **Mission**: 定義部署合約（Git URL, Commit, Branch）。

### 2.2 應用層 (Application)
*   **PoolManager**: 監控池大小，自動補足 `IDLE` 火箭。
*   **MissionControl**: 全域 Facade，協調任務分配與注入。

### 2.3 基礎設施層 (Infrastructure)
*   **DockerAdapter**: 封裝 Docker Engine API 通訊。
*   **BunProxyAdapter**: 實作高效能的反向代理，根據子域名動態路由至對應的 Rocket 端口。

---

## 3. 實時遠測 (Telemetery)

整合 `@gravito/ripple`，將部署日誌與進度實時推送至開發者面板。
*   支援 WebSocket 串流輸出 `stdout/stderr`。
*   整合 GitHub Status API，在 PR 頁面顯示部署狀態與預覽連結。

---

## 4. 安全與隔離 (Security)

*   **環境隔離**: 每個部署運行在獨立的 Docker 容器中。
*   **資源限制**: 透過 Docker Cgroup 限制 CPU 與記憶體，防止預覽環境耗盡宿主機資源。
*   **Webhook 驗證**: 支持 `X-Hub-Signature-256` 簽名校驗。
