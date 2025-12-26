---
title: Laravel 12 對齊項目與模組對應規劃
---

# Laravel 12 對齊項目與模組對應規劃

本文件用於盤點 Laravel 12 官網左側導覽的文件項目，並對應到 Gravito 現有模組與文件，標記缺口以便後續補齊或新增模組。

另有既定的左側導覽架構提案可參考：`docs/zh-TW/DOCS_NAV_PROPOSAL.md`。

## 對應原則

- 以 Laravel 12 導覽分類為主，逐項建立對應或缺口標記。
- 先對應現有文件，後續再拆分成「單一主題一頁」。
- 缺口一律標記「規劃新增」或「規劃補文件」。

## Getting Started

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Introduction / Overview | `docs/zh-TW/guide/getting-started.md` | 需補完整產品定位與範例導覽 |
| Installation | `docs/zh-TW/guide/getting-started.md` | 建議拆分獨立頁 |
| Configuration | `docs/zh-TW/guide/core-concepts.md` | 需補 `gravito.config` 章節 |
| Directory Structure | `docs/zh-TW/guide/project-structure.md` | 可補建議目錄範例 |
| Frontend | `docs/zh-TW/guide/inertia-react.md`、`docs/zh-TW/guide/inertia-vue.md` | 可補非 Inertia 的前端選項 |
| Starter Kits | 規劃新增 | 規劃提供官方起手模板 |
| Deployment | `docs/zh-TW/guide/deployment.md` | 可補 Docker 與平台指引 |

## Architecture Concepts

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Request Lifecycle | `docs/zh-TW/guide/core-concepts.md` | 需補完整請求流程圖 |
| Service Container | 規劃新增 | 規劃 DI 與容器章節 |
| Service Providers | 規劃新增 | 對應模組啟動流程 |
| Facades | 規劃新增 | 對應 Context/Service 取用方式 |

## The Basics

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Routing | `docs/zh-TW/guide/routing.md` | 可補進階路由模式 |
| Middleware | `docs/zh-TW/guide/middleware.md` | 可補全域/群組設計 |
| CSRF Protection | `docs/zh-TW/api/pulsar.md` | 建議補成獨立指南 |
| Controllers | `docs/zh-TW/guide/controllers.md` | 可補 Resource 風格 |
| Requests | `docs/zh-TW/guide/requests.md` | 可補表單解析與驗證 |
| Responses | `docs/zh-TW/guide/responses.md` | 可補檔案回應 |
| Views | `docs/zh-TW/guide/template-engine.md` | 對應 Template Engine |
| Blade Templates | 規劃新增 | 可補模板語法對照或替代方案 |
| URLs | 規劃新增 | 可補 URL 生成與簽名 |
| Session | `docs/zh-TW/api/pulsar.md`、`docs/zh-TW/guide/orbit-session-starter.md` | 建議補 Session 基礎 |
| Validation | `docs/zh-TW/guide/validation.md` | 可補 Form Request 風格 |
| Error Handling | `docs/zh-TW/guide/errors.md` | 可補例外分級 |
| Logging | `docs/zh-TW/guide/logging.md` | 可補輸出格式與整合 |
| Asset Bundling (Vite) | 規劃新增 | 對應前端打包策略 |

## Digging Deeper

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Artisan Console | 規劃新增 | 規劃 CLI 與指令系統 |
| Broadcasting | 規劃新增 | 規劃事件推播 |
| Cache | `docs/zh-TW/api/stasis.md` | 可補 Cache 驅動 |
| Collections | 規劃新增 | 對應通用集合工具 |
| Contracts | 規劃新增 | 對應介面與擴充協議 |
| Events | `docs/zh-TW/guide/core-concepts.md` | 可拆成事件專頁 |
| Filesystem | `docs/zh-TW/api/nebula.md` | 可補雲端儲存 |
| Helpers | 規劃新增 | 對應共用工具函式 |
| HTTP Client | 規劃新增 | 規劃內建 HTTP 用戶端 |
| Localization | `docs/zh-TW/guide/i18n-guide.md` | 可補語系檔結構 |
| Mail | 規劃新增 | 規劃郵件模組 |
| Notifications | 規劃新增 | 規劃通知模組 |
| Package Development | `docs/zh-TW/guide/plugin-development.md` | 可補擴充規範 |
| Process | 規劃新增 | 規劃程序管理 |
| Queues | 規劃新增 | 規劃佇列與 Jobs |
| Rate Limiting | `docs/zh-TW/api/stasis.md` | 可補策略與中介層 |
| Strings | 規劃新增 | 規劃字串工具 |
| Task Scheduling | 規劃新增 | 規劃排程器 |

## Security

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Authentication | `docs/zh-TW/guide/authentication.md`、`docs/zh-TW/api/sentinel.md` | 可補完整流程範例 |
| Authorization | `docs/zh-TW/api/sentinel.md`、`docs/zh-TW/guide/security.md` | 建議補 Policy 風格 |
| Email Verification | `docs/zh-TW/api/sentinel.md` | 需補完整實作流程 |
| Encryption | 規劃新增 | 規劃加密服務 |
| Hashing | `docs/zh-TW/api/sentinel.md` | 可補 driver 比較 |
| Password Reset | `docs/zh-TW/api/sentinel.md` | 需補實作指南 |
| Sanctum | 規劃新增 | 規劃 Token 驗證模組 |

## Database

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Getting Started | `docs/zh-TW/api/atlas/getting-started.md` | 可補多資料庫 |
| Query Builder | `docs/zh-TW/api/atlas/dbservice.md` | 可補進階查詢 |
| Pagination | `docs/zh-TW/guide/orm-usage.md` | 建議獨立專頁 |
| Migrations | `docs/zh-TW/api/atlas/migrations-seeding.md` | - |
| Seeding | `docs/zh-TW/api/atlas/migrations-seeding.md` | - |
| Redis | 規劃新增 | 規劃快取/佇列整合 |

## Eloquent ORM

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Getting Started | `docs/zh-TW/guide/orm-usage.md`、`docs/zh-TW/api/atlas/models.md` | - |
| Relationships | `docs/zh-TW/api/atlas/relations.md` | - |
| Collections | 規劃新增 | 規劃模型集合 |
| Mutators / Casts | 規劃新增 | 規劃欄位轉換 |
| API Resources | 規劃新增 | 規劃序列化層 |
| Serialization | 規劃新增 | 規劃模型輸出格式 |

## Testing

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Getting Started | `docs/zh-TW/guide/testing.md` | - |
| HTTP Tests | `docs/zh-TW/guide/testing.md` | 建議拆分子章節 |
| Console Tests | 規劃新增 | 規劃 CLI 測試 |
| Database Testing | 規劃新增 | 規劃測試資料庫 |
| Mocking | 規劃新增 | 規劃測試工具 |
| Authentication | 規劃新增 | 規劃測試守衛 |
| Browser Tests | 規劃新增 | 規劃 E2E |

## Packages

| Laravel 12 項目 | Gravito 對應 | 備註 |
| --- | --- | --- |
| Package Development | `docs/zh-TW/guide/plugin-development.md` | 可補發布流程 |

