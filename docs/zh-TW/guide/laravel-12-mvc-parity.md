---
title: Laravel 12 MVC 對齊程度
---

# Laravel 12 MVC 對齊程度

本頁用 Laravel 12 的「完整 MVC 全家桶」做參考，對照 Gravito（core + Orbits）目前已具備的能力、部分具備的能力，以及仍缺少的能力，方便規劃後續補齊方向。

## 圖例

| 狀態 | 意義 |
|------|------|
| 已實作 | 目前可用，能支援常見正式環境流程 |
| 部分 | 能解決常見情境，但還缺少 Laravel 等級的重要能力 |
| 缺少 | 尚未提供（需要設計與實作） |

## 概念對照（Laravel → Gravito）

| Laravel | Gravito |
|--------|---------|
| Service Container、Service Providers | `gravito-core`（`Container`、`ServiceProvider`） |
| HTTP Kernel / Middleware | `gravito-core` Router + Hono middleware；以及 Orbit 提供的 middleware（Auth/Session/…） |
| Exception Handler | `gravito-core` `PlanetCore` 的 error + notFound handler 與 hooks |
| Events / Listeners | `gravito-core` `EventManager` / `Listener` |
| Validation（FormRequest） | `@gravito/orbit-request`（`FormRequest`）+ `@gravito/validator` |
| Views / Blade | `@gravito/orbit-view`（TSX Template Engine）/ `@gravito/orbit-inertia`（Inertia 橋接） |
| Database / Eloquent | `@gravito/orbit-db`（基於 Drizzle 的 DB layer） |
| Auth / Gate / Policies | `@gravito/orbit-auth`（guards + `Gate`） |
| Cache | `@gravito/orbit-cache` |
| Queue / Jobs | `@gravito/orbit-queue` |
| Scheduler | `@gravito/orbit-scheduler` |
| Mail | `@gravito/orbit-mail` |
| Notifications | `@gravito/orbit-notifications` |
| Broadcasting | `@gravito/orbit-broadcasting` |
| Storage | `@gravito/orbit-storage` |
| i18n | `@gravito/orbit-i18n` |

## 功能矩陣

### 核心（啟動、DI、設定）

| 功能 | 狀態 | 說明 |
|------|------|------|
| IoC Container | 已實作 | 透過 `Container` 綁定/解析服務 |
| Service Providers | 已實作 | `register()` + optional `boot()` |
| 設定與環境變數 | 已實作 | `ConfigManager`（Bun env + runtime config） |
| Facades / 靜態代理 | 缺少 | TS 生態需要一致的 DX 設計 |
| Feature flags /「設定快取」 | 缺少 | 尚無標準化的 build-time/runtime caching pipeline |

### HTTP 層（路由 / Middleware）

| 功能 | 狀態 | 說明 |
|------|------|------|
| 路由 + 群組 + middleware 疊加 | 已實作 | Laravel-like fluent API（基於 Hono） |
| Controller 路由 | 已實作 | `[ControllerClass, 'method']` |
| 路由層級的 FormRequest 驗證 | 已實作 | `Router` 以 duck-typing 整合 |
| 命名路由 + URL 產生器 | 缺少 | 尚無 `route('name', params)` 等價能力 |
| Route model binding | 缺少 | 需要 params → model 的綁定/解析層 |
| Resource routes | 缺少 | 尚無 `Route::resource()` 等價能力 |
| Rate limiting / 節流 | 缺少 | 尚無第一級 limiter middleware/driver |

### Session / CSRF / Cookie

| 功能 | 狀態 | 說明 |
|------|------|------|
| Session | 已實作 | `@gravito/orbit-session` |
| CSRF 防護 | 已實作 | `@gravito/orbit-session` |
| Flash 資料模式 | 部分 | 驗證流程可支援；仍需標準 API 介面 |
| Cookie 加密/簽章 | 缺少 | 需要 crypto/key 管理設計 |

### 驗證（Validation）

| 功能 | 狀態 | 說明 |
|------|------|------|
| FormRequest 風格驗證 | 已實作 | 支援 Zod + Valibot |
| FormRequest 內建授權檢查 | 已實作 | 會回傳 403 或透過 middleware helper 丟出 `AuthorizationException` |
| 自訂訊息與 i18n 擴充點 | 部分 | Message provider 已具備；仍需更完整的整合文件與範例 |
| Laravel rule 生態（Rules） | 缺少 | 需要共用 rule contract 與 registry |

### Views / 前端整合

