---
title: 安裝指南
description: 學習如何安裝 Gravito 開發環境並啟動您的第一個專案。
---

# 安裝指南

> 本指南將幫助您從零開始建立開發環境。Gravito 的安裝極其簡單，我們致力於讓您在 60 秒內看到第一個頁面。

## 系統要求

Gravito 為現代開發環境量身打造，您只需要具備：

- **作業系統**：macOS, Linux 或 Windows (建議使用 WSL2)。
- **[Bun](https://bun.sh/)**：版本 1.1.0 或更高（強烈建議使用最新穩定版）。

### 安裝 Bun
如果您尚未安裝 Bun，請執行以下指令：

```bash
# macOS 或 Linux
curl -fsSL https://bun.sh/install | bash

# Windows (使用 PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

安裝完成後，確認版本：
```bash
bun --version
```

## 建立您的專案

我們推薦使用官方 CLI 工具來建立專案，它會引導您完成基礎配置。

### 1. 使用互動式腳本 (推薦)
```bash
bunx gravito create
```
此指令將啟動一個互動式介面，您可以選擇：
- 專案名稱
- 前端框架 (React / Vue)
- 模板類型 (Fullstack / API Only / Blog)

### 2. 使用經典手排方式
如果您偏好直接指定名稱：
```bash
bunx create-gravito-app@latest my-awesome-app
```

## 專案初始化

進入專案目錄並安裝依賴：

```bash
cd my-awesome-app
bun install
```

## 啟動開發伺服器

執行以下指令啟動 Gravito 引擎與 Vite 開發伺服器：

```bash
bun dev
```

啟動後，您可以在瀏覽器中訪問：
- 應用程式入口：**[http://localhost:3000](http://localhost:3000)**
- HMR 監控：**Vite 伺服器通常運行在 5173 端口** (由框架自動代理)。

## 常用指令列表

| 指令 | 說明 |
| --- | --- |
| `bun dev` | 啟動開發熱更新模式 |
| `bun build` | 建構生產環境代碼 |
| `bun start` | 啟動生產環境伺服器 |
| `bun gravito` | 進入 Gravito 工匠指令工具 |

## 常見問題

### 1. 為什麼選擇 Bun 而不是 Node.js?
Bun 原生支援 TypeScript、內建超快的測試包裝器、以及遠勝於 npm/yarn 的依賴安裝速度。Gravito 深度整合了 Bun 的 API 以獲得最佳效能。

### 2. 是否支援 Docker?
支援。我們在專案模板中提供了一個標準的 `Dockerfile`，您可以輕鬆地將專案容器化並部署到任何地方。

---

## 接下來
恭喜您完成安裝！現在可以閱讀 [專案結構](./project-structure.md) 了解專案的組織方式，或直接開始 [快速上手](./quick-start.md)。
