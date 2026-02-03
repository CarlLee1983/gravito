---
title: Gravito 模組依賴關係圖
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# Gravito 模組依賴關係圖

> 自動生成於：2026-01-28T15:21:16.300Z

## 📊 摘要統計

- **總套件數**：64
- **內部依賴邊數**：106
- **外部依賴數**：63
- **循環依賴**：0 個
- **孤立套件**：38 個
- **關鍵套件**：5 個

## 🗺️ 依賴關係圖

```mermaid
graph TB
  %% Gravito 模組依賴關係圖

  %% 節點定義
  admin-ui-support["admin-ui-support<br/><small>v0.1.0</small>"]
  impulse["impulse<br/><small>v1.1.0</small>"]
  flare["flare<br/><small>v3.3.0</small>"]
  signal["signal<br/><small>v3.0.3</small>"]
  launchpad-dashboard["launchpad-dashboard<br/><small>v0.1.0</small>"]
  admin-sdk["admin-sdk<br/><small>v0.1.0</small>"]
  orbit-cloudflare["orbit-cloudflare<br/><small>v1.0.1</small>"]
  scaffold["scaffold<br/><small>v3.0.1</small>"]
  admin-ui-access["admin-ui-access<br/><small>v0.1.0</small>"]
  pulsar["pulsar<br/><small>v3.0.1</small>"]
  admin-ui-news["admin-ui-news<br/><small>v0.1.0</small>"]
  atlas["atlas<br/><small>v1.4.0</small>"]
  spectrum["spectrum<br/><small>v3.0.1</small>"]
  beam["beam<br/><small>v1.0.0-beta.1</small>"]
  photon["photon<br/><small>v1.0.0-beta.1</small>"]
  site["site<br/><small>v1.0.0-beta.1</small>"]
  radiance["radiance<br/><small>v1.0.3</small>"]
  luminosity-adapter-express["luminosity-adapter-express<br/><small>v1.0.1</small>"]
  graphql["graphql<br/><small>v1.1.0</small>"]
  forge["forge<br/><small>v3.0.2</small>"]
  luminosity-adapter-photon["luminosity-adapter-photon<br/><small>v1.0.1</small>"]
  impulse-bridge["impulse-bridge<br/><small>v2.0.0</small>"]
  admin-ui-invoice["admin-ui-invoice<br/><small>v0.1.0</small>"]
  launchpad["launchpad<br/><small>v1.2.2</small>"]
  zenith["zenith<br/><small>v1.1.2</small>"]
  freeze-vue["freeze-vue<br/><small>v1.0.0-beta.6</small>"]
  sentinel["sentinel<br/><small>v4.0.0</small>"]
  freeze-react["freeze-react<br/><small>v1.0.0-beta.6</small>"]
  horizon["horizon<br/><small>v3.0.1</small>"]
  pulse["pulse<br/><small>v3.0.1</small>"]
  admin-ui-analytics["admin-ui-analytics<br/><small>v0.1.0</small>"]
  admin-shell-react["admin-shell-react<br/><small>v0.1.0</small>"]
  ripple["ripple<br/><small>v3.4.0</small>"]
  admin-ui-order["admin-ui-order<br/><small>v0.1.0</small>"]
  stasis["stasis<br/><small>v3.0.1</small>"]
  ion["ion<br/><small>v3.0.1</small>"]
  cosmos["cosmos<br/><small>v3.1.0</small>"]
  dark-matter["dark-matter<br/><small>v1.0.0</small>"]
  prism["prism<br/><small>v3.1.0</small>"]
  luminosity["luminosity<br/><small>v2.0.0</small>"]
  quasar["quasar<br/><small>v1.3.0</small>"]
  stream["stream<br/><small>v2.0.1</small>"]
  constellation["constellation<br/><small>v3.0.2</small>"]
  admin-ui-catalog["admin-ui-catalog<br/><small>v0.1.0</small>"]
  astral["astral<br/><small>v1.0.1</small>"]
  nebula["nebula<br/><small>v4.0.0</small>"]
  flux["flux<br/><small>v3.0.1</small>"]
  enterprise["enterprise<br/><small>v1.0.3</small>"]
  admin-ui-marketing["admin-ui-marketing<br/><small>v0.1.0</small>"]
  fortify["fortify<br/><small>v3.1.0</small>"]
  core["core<br/><small>v1.5.0</small>"]
  monolith["monolith<br/><small>v3.2.0</small>"]
  luminosity-cli["luminosity-cli<br/><small>v1.0.1</small>"]
  echo["echo<br/><small>v3.0.1</small>"]
  freeze["freeze<br/><small>v1.0.0-beta.6</small>"]
  admin-ui-announcement["admin-ui-announcement<br/><small>v0.1.0</small>"]
  create-gravito-app["create-gravito-app<br/><small>v1.0.5</small>"]
  support-chat-widget["support-chat-widget<br/><small>v0.2.0</small>"]
  monitor["monitor<br/><small>v3.0.1</small>"]
  mass["mass<br/><small>v3.0.1</small>"]
  ripple-client["ripple-client<br/><small>v1.1.0</small>"]
  plasma["plasma<br/><small>v1.0.0</small>"]
  admin-ui-dashboard["admin-ui-dashboard<br/><small>v0.1.0</small>"]
  admin-ui-ad["admin-ui-ad<br/><small>v0.1.0</small>"]

  %% 依賴關係
  admin-ui-support --> admin-sdk
  admin-ui-support --> admin-shell-react
  admin-ui-support --> ripple-client
  impulse --> core
  flare --> core
  launchpad-dashboard --> ripple-client
  admin-ui-access --> admin-sdk
  admin-ui-access --> admin-shell-react
  admin-ui-news --> admin-sdk
  admin-ui-news --> admin-shell-react
  beam --> photon
  site --> core
  site --> monolith
  site --> cosmos
  site --> constellation
  site --> photon
  radiance --> core
  luminosity-adapter-express --> luminosity
  luminosity-adapter-photon --> luminosity
  admin-ui-invoice --> admin-sdk
  admin-ui-invoice --> admin-shell-react
  launchpad --> enterprise
  launchpad --> ripple
  launchpad --> stasis
  launchpad --> core
  zenith --> atlas
  zenith --> photon
  zenith --> quasar
  zenith --> stream
  freeze-vue --> freeze
  freeze-react --> freeze
  pulse --> scaffold
  admin-ui-analytics --> admin-sdk
  admin-ui-analytics --> admin-shell-react
  admin-shell-react --> admin-sdk
  admin-ui-order --> admin-sdk
  admin-ui-order --> admin-shell-react
  stream --> atlas
  stream --> core
  constellation --> stream
  constellation --> photon
  admin-ui-catalog --> admin-sdk
  admin-ui-catalog --> admin-shell-react
  astral --> core
  astral --> impulse
  enterprise --> core
  admin-ui-marketing --> admin-sdk
  admin-ui-marketing --> admin-shell-react
  core --> photon
  monolith --> mass
  luminosity-cli --> luminosity
  admin-ui-announcement --> admin-sdk
  admin-ui-announcement --> admin-shell-react
  create-gravito-app --> pulse
  support-chat-widget --> ripple-client
  admin-ui-dashboard --> admin-sdk
  admin-ui-dashboard --> admin-shell-react
  admin-ui-ad --> admin-sdk
  admin-ui-ad --> admin-shell-react

  %% Peer 依賴
  impulse -.peer.-> photon
  flare -.peer.-> stream
  flare -.peer.-> signal
  flare -.peer.-> radiance
  signal -.peer.-> core
  signal -.peer.-> stream
  signal -.peer.-> prism
  orbit-cloudflare -.peer.-> core
  scaffold -.peer.-> core
  pulsar -.peer.-> core
  pulsar -.peer.-> plasma
  spectrum -.peer.-> core
  spectrum -.peer.-> photon
  beam -.peer.-> photon
  graphql -.peer.-> core
  forge -.peer.-> core
  forge -.peer.-> nebula
  forge -.peer.-> stream
  luminosity-adapter-photon -.peer.-> photon
  impulse-bridge -.peer.-> core
  impulse-bridge -.peer.-> impulse
  sentinel -.peer.-> core
  sentinel -.peer.-> photon
  horizon -.peer.-> core
  horizon -.peer.-> stasis
  pulse -.peer.-> core
  ripple -.peer.-> core
  stasis -.peer.-> core
  stasis -.peer.-> plasma
  ion -.peer.-> core
  ion -.peer.-> photon
  cosmos -.peer.-> core
  cosmos -.peer.-> photon
  prism -.peer.-> core
  prism -.peer.-> photon
  constellation -.peer.-> core
  nebula -.peer.-> core
  flux -.peer.-> core
  fortify -.peer.-> sentinel
  fortify -.peer.-> core
  fortify -.peer.-> photon
  fortify -.peer.-> signal
  monolith -.peer.-> core
  echo -.peer.-> core
  monitor -.peer.-> core
  monitor -.peer.-> photon
  mass -.peer.-> core

  %% 樣式
  classDef core fill:#ffd700,stroke:#333,stroke-width:3px
  classDef orbit fill:#4ecdc4,stroke:#333,stroke-width:2px
  classDef infrastructure fill:#ff6b6b,stroke:#333,stroke-width:2px
  class core core
```

