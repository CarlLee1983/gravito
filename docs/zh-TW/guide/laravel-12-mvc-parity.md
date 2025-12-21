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
| Validation（FormRequest） | `@gravito/orbit-request`（`FormRequest`）+ `@gravito/mass` |
| Views / Blade | `@gravito/orbit-view`（TSX 樣板引擎）/ `@gravito/orbit-inertia`（Inertia 橋接） |
| Database / Eloquent | `@gravito/orbit-db`（基於 Drizzle 的 DB layer） |
| Auth / Gate / Policies | `@gravito/orbit-auth`（guards + `Gate`） |
| Cache | `@gravito/stasis` |
| Queue / Jobs | `@gravito/orbit-queue` |
| Scheduler | `@gravito/orbit-scheduler` |
| Mail | `@gravito/orbit-mail` |
| Notifications | `@gravito/orbit-notifications` |
| Broadcasting | `@gravito/orbit-broadcasting` |
| Storage | `@gravito/nebula` |
| i18n | `@gravito/cosmos` |

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
| 命名路由 + URL 產生器 | 已實作 | 支援 `router.get(...).name('home')` 與 `router.url('home')` |
| Resource routes | 已實作 | `router.resource('users', UsersController)` |
| Route model binding | 已實作 | `router.bind('user', async (id) => ...)`，可透過 `c.get('routeModels').user` 取得 |
| Route cache 策略 | 已實作 | CLI `route:cache` 可快取命名路由清單（manifest）供 URL 產生 |
| Rate limiting / 節流 | 已實作 | `ThrottleRequests` middleware + Cache store 支援 |

### Session / CSRF / Cookie

| 功能 | 狀態 | 說明 |
|------|------|------|
| Session | 已實作 | `@gravito/orbit` |
| CSRF 防護 | 已實作 | `@gravito/orbit` |
| Flash 資料模式 | 已實作 | `session.flash(key, value)` |
| Cookie 加密 | 已實作 | `CookieJar` + AES-256-CBC Encrypter |
| Cookie 簽章 | 缺少 | 需要第一級的簽章 primitive（含金鑰輪替策略） |

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
| Blade 相容樣板 | 缺少 | Gravito 使用 TSX 樣板，而非 Blade |
| 資產管線（asset pipeline）慣例 | 部分 | 已有 `templates`；慣例仍在演進 |

### 資料庫 / ORM

| 功能 | 狀態 | 說明 |
|------|------|------|
| Migrations（apply/status/fresh） | 已實作 | `gravito migrate` (基於 `drizzle-kit migrate`) |
| Seeder 執行 | 已實作 | `gravito db:seed` |
| Active Record 風格 Model | 部分 | `Model` 具備 CRUD、關聯、Scopes |
| 關聯 (Relations) | 部分 | 支援常見關聯 |
| Model factories | 缺少 | 尚無標準化 factory 系統 |
| Soft deletes | 已實作 | `withTrashed()`, `onlyTrashed()`, `restore()` |
| 多型關聯 (Polymorphic relations) | 已實作 | `morphTo`, `morphMany`, `morphOne` |
| 分頁 helpers | 已實作 | `Paginator` 類別 + `Model.paginate()` |

### 認證 / 授權

| 功能 | 狀態 | 說明 |
|------|------|------|
| Auth guards（session/jwt/token） | 已實作 | `@gravito/orbit-auth` |
| Auth middleware（`auth`、`guest`） | 已實作 | |
| Gates / abilities | 已實作 | `Gate.define()` + `authorize()` |
| Policies | 部分 | 支援手動 mapping |
| 密碼重設 / 信箱驗證 | 缺少 | 需要設計 |
| 密碼雜湊（bcrypt/argon）服務 | 已實作 | `core.hasher` (透過 `Bun.password`) |
| 密碼重設 / 信箱驗證 | 部分 | 提供 primitives（`PasswordBroker`、`EmailVerificationService`） |

### 佇列 / 排程

| 功能 | 狀態 | 說明 |
|------|------|------|
| Jobs + workers | 已實作 | `@gravito/orbit-queue` 的 multi-driver 設計 |
| 重試/backoff/timeout 慣例 | 部分 | 有部分概念；需要標準化介面 + 文件 |
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
| Cache | 已實作 | `@gravito/stasis` |
| Storage | 已實作 | `@gravito/nebula` |
| 多語系（i18n） | 已實作 | `@gravito/cosmos` |

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

### P1（補齊 Eloquent/Laravel 的常用體驗）

- Resource routes 與 route model binding 已實作；route cache 以命名路由清單（manifest）形式提供。
- Pagination helpers 與 soft deletes 已實作；剩餘缺口主要在 factories、polymorphic relations，以及更完整的 Eloquent-like 體驗。
- Auth hashing 已實作；密碼重設/信箱驗證仍需端到端 app 工作流程（mail + persistence + 預設 controllers）。

### P2（生態與可觀測性）

- 佇列儀表板 + job 可觀測性。
- Tracing/metrics/health-check Orbit（OpenTelemetry-ready）。
- 測試 fakes（mail/notifications/queue）+ HTTP 測試工具。