| 功能 | 狀態 | 說明 |
|------|------|------|
| SSR HTML entry | 已實作 | 透過 Orbit View / Core 的 app shell render |
| SPA 橋接（Inertia） | 已實作 | `@gravito/orbit-inertia` |
| Blade 相容模板 | 缺少 | Gravito 使用 TSX templates，而非 Blade |
| 資產管線（asset pipeline）慣例 | 部分 | 已有 templates；慣例仍在演進 |

### 資料庫 / ORM

| 功能 | 狀態 | 說明 |
|------|------|------|
| Migrations（apply/status/fresh） | 部分 | CLI 已有；driver 策略仍在成熟中 |
| Seeder 執行 | 部分 | Runner 已有；scaffolding/工作流程需要更完整 |
| Active Record 風格 Model | 部分 | `Model` 已有；功能面小於 Eloquent |
| Relations | 部分 | 常見關聯已支援；與 Eloquent 的完整度仍有差距 |
| Model factories | 缺少 | 尚無標準化 factory 系統 |
| Soft deletes | 缺少 | 尚無 deleted-at 模式 |
| Polymorphic relations | 缺少 | 需要 ORM 層設計 |
| Pagination helpers | 缺少 | 尚無標準 paginator contract |

### 認證 / 授權

| 功能 | 狀態 | 說明 |
|------|------|------|
| Auth guards（session/jwt/token） | 已實作 | `@gravito/orbit-auth` |
| Auth middleware（`auth`、`guest`） | 已實作 | |
| Gates / abilities | 已實作 | `Gate.define()` + `authorize()` |
| Policies | 部分 | 支援手動 mapping；尚無自動 discovery/scaffolding |
| 密碼重設 / 信箱驗證 | 缺少 | 需要 mail + token + persistence workflow |
| 密碼雜湊（bcrypt/argon）服務 | 缺少 | 需要標準 hashing provider |

### 佇列 / 排程

| 功能 | 狀態 | 說明 |
|------|------|------|
| Jobs + workers | 已實作 | `@gravito/orbit-queue` 的 multi-driver 設計 |
| 重試/backoff/timeout 慣例 | 部分 | 有部分概念；需要標準化 API + 文件 |
| Scheduler | 已實作 | `@gravito/orbit-scheduler` |
| 佇列儀表板（Horizon-like） | 缺少 | 尚無監控 UI |

### Mail / Notifications / Broadcasting

| 功能 | 狀態 | 說明 |
|------|------|------|
| Mail | 已實作 | `@gravito/orbit-mail` |
| Notifications | 已實作 | `@gravito/orbit-notifications` |
| Broadcasting | 已實作 | `@gravito/orbit-broadcasting` |
| 多 channel 生態（Slack/SMS/WebPush/…） | 部分 | 需要更多 driver + contracts |

### Cache / Storage / i18n

| 功能 | 狀態 | 說明 |
|------|------|------|
| Cache | 已實作 | `@gravito/orbit-cache` |
| Storage | 已實作 | `@gravito/orbit-storage` |
| 多語系（i18n） | 已實作 | `@gravito/orbit-i18n` |

### 可觀測性（Observability）

| 功能 | 狀態 | 說明 |
|------|------|------|
| 結構化日誌 | 已實作 | Core `Logger` |
| 例外回報 hooks | 已實作 | `error:*` 與 `processError:*` hooks |
| Tracing / metrics / health checks | 缺少 | 尚無內建 OpenTelemetry/metrics/health 模組 |

### 測試 / 開發體驗

| 功能 | 狀態 | 說明 |
|------|------|------|
| CLI（Artisan-like） | 部分 | `route:list`、`tinker`、migrations；scaffolding 較少 |
| App skeleton/templates | 已實作 | `templates/*` |
| HTTP 測試 helper | 缺少 | 尚無 Laravel `TestResponse` 類似工具 |
| Mail/Notification fakes | 缺少 | 需要 test doubles + contracts |

## Roadmap 建議（往 Laravel 風格完整度前進）

### P0（先解決常見正式環境需求）

- 命名路由 + URL 產生器。
- Rate limiting middleware + driver contract。
- Cookie 簽章/加密 primitives（含金鑰管理與輪替策略）。
- 強化 DB 工作流程：seeder scaffolding + 一致的 migration workflow。

### P1（補齊 Eloquent/Laravel 的常用體驗）

- Resource routes、route model binding、route caching 策略。
- Pagination contract + helpers。
- Soft deletes + model casts / accessors 慣例。
- Auth hashing + 密碼重設/信箱驗證流程。

### P2（生態與可觀測性）

- 佇列儀表板 + job 可觀測性。
- Tracing/metrics/health-check Orbit（OpenTelemetry-ready）。
- 測試 fakes（mail/notifications/queue）+ HTTP 測試工具。
