# 文件左側選單分群提案（規劃稿）

本提案用於整理 docs 左側選單的資訊架構，目標是「先導入、後深入」，避免模組增加後造成左側選單過度雜亂。此文案僅供規劃與後續實作參考，不涉及實際改動。

---

## 設計原則

1. **新手優先**：最先接觸的內容放在最上方，降低學習門檻。
2. **核心先行**：核心概念、架構與核心用法優先於模組細節。
3. **複雜功能分門別類**：例如 DB/ORM 需拆解成多個子主題（類 Laravel 官網組織方式）。
4. **模組分群**：依功能領域聚類，避免平鋪式列表。
5. **擴充彈性**：確保未來新增模組能就位而不破壞整體結構。

---

## 建議分群與排序（左側選單）

### 1) Getting Started（入門）
- Introduction / Overview
- Installation
- Quick Start
- Project Structure
- Configuration Basics

### 2) Core Concepts（核心概念）
- Galaxy Architecture
- PlanetCore Lifecycle
- Hooks & Events
- Modules vs Plugins

### 3) First Build（第一個專案）
- Routing Basics
- Controllers & Views
- Static Site / Build Pipeline

### 4) Modules（官方模組總覽）
- Module Index / Comparison
- How to Add/Remove Modules

### 5) Database / ORM（完整分門別類）
> 類 Laravel 官網分門方式，給「從入門到高階」的完整學習路線  
- Overview（DB 模組定位與概覽）
- Quick Start（連線與模型）
- Query Builder / ORM
- Migrations
- Seeders
- Transactions
- Relationships
- Advanced（Performance / Pooling / Sharding）

### 6) Auth & Security
- Auth Overview
- Sessions / JWT
- RBAC / Policies
- Rate Limiting

### 7) Storage & Files
- Local / S3 / R2
- Upload & CDN
- Signed URLs

### 8) Cache & Queue
- Cache Overview
- Redis / Memory
- Jobs / Scheduler

### 9) SEO & Sitemap
- Luminosity Overview
- Sitemap Generation
- Robots / Meta
- Adapters（HTTP / Express）

### 10) Frontend Integration
- Inertia / Ion
- View Engine / Prism
- Static / SSR

### 11) Advanced / Operations
- Observability / Logging
- Scaling & Deployment
- Performance Tuning

### 12) Reference
- API Reference
- CLI
- Changelog

---

## 實作備註

- 需要確認「docs 站點」與「各模組實際文件」的對應路徑與命名。
- 建議先做「分群與排序」的資訊架構圖，再逐步填補每一類別下的內容。
- DB/ORM 分門建議獨立出完整章節，避免併入一般模組清單造成閱讀壓力。

---

## 下一步（建議）

1. 確認目標站點（docs 或 luminoisty-site）與路由規則。
2. 逐一對應現有文件到上述分群中，標記缺口。
3. 補齊高優先級（入門、核心、DB/ORM 快速入門）內容。
