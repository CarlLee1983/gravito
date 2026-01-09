---
title: Profile / Preset 架構提案
description: 為 `gravito create` 引入 profile 概念，打造可擴展的黃金路線。
---

# Profile / Preset 概念

目前 `bunx gravito create my-gravito-app`（CLI `gravito create`）會互動選 template（`basic` / `inertia-react` / `static-site`）後直接複製 `templates/...`，中的 `Scaffold` 只負責呈現架構。若要打造「同一個 CLI、同一套模板，但提供三種不同預設（core/scale/enterprise）」的黃金路線，建議在 Scaffold 前端整合一層 **Profile/ Preset**。

---

## Profile 定位總覽

| Profile | 路線定位 | 主要差異 |
| --- | --- | --- |
| `core` | local-first、極簡啟動 | SQLite/Mem、內建 cache/queue、最少依賴（保留「bun create」的速度） |
| `scale` | stateless 擴展 | 預設外部 cache/queue/storage 接口（Redis/MinIO/Message Queue）、共享 session、cloud-ready |
| `enterprise` | 治理/安全 | 加入 observability/審計、tenant 分離、SSO/Auth hooks，更嚴格的 middleware |

Profile 只控制預設組合（依賴、config、middleware、env、Hooks），不會重新發一套 template。

---

## 組件清單

### Core（最小必裝）

**目標**：零摩擦啟動，適合 local-first 開發與小型專案。

| 類別 | 組件 | 說明 |
|------|------|------|
| **必裝** | `@gravito/core` | 框架核心 |
| | `@gravito/photon` | 路由與 HTTP 層 |
| | `@gravito/constellation` | 依賴注入容器 |
| **可選** | `@gravito/atlas` | 資料庫 ORM |
| | `@gravito/stasis` | 快取抽象層 |
| | `@gravito/nebula` | 佇列系統 |
| | `@gravito/sentinel` | 認證/授權 |

---

### Scale（天生可擴展）

**目標**：為 stateless 部署設計，支援水平擴展。

| 類別 | 組件 | 說明 |
|------|------|------|
| **繼承 Core** | 所有 Core 必裝組件 | — |
| **預設啟用** | `@gravito/atlas` | 資料庫 ORM |
| | `@gravito/stasis` | 快取抽象層 |
| | `@gravito/stream` | 事件串流 |
| | `@gravito/nebula` | 佇列系統 |
| **可選** | `@gravito/ripple` | WebSocket 支援 |
| | `@gravito/echo` | 廣播系統 |
| | `@gravito/beam` | 檔案上傳處理 |

**必備配置**：
- Rate Limiting
- Backpressure 機制
- Stateless Contract（Session 外部化）

---

### Enterprise（治理層）

**目標**：符合企業級治理、安全與合規需求。

| 類別 | 組件 | 說明 |
|------|------|------|
| **繼承 Scale** | 所有 Scale 組件 | — |
| **必裝** | `@gravito/monitor` | 可觀測性（Metrics/Tracing） |
| | `@gravito/sentinel` | 認證/授權（強化版） |
| | `@gravito/fortify` | 安全強化層 |

**必備能力**：
- **Tenant Resolution**：多租戶識別與隔離
- **Audit Sink**：操作審計日誌
- **Config Policy Guardrails**：設定政策護欄

**預留 Hooks**（不綁供應商）：
- SSO Adapter（SAML/OIDC）
- SCIM Provisioning Hook

---

## Driver 預設對照表

| Driver | Core | Scale | Enterprise |
|--------|------|-------|------------|
| **Database** | SQLite | PostgreSQL | PostgreSQL |
| **Cache** | Memory | Redis | Redis |
| **Queue** | Off (Sync) | Redis | Redis |
| **Storage** | Local | S3 / R2 | S3 / R2 |
| **Session** | File | Redis | Redis |
| **Log** | File | Stdout (JSON) | Stdout + Sink |

---

## Template 管理策略

採用混合策略以平衡維護成本與彈性：

| 差異類型 | 策略 | 範例 |
|----------|------|------|
| **小差異** | Conditional | `.env` 變數、config 預設值、middleware 開關 |
| **大差異** | Overlay | 整個 config 資料夾、額外的 provider 檔案 |

