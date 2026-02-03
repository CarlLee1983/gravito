---
title: 產品介紹
description: 了解 Gravito 的核心理念、架構設計以及為什麼選擇它作為您的下一個全端框架。
---

# 產品介紹

> **Gravito** 是一個為現代開發者打造的「行星級」高性能框架。它以 Bun 為核心，融合了 Laravel 的開發藝術與 **銀河架構 (Galaxy Architecture)** 的極致擴展性。

## 什麼是 Gravito？

Gravito 不僅僅是一個 Web 框架，它是您的 **全端開發引力場**。在 JavaScript/TypeScript 領域中，開發者往往面臨著過於零散的工具鏈選擇。Gravito 的目標是提供一個類似 **Laravel** 的「一切就緒 (Batteries Included)」體驗，同時利用 **Bun** 帶來的秒級啟動與原生高性能。

- **銀河架構 (Galaxy Architecture)**：
  - **PlanetCore (核心)**：極輕量級的微核心，負責生命週期與 Hook 管理。
  - **Orbits (軌道)**：圍繞核心運行的官方基礎設施模組（如 Atlas 為資料庫軌道、Signal 為事件/郵件軌道、Ion 為前端橋接軌道）。
  - **Satellites (衛星)**：自包含的領域業務模組（如 Catalog、Membership），採用 DDD 與整潔架構實作。

## 為什麼選擇 Gravito？

### 1. 進化版的開發體驗 (DX)
如果您喜愛 Laravel、Ruby on Rails 或 Django，您會發現 Gravito 的 API 極其親切。我們推崇 **清單驅動開發 (MDD)**，透過 `gravito.config.ts` 即可輕鬆組裝複雜系統。

### 2. 生生不息的高性能
基於 [Bun](https://bun.sh/) 執行環境，Gravito 擁有極低的內存占用與驚人的請求處理速度。這意味著您的伺服器可以處理更多的併發，同時大幅降低雲端運算成本。

### 3. 三維前端開發
Gravito 是 **「前端不偏好 (Frontend Agnostic)」** 的框架。我們內建支援三種主要的應用架構：
- **現代單體 (Orbit Ion)**：結合 React 或 Vue (Inertia.js)，享受單頁應用的流暢，卻不必開發複雜的 API。
- **經典 MPA (Orbit Prism)**：高性能的伺服器渲染，提供完美的 SEO 與開發直覺。
- **靜態生成 (SSG)**：一鍵將應用程序凍結為靜態站點，適合部署到 GitHub Pages 或 Vercel。

### 4. 企業級的擴展能力
核心雖然輕盈，但透過 **Orbits 系統**，您可以輕鬆加入快取、隊列、國際化 (I18n)、SEO 自動化等強大功能。

## 我們與其他框架的對比

- **與 NestJS 相比**：Gravito 更強調「約定優於配置」，減少了大量的樣板程式碼 (Boilerplate) 與裝飾器使用。
- **與 Hono 相比**：Hono 是最棒的微型框架，而 Gravito 是在其之上建構的「重量級解決方案」，提供了完整的資料庫治理與專案組織規範。
- **與 Laravel 相比**：我們繼承了 Laravel 的靈魂，但使用了 TypeScript 的型別安全與 Node.js 全異步的效能優勢。

---

## 接下來
如果您已經準備好開始，請前往 [安裝指南](./installation.md) 建立您的第一個專案。
