---
title: Better than Laravel 的 5 個 DX 核心
description: 以 Bun 為核心，打造超越 Laravel 的五大開發體驗支柱。
---

# Better than Laravel 的 5 個 DX 核心

這一頁整理 Gravito 在開發體驗上能超越 Laravel 的五個核心支柱，並以 Bun 的優勢放大差異化。

## 1. 超快 Dev Loop（Bun 優勢最大化）

- `bun dev`：啟動伺服器 + watch + typecheck（可分離）
- 即時重載：`routes` / `configs` / `views` / `i18n` / `env` 變更不重啟
- 冷啟動 KPI：首次啟動 < 1.5s；二次啟動 < 0.5s（可自行訂定）

## 2. 內建 Doctor 與自動修復（Laravel 缺的）

- 新增 `gravito doctor`
- 檢查項目：環境變數、連接埠、資料庫連線、migration 狀態、Redis、權限、Node/Bun 版本
- 每個問題都給：原因（root cause）、影響（impact）、一鍵修復或互動式修復

## 3. 可組裝 Presets，但預設就是對的

不是給一堆套件讓人選，而是提供已驗證的成品：

- `minimal`（API / edge / micro）
- `app`（完整 web app）
- `realtime`（含 ripple / echo）
- `worker`（queue-first）

每個 Preset 都是一套 Golden Path，請參閱 [預設模板](./presets.md) 了解會產生哪些資料夾、路由與測試。

## 4. 範例不是 Demo，是 Golden Path

生成專案後就有完整的成品動線：

- `routes/`、`app/`、`database/`
- 一個完整 feature slice（Auth + Profile + Settings）
- 每條路由都有測試（最低 2 條：Auth、CRUD）

## 5. 全套 Unified Config Contract

要贏 Laravel，就靠「一致」：

- `config key` 命名、`env key` 命名、錯誤碼、日誌欄位
- 任何 orbit 都必須符合 contract，否則不能進入官方 preset

詳見 [Config Contract](./config-contract.md)，掌握命名與日誌欄位的統一約定。
