# 🚀 Launchpad Dashboard

> Gravito 地面站 (Ground Station) - 即時任務控制與遙測儀表板。

**Launchpad Dashboard** (@gravito/launchpad-dashboard) 是一款為 Gravito 遙測數據設計的高科技、工業級監控介面。它為您的分散式系統、服務與模組提供了即時的「任務控制中心 (Mission Control)」風格視圖。

## ✨ 核心特性

- **📡 即時遙測 (Telemetry)**：視覺化活動模組與服務的安全上行鏈路流。
- **🖥️ 任務控制 UI**：沉浸式、受 CRT 啟發的介面，具備掃描線與工業風格的數據讀數。
- **📊 資源監控**：即時追蹤 CPU 使用率 (推進動力)、記憶體配置 (載荷) 與系統延遲。
- **📟 終端日誌流**：為每個模組整合終端視窗，展示具備 CRT 效果的即時執行日誌。
- **🔗 全域命令日誌**：底部設有中心化終端，用於展示全域系統事件與任務指派。
- **⚡ 效能導向**：採用 React 19 與 Vite 構建，具備極速的 HMR (熱模組替換) 與極低開銷。

## 📦 安裝

```bash
# 在 launchpad-dashboard 套件目錄下
bun install
```

## 🚀 使用方式

### 開發模式

啟動具備熱模組替換 (HMR) 的開發模式：

```bash
bun run dev
```

### 構建

建立優化後的生產環境版本：

```bash
bun run build
```

## 🛠️ 技術棧

- **框架**：React 19
- **構建工具**：Vite
- **樣式**：Tailwind CSS
- **圖標**：Lucide React
- **字體**：Space Mono & Inter (工業美學風格)

## 🏗️ 架構設計

- **`src/App.tsx`**：主儀表板佈局，包含 Houston 標頭、任務網格與全域終端。
- **`src/hooks/useTelemetry.ts`**：處理接收與處理即時遙測數據的邏輯。
- **`src/utils.ts`**：樣式工具函式與 tailwind-merge 配置。

## 🛡️ 遙測安全

Launchpad Dashboard 使用安全上行鏈路狀態指示器，確保您始終查看的是來自地面站的經驗證數據。

## 📝 授權

MIT © Carl Lee