```
templates/
├── basic/
│   ├── base/                 # 共用基底
│   ├── overlays/
│   │   ├── core/             # Core 覆蓋層
│   │   ├── scale/            # Scale 覆蓋層
│   │   └── enterprise/       # Enterprise 覆蓋層
```

---

## 實作思路

1. **CLI 擴展**：追加 `--profile` 旗標（default `core`），並在互動流程、文件提示中說明三條黃金路線。

2. **ScaffoldOptions 擴展**：將 profile 映射成 `ScaffoldOptions.context.profile`，讓 `BaseGenerator` 與模板可依 profile 決定包含哪些檔案/設定。

3. **Generator 分層**：
   - `BaseGenerator` 處理共用邏輯
   - Profile Resolver 決定 overlay 與 conditional 邏輯
   - File Merger 處理最終輸出

4. **文件同步**：更新快速上手、CLI guide 介紹 profile 差異與建議使用情境。

---

## 升級路徑（建議）

| 路徑 | 輔助工具 |
|------|----------|
| `core → scale` | `gravito upgrade --to scale` |
| `scale → enterprise` | `gravito upgrade --to enterprise` |

升級工具負責：
- 新增缺少的依賴
- 產生新的 config 檔案
- 更新 `.env.example`
- 輸出 Migration Checklist

---

## Feature Add-on 系統（`--with`）

### 設計原則

| 概念 | 說明 |
|------|------|
| **Profile** | 官方驗證的基底（Golden Path） |
| **With** | 官方支援的增量能力（Feature Packs） |

> [!IMPORTANT]
> 不允許任意組裝所有 driver，避免退化成「工具箱」模式。

### CLI 規格

**建專案時**：
```bash
bunx gravito create my-app --profile core --with redis,queue,otel
```

**建完後**：
```bash
gravito add redis
gravito add queue --driver redis
```

### 合併規則

1. **Profile 先套用**
2. **With 只能做增量**：
   - ✅ 新增依賴
   - ✅ 新增 env keys
   - ✅ 新增 config sections
   - ❌ 不能覆蓋 profile 核心決策（除非 `--override` 顯性宣告）

### 驗收標準

`--profile core --with redis` 的效果：

| 項目 | 變更 |
|------|------|
| Cache Driver | → `redis`（或新增 redis 選項） |
| ENV | + `REDIS_URL` |
| 依賴 | + `ioredis` |
| DB/Queue/Storage | **不受影響** |

---

## Cloud Detection（環境偵測）

### 設計原則

> [!WARNING]
> 只做「建議」，不自動選擇。自動推斷會降低使用者信任度，企業環境尤其忌諱。

### 可偵測訊號（低風險）

| 訊號 | 偵測方式 |
|------|----------|
| CI 環境 | `CI=true` 環境變數 |
| Docker | `/.dockerenv` 或 cgroup |
| AWS/ECS/EKS | `AWS_*` 環境變數 |
| GCP | `GOOGLE_CLOUD_*` 環境變數 |
| Azure | `AZURE_*` 環境變數 |
| Redis 可用 | `REDIS_URL` 存在 |
| 資源配置 | CPU/Memory 範圍（僅供參考） |

### CLI 行為

**互動模式顯示**：
```
偵測到：Docker / CI
建議：Scale Profile（stateless + readiness probes）
你要採用嗎？(預設仍是 core) [y/N]
```

**旗標支援**：
- `--recommend`：只列出建議
- `--apply-recommended`：使用者明確同意才套用

---

## Profile Lock 機制

### 設計原則

> [!NOTE]
> Lock 的目的不是「限制」，是「可重現 + 防衝突」。

### A) Resolution Lock（必做）

產生 `gravito.lock.json`，記錄：

```jsonc
{
  "profile": {
    "name": "core",
    "version": "1.0.0"
  },
  "features": ["redis", "queue"],
  "drivers": {
    "database": "sqlite",
    "cache": "redis",
    "queue": "redis",
    "storage": "local",
    "session": "file"
  },
  "manifest": {
    "template": "basic",
    "version": "1.2.0"
  },
  "createdAt": "2025-12-29T22:40:00Z"
}
```