### 圖例

- **實線箭頭** (`-->`)：必需依賴
- **虛線箭頭** (`-.peer.->`)：Peer 依賴
- **點線箭頭** (`-.optional.->`)：可選依賴
- **黃色節點**：Core（核心）
- **青色節點**：Orbit（軌道模組）
- **紅色節點**：Infrastructure（基礎設施）

## 🔑 關鍵套件（被依賴 >= 5 次）

| 套件 | 被依賴次數 | 說明 |
|------|-----------|------|
| `@gravito/core` | 32 | - |
| `@gravito/photon` | 15 | Gravito Photon HTTP engine (compat wrapper) |
| `@gravito/admin-sdk` | 12 | - |
| `@gravito/admin-shell-react` | 11 | - |
| `@gravito/stream` | 5 | Lightweight, high-performance queue system for Gravito framework. Supports multiple brokers (Database, Redis, Kafka, SQS) with zero runtime overhead. |

## 🏝️ 孤立套件（沒有被其他套件依賴）

| 套件 | 說明 |
|------|------|
| `@gravito/admin-ui-access` | - |
| `@gravito/admin-ui-ad` | - |
| `@gravito/admin-ui-analytics` | - |
| `@gravito/admin-ui-announcement` | - |
| `@gravito/admin-ui-catalog` | - |
| `@gravito/admin-ui-dashboard` | - |
| `@gravito/admin-ui-invoice` | - |
| `@gravito/admin-ui-marketing` | - |
| `@gravito/admin-ui-news` | - |
| `@gravito/admin-ui-order` | - |
| `@gravito/admin-ui-support` | - |
| `@gravito/astral` | Schema-driven OpenAPI generator for Gravito with Swagger UI support |
| `@gravito/beam` | Orbit Beam - Lightweight, type-safe RPC client for Gravito applications |
| `@gravito/create-gravito-app` | Scaffold a new Gravito project in seconds |
| `@gravito/dark-matter` | MongoDB client for Gravito - Bun native, Laravel-style API |
| `@gravito/echo` | Enterprise-grade webhook handling for Gravito. Secure receiving and reliable sending. |
| `@gravito/flare` | Lightweight, high-performance notification system for Gravito framework. Supports multiple channels (mail, database, broadcast, slack, sms) with zero runtime overhead. |
| `@gravito/flux` | Platform-agnostic workflow engine for Gravito |
| `@gravito/forge` | File Processing Orbit for Gravito - Video and Image Processing with Real-time Status Tracking |
| `@gravito/fortify` | End-to-End Authentication Workflows for Gravito (Login, Register, Password Reset, Email Verification) |
| `@gravito/freeze-react` | React adapter for @gravito/freeze SSG module |
| `@gravito/freeze-vue` | Vue adapter for @gravito/freeze SSG module |
| `@gravito/graphql` | Zero-config GraphQL Orbit for Gravito, powered by Yoga |
| `@gravito/horizon` | Distributed task scheduler for Gravito framework |
| `@gravito/impulse-bridge` | Validation bridge between Impulse and Frontend (Inertia/Prism) |
| `@gravito/ion` | Inertia.js adapter for Gravito |
| `@gravito/launchpad` | Container lifecycle management system for flash deployments |
| `@gravito/launchpad-dashboard` | - |
| `@gravito/luminosity-adapter-express` | Express/Koa adapter for Gravito SmartMap Engine |
| `@gravito/luminosity-adapter-photon` | Luminosity adapter for Photon-based environments |
| `@gravito/luminosity-cli` | CLI tool for Gravito SmartMap Engine |
| `@gravito/monitor` | Observability module for Gravito - Health checks, Metrics, and Tracing |
| `@gravito/orbit-cloudflare` | Cloudflare Workers bindings Orbit for Gravito Core |
| `@gravito/pulsar` | Session + CSRF orbit for Gravito (Laravel-style) |
| `@gravito/site` | - |
| `@gravito/spectrum` | Debug Dashboard and Observability UI for Gravito framework. |
| `@gravito/support-chat-widget` | - |
| `@gravito/zenith` | Gravito Zenith: Zero-config control plane for Gravito Flux & Stream |

