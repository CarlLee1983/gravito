---
title: 安裝指南
description: 學習如何安裝 Gravito 開發環境並啟動您的第一個「銀河宿主」 (Galaxy Host)。
---

# 🚀 安裝指南

> 本指南將幫助您從零開始建立開發環境。我們的目標是讓您在 60 秒內成功啟動第一個 **銀河宿主 (Galaxy Host)**。

---

## 🛠️ 系統要求

Gravito 為現代雲端原生環境打造，您只需要具備：

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

---

## 🏗️ 建立您的專案

我們推薦使用官方的 **Gravito Scaffold** CLI 工具，它會引導您完成基礎架構配置。

### 1. 使用互動式腳本 (推薦)
```bash
bunx gravito create
```
此指令將啟動一個互動式介面，您可以選擇：
- 專案名稱
- 銀河角色 (Galaxy Host / Standalone Satellite)
- 前端框架 (React / Vue)
- 核心軌道 (Auth, Database, Cache)

### 2. 使用快捷指令
如果您偏好直接指定名稱：
```bash
bunx create-gravito-app@latest my-galaxy
```

---

## 📦 專案初始化

進入專案目錄並安裝依賴：

```bash
cd my-galaxy
bun install
```

---

## ⚡ 啟動開發伺服器

執行以下指令啟動 **Xenon 宿主引擎** 與 Vite 開發伺服器：

```bash
bun dev
```

啟動後，您可以在瀏覽器中訪問：
- **銀河宿主入口**：**[http://localhost:3000](http://localhost:3000)**
- **Vite HMR 監控**：5173 端口 (由框架自動代理)。

---

## 📜 常用指令列表

| 指令 | 說明 |
| --- | --- |
| `bun dev` | 啟動開發模式與 Xenon 熱加載 |
| `bun build` | 編譯衛星模組與前端資源 |
| `bun start` | 啟動生產環境銀河宿主 |
| `bun gravito` | 進入 Gravito 工匠指令工具 |

---

## ❓ 常見問題

### 1. 為什麼選擇 Bun 而不是 Node.js?
Bun 不僅是一個運行時，更是一個全能引擎。它內建 TypeScript 編譯、超快的測試運行器，以及 Gravito 用來實現 O(1) 路由效能的原生高效能 HTTP API。

### 2. 什麼是「銀河宿主」 (Galaxy Host)?
在 v1.6+ 中，每個 Gravito 專案本質上都是一個 **銀河宿主**。它使用 **Xenon Runtime** 來協調各個獨立的領域衛星。這讓您的應用能從微型網站平滑演進到分佈式系統，而無需重構代碼。

### 3. 是否支援 Docker?
支援。每個專案模板都包含標準的 `Dockerfile` 與 `docker-compose.yml`，讓您可以輕鬆部署到生產環境。

---

## 🔗 接下來
恭喜您完成安裝！現在可以閱讀 [專案結構](./project-structure.md) 了解組織方式，或深入探討 [核心概念](../architecture/core-concepts.md)。