**用途**：
- 團隊成員 `create` 結果一致
- CI 可重建
- `gravito upgrade` 有依據

### B) Policy Lock（Enterprise 專屬 / 可選）

在 Enterprise profile 啟用治理規則：

| 政策 | 說明 |
|------|------|
| 禁止不安全設定 | 例如 prod 用 memory cache |
| 禁止衝突組合 | 例如 queue=memory 但 profile=enterprise |
| 強制記錄理由 | 要改必須 `--force` + 理由（寫進 lock） |

### 衝突檢查規則（最小集合）

| 情況 | 行為 |
|------|------|
| 同時啟用互斥 driver（cache=redis + cache=memory） | **Error** |
| Profile 要求 externalized state，但選 local only | **Warn/Error**（依 profile） |
| Enterprise 中禁用特定 driver | **Error**（除非 `--force`） |

### CLI 行為

| 命令 | 行為 |
|------|------|
| `gravito add redis` | 更新 lock |
| `gravito dev` | 驗證 lock（不符就提示） |
| `gravito doctor` | 檢查 lock 與環境一致性 |

---

## 實作工作事項

### Phase 1：基礎建設（P0）

- [ ] **CLI 擴展**
  - [ ] 新增 `--profile` 旗標到 `create-gravito-app`
  - [ ] 新增 `--with` 旗標（Feature Add-on）
  - [ ] 更新互動式選單，顯示 profile 選項與說明
  - [ ] 加入 profile 驗證邏輯

- [ ] **ScaffoldOptions 擴展**
  - [ ] 擴展 `ScaffoldOptions` 介面，加入 `profile` 與 `features` 欄位
  - [ ] 實作 Profile Resolver
  - [ ] 實作 Feature Merger（增量邏輯）

- [ ] **Template Overlay 機制**
  - [ ] 建立 `overlays/` 目錄結構
  - [ ] 實作 File Merger 邏輯
  - [ ] 建立 Core profile overlay（最小集合）

- [ ] **Lock 機制**
  - [ ] 設計 `gravito.lock.json` schema
  - [ ] 實作 Lock Generator
  - [ ] 實作 Lock Validator

### Phase 2：Profile 實作（P1）

- [ ] **Core Profile**（基線）
  - [ ] 設定 SQLite / Memory Cache / Local Storage 預設
  - [ ] 精簡 middleware stack
  - [ ] 最小化 `package.json` 依賴

- [ ] **Scale Profile**
  - [ ] 建立 Scale overlay
  - [ ] 預設 PostgreSQL / Redis / S3 driver
  - [ ] 加入 Rate Limit / Backpressure config
  - [ ] Stateless session 設定

- [ ] **Enterprise Profile**
  - [ ] 建立 Enterprise overlay
  - [ ] 加入 Monitor / Sentinel / Fortify 整合
  - [ ] 建立 Tenant Resolution hooks
  - [ ] 建立 Audit Sink 接口
  - [ ] SSO/SCIM adapter stubs
  - [ ] 實作 Policy Lock

- [ ] **Feature Packs**
  - [ ] `redis` feature pack
  - [ ] `queue` feature pack
  - [ ] `otel` feature pack

### Phase 3：輔助工具（P2）

- [ ] **Cloud Detection**
  - [ ] 實作環境偵測邏輯
  - [ ] 實作 `--recommend` / `--apply-recommended` 旗標

- [ ] **升級 CLI**
  - [ ] 實作 `gravito upgrade --to <profile>` 命令
  - [ ] 產生 Migration Checklist

- [ ] **維護工具**
  - [ ] 實作 `gravito add <feature>` 命令
  - [ ] 實作 `gravito doctor` 命令
  - [ ] 實作 Lock 驗證（`gravito dev` 時自動檢查）

### Phase 4：文件（P3）

- [ ] **文件更新**
  - [ ] 更新 Quick Start Guide
  - [ ] 更新 CLI Reference
  - [ ] 撰寫 Profile 比較指南
  - [ ] 撰寫升級指南
  - [ ] 撰寫 Feature Pack 文件

---

待提案確認後再依 Phase 拆分實作任務與測試驗證。