> 這些套件通常是應用層或最終產物，不被其他套件依賴。

## 📦 完整套件列表

| 套件 | 版本 | 必需依賴 | Peer 依賴 | 可選依賴 | 被依賴次數 |
|------|------|---------|----------|---------|----------|
| `@gravito/admin-sdk` | v0.1.0 | 0 | 0 | 0 | 12 |
| `@gravito/admin-shell-react` | v0.1.0 | 1 | 0 | 0 | 11 |
| `@gravito/admin-ui-access` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-ad` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-analytics` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-announcement` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-catalog` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-dashboard` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-invoice` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-marketing` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-news` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-order` | v0.1.0 | 2 | 0 | 0 | 0 |
| `@gravito/admin-ui-support` | v0.1.0 | 3 | 0 | 0 | 0 |
| `@gravito/astral` | v1.0.1 | 2 | 0 | 0 | 0 |
| `@gravito/atlas` | v1.4.0 | 0 | 0 | 0 | 2 |
| `@gravito/beam` | v1.0.0-beta.1 | 1 | 1 | 0 | 0 |
| `@gravito/constellation` | v3.0.2 | 2 | 1 | 0 | 1 |
| `@gravito/core` | v1.5.0 | 1 | 0 | 0 | 32 |
| `@gravito/cosmos` | v3.1.0 | 0 | 2 | 0 | 1 |
| `@gravito/create-gravito-app` | v1.0.5 | 1 | 0 | 0 | 0 |
| `@gravito/dark-matter` | v1.0.0 | 0 | 0 | 0 | 0 |
| `@gravito/echo` | v3.0.1 | 0 | 1 | 0 | 0 |
| `@gravito/enterprise` | v1.0.3 | 1 | 0 | 0 | 1 |
| `@gravito/flare` | v3.3.0 | 1 | 3 | 0 | 0 |
| `@gravito/flux` | v3.0.1 | 0 | 1 | 0 | 0 |
| `@gravito/forge` | v3.0.2 | 0 | 3 | 0 | 0 |
| `@gravito/fortify` | v3.1.0 | 0 | 4 | 0 | 0 |
| `@gravito/freeze` | v1.0.0-beta.6 | 0 | 0 | 0 | 2 |
| `@gravito/freeze-react` | v1.0.0-beta.6 | 1 | 0 | 0 | 0 |
| `@gravito/freeze-vue` | v1.0.0-beta.6 | 1 | 0 | 0 | 0 |
| `@gravito/graphql` | v1.1.0 | 0 | 1 | 0 | 0 |
| `@gravito/horizon` | v3.0.1 | 0 | 2 | 0 | 0 |
| `@gravito/impulse` | v1.1.0 | 1 | 1 | 0 | 2 |
| `@gravito/impulse-bridge` | v2.0.0 | 0 | 2 | 0 | 0 |
| `@gravito/ion` | v3.0.1 | 0 | 2 | 0 | 0 |
| `@gravito/launchpad` | v1.2.2 | 4 | 0 | 0 | 0 |
| `@gravito/launchpad-dashboard` | v0.1.0 | 1 | 0 | 0 | 0 |
| `@gravito/luminosity` | v2.0.0 | 0 | 0 | 0 | 3 |
| `@gravito/luminosity-adapter-express` | v1.0.1 | 1 | 0 | 0 | 0 |
| `@gravito/luminosity-adapter-photon` | v1.0.1 | 1 | 1 | 0 | 0 |
| `@gravito/luminosity-cli` | v1.0.1 | 1 | 0 | 0 | 0 |
| `@gravito/mass` | v3.0.1 | 0 | 1 | 0 | 1 |
| `@gravito/monitor` | v3.0.1 | 0 | 2 | 0 | 0 |
| `@gravito/monolith` | v3.2.0 | 1 | 1 | 0 | 1 |
| `@gravito/nebula` | v4.0.0 | 0 | 1 | 0 | 1 |
| `@gravito/orbit-cloudflare` | v1.0.1 | 0 | 1 | 0 | 0 |
| `@gravito/photon` | v1.0.0-beta.1 | 0 | 0 | 0 | 15 |
| `@gravito/plasma` | v1.0.0 | 0 | 0 | 0 | 2 |
| `@gravito/prism` | v3.1.0 | 0 | 2 | 0 | 1 |
| `@gravito/pulsar` | v3.0.1 | 0 | 2 | 0 | 0 |
| `@gravito/pulse` | v3.0.1 | 1 | 1 | 0 | 1 |
| `@gravito/quasar` | v1.3.0 | 0 | 0 | 0 | 1 |
| `@gravito/radiance` | v1.0.3 | 1 | 0 | 0 | 1 |
| `@gravito/ripple` | v3.4.0 | 0 | 1 | 0 | 1 |
| `@gravito/ripple-client` | v1.1.0 | 0 | 0 | 0 | 3 |
| `@gravito/scaffold` | v3.0.1 | 0 | 1 | 0 | 1 |
| `@gravito/sentinel` | v4.0.0 | 0 | 2 | 0 | 1 |
| `@gravito/signal` | v3.0.3 | 0 | 3 | 0 | 2 |
| `@gravito/site` | v1.0.0-beta.1 | 5 | 0 | 0 | 0 |
| `@gravito/spectrum` | v3.0.1 | 0 | 2 | 0 | 0 |
| `@gravito/stasis` | v3.0.1 | 0 | 2 | 0 | 2 |
| `@gravito/stream` | v2.0.1 | 2 | 0 | 0 | 5 |
| `@gravito/support-chat-widget` | v0.2.0 | 1 | 0 | 0 | 0 |
| `@gravito/zenith` | v1.1.2 | 4 | 0 | 0 | 0 |

## 🌍 主要外部依賴

> 以下是 Gravito 生態系統依賴的主要外部套件。

| 套件 | 用途 |
|------|------|
| `bee-queue` | - |
| `better-sqlite3` | - |
| `bullmq` | - |
| `cac` | - |
| `cborg` | - |
| `clsx` | - |
| `commander` | - |
| `cron-parser` | - |
| `dataloader` | - |
| `date-fns` | - |
| `framer-motion` | - |
| `giget` | - |
| `graphql` | - |
| `graphql-complexity-validation` | - |
| `graphql-ws` | - |
| `graphql-yoga` | - |
| `gray-matter` | - |
| `handlebars` | - |
| `hono` | - |
| `ioredis` | - |

*... 以及其他 26 個外部依賴*

## 📖 依賴類型說明

### 必需依賴 (dependencies)
套件正常運作所**必須**安裝的依賴。缺少這些依賴會導致套件無法使用。

### Peer 依賴 (peerDependencies)
需要由使用者專案提供的依賴。通常是為了確保整個專案使用相同版本的共享依賴（如 `@gravito/core`）。

### 可選依賴 (optionalDependencies)
提供額外功能但非必需的依賴。如果安裝失敗，套件仍可正常運作（部分功能可能不可用）。

## 🔗 相關文件



- [整合指南](../spec/GUIDE_2.0_INTEGRATION.md)

---

*此文件由 `scripts/generate-dependency-graph.ts` 自動生成*
*最後更新：2026-01-28T15:21:16.304Z*
