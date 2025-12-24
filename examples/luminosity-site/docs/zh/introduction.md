---
title: 介紹
order: 1
---

# Luminosity 介紹

歡迎來到 Luminosity，這是 Gravito 框架中用於產生高效能 Sitemap (網站地圖) 的核心引擎。

## 什麼是 Luminosity？

Luminosity (光度) 是一套專為大規模現代網站設計的 Sitemap 產生與管理解決方案。它的名稱源自天文學中的「光度」，象徵著讓您的網站在搜尋引擎的浩瀚宇宙中如恆星般閃耀。

它不僅僅是一個 Sitemap 產生器，它還是一個 **SmartMap Engine (智慧地圖引擎)**。

### 核心特性

- **高效能 (High Performance)**: 採用串流架構 (Streaming Architecture)，即使是百萬級別的 URL 也能輕鬆應對，記憶體佔用極低。
- **治理 (Governance)**: 內建生命週期管理，包含 `Create` (建立), `Update` (更新), `Compact` (壓實), `Warm` (預熱) 等機制。
- **SEO 優先**: 自動處理 robots.txt，支援多種 Sitemap 格式 (XML, Index, Text)，並遵循 Google 與 Bing 的最佳實踐。
- **開發者友善**: 提供豐富的 CLI 工具 (`lux`) 與 TypeScript API，輕鬆整合至任何 CI/CD 流程。

## 為什麼需要它？

由於現代網站多為 SPA (單頁應用) 或動態內容龐大，傳統的靜態 Sitemap 產生器往往難以應對：
1. **更新不及時**: 內容更新後，Sitemap 往往滯後。
2. **效能瓶頸**: URL 過多時，產生過程會耗盡伺服器資源。
3. **缺乏管理**: 舊的、無效的連結殘留在 Sitemap 中，影響 SEO 分數。

Luminosity 透過引入 **LSM-Tree (Log-Structured Merge Tree)** 的概念來解決這些問題。所有的變更都先寫入增量日誌 (Delta Log)，再透過背景程序進行壓實 (Compaction)，確保 Sitemap 永遠保持最新且高效。
