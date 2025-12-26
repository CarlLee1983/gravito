---
title: 介紹
order: 1
---

# Luminosity 介紹

歡迎來到 Luminosity，這是 Gravito 框架中用於產生高效能 Sitemap (網站地圖) 的核心引擎。

若要取得最完整的體驗（深度整合、生命週期 Hook、官方適配器），建議搭配 Gravito 主框架使用。

## 什麼是 Luminosity？

Luminosity (光度) 是一套專為大規模現代網站設計的 Sitemap 產生與管理解決方案。它的名稱源自天文學中的「光度」，象徵著讓您的網站在搜尋引擎的浩瀚宇宙中如恆星般閃耀。

它不僅僅是一個 Sitemap 產生器，它還是一個 **SmartMap Engine (智慧地圖引擎)**。

### 核心特性

- **高效能 (High Performance)**: 採用串流架構 (Streaming Architecture)，即使是百萬級別的 URL 也能輕鬆應對，記憶體佔用極低。
- **治理 (Governance)**: 內建生命週期管理，包含 `Create` (建立), `Update` (更新), `Compact` (壓實), `Warm` (預熱) 等機制。
- **SEO 優先**: 自動處理 robots.txt，支援多種 Sitemap 格式 (XML, Index, Text)，並遵循 Google 與 Bing 的最佳實踐。
- **開發者友善**: 提供豐富的 CLI 工具 (`lux`) 與 TypeScript API，輕鬆整合至任何 CI/CD 流程。

## 功能亮點

<h3 id="incremental-lsm-tree-engine">LSM 樹增量引擎</h3>

Luminosity 以日誌結構合併流程 (LSM) 將新 URL 追加為不可變操作，再於背景進行壓實。寫入維持順序化，避免傳統 Sitemap 重寫造成的鎖競爭。

<h3 id="enterprise-grade">企業級架構</h3>

內建互斥鎖與陳舊內容優先驗證 (SWR) 快取策略，在高流量情境下也能穩定服務。更新寫入不會阻塞讀取。

<h3 id="auto-sitemap-index">自動 Sitemap 索引</h3>

當 URL 超過 50,000 上限時，Luminosity 會自動切分 Sitemap 並產生索引，無需手動分頁或維護。

<h3 id="robots-txt-proxy">Robots.txt 代理</h3>

透過同一條 Luminosity 管線產生 `robots.txt`，讓爬蟲規則與 Sitemap 更新同步，不同環境也能維持一致策略。

<h3 id="meta-tag-builder">Meta 標籤管理器</h3>

以結構化資料產生 Meta、OpenGraph、Twitter Cards 與 JSON-LD 標籤，確保輸出一致且具型別安全。

## 為什麼需要它？

由於現代網站多為 SPA (單頁應用) 或動態內容龐大，傳統的靜態 Sitemap 產生器往往難以應對：
1. **更新不及時**: 內容更新後，Sitemap 往往滯後。
2. **效能瓶頸**: URL 過多時，產生過程會耗盡伺服器資源。
3. **缺乏管理**: 舊的、無效的連結殘留在 Sitemap 中，影響 SEO 分數。

Luminosity 透過引入 **LSM-Tree (Log-Structured Merge Tree)** 的概念來解決這些問題。所有的變更都先寫入增量日誌 (Delta Log)，再透過背景程序進行壓實 (Compaction)，確保 Sitemap 永遠保持最新且高效。
