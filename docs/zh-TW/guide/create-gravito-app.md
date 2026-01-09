---
title: Create Gravito App
description: 使用官方範本快速建立 Gravito 專案。
---

# Create Gravito App

`create-gravito-app` 是 Gravito CLI 的薄封裝，用來快速建立新專案。

## 特色

- 一鍵建立 Gravito 專案
- 內建推薦範本與預設結構
- 可直接接續 CLI 初始化流程

## 使用方式

```bash
bunx create-gravito-app@latest my-app
```

## 常用選項

```bash
bunx create-gravito-app@latest my-app -- --template clean
```

常用參數（會轉交給 Gravito CLI）：

```bash
# 架構範本
--template clean
--template ddd
--template enterprise-mvc

# 套件管理器
--package-manager bun
--package-manager pnpm

# 跳過安裝或 git
--skip-install
--skip-git
```

架構範本說明：

- `clean`：嚴格分層的 Clean Architecture，適合大型專案與清楚依賴邊界。
- `ddd`：Domain-Driven Design（限界上下文），適合領域複雜、需要清楚領域劃分的專案。
- `enterprise-mvc`：類 Laravel MVC 結構，適合傳統 Web 開發與快速落地。

> 提示：`create-gravito-app` 會把參數轉交給 Gravito CLI。實際可用選項以 `gravito init --help` 為準。
> `--package-manager` 只影響安裝工具，不代表執行環境（Bun/Node）一定被鎖定。
> 若團隊全程使用 Bun，可直接用 Bun 安裝，保持工具一致。

## 功能說明

- 觸發 Gravito CLI 的 `create` 流程
- 產生建議的專案結構與範本

## 產生結果（範例）

```
my-app/
  src/
  tests/
  package.json
  README.md
```

## 下一步

- 了解範本與架構：[專案初始化](./cli-init.md)
