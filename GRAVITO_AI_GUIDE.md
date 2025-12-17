# Gravito AI Guide

> **"The High-Performance Framework for Artisans."**
> 為工匠打造的高效能框架

本文件定義 Gravito 框架的核心架構、編碼規範與設計理念，供 AI 助手與開發者參考。

---

## 目錄

1. [核心定位](#1-核心定位-product-positioning)
2. [技術堆疊](#2-技術堆疊-tech-stack)
3. [核心架構功能](#3-核心架構功能-core-architecture)
4. [開發體驗](#4-開發體驗-dx--ai-first)
5. [佈署戰略](#5-佈署戰略-deployment-strategy)
6. [1.0 驗收標準](#6-10-驗收標準-definition-of-done)
7. [專案結構](#7-專案結構-project-structure)
8. [編碼規範](#8-編碼規範-coding-standards)

---

## 1. 核心定位 (Product Positioning)

### Slogan
**"The High-Performance Framework for Artisans."** (為工匠打造的高效能框架)

### 關鍵差異化

| 比較對象 | Gravito 優勢 |
|---------|-------------|
| **Laravel** | 基於 Bun + Hono，毫秒級啟動，比 PHP 更快 |
| **Next.js** | Binary-First (單一執行檔) 策略，拒絕 `node_modules` 依賴地獄 |
| **Express/Koa** | 強制 MVC 分層，拒絕後端邏輯破碎化 |

---

## 2. 技術堆疊 (Tech Stack)

```
┌─────────────────────────────────────────────────────────────┐
│                      TypeScript (Strict)                     │
│                    為 AI 提供型別提示                         │
├─────────────────────────────────────────────────────────────┤
│  Inertia.js              │            Vite                  │
│  (Frontend Bridge)       │       (Build Tool)               │
│  後端 MVC，前端 SPA       │    React/Vue 熱更新              │
├──────────────────────────┴──────────────────────────────────┤
│                         Hono                                 │
│              世界最快的 JS Web 標準庫                         │
│            (Router + Request Parser)                         │
├─────────────────────────────────────────────────────────────┤
│                          Bun                                 │
│            極速 JS 執行環境 + 打包工具                        │
└─────────────────────────────────────────────────────────────┘
```

| 層級 | 技術 | 角色 |
|------|------|------|
| **Runtime** | Bun | 極速 JS 執行環境 + 打包工具 |
| **HTTP Core** | Hono | 世界最快的 JS Web 標準庫，提供 Router 與 Request Parser |
| **Frontend Bridge** | Inertia.js | 讓後端寫法像 MVC，前端體驗像 SPA |
| **Build Tool** | Vite | 負責前端 React/Vue 的熱更新與編譯 |
| **Language** | TypeScript | 全嚴格模式，為 AI 提供型別提示 |

---

## 3. 核心架構功能 (Core Architecture)

### A. 核心引擎 (The Kernel)

- **Micro-Kernel 設計**: 核心零依賴 (Zero Dependency)，只負責 I/O 與插件調度
- **啟動機制**: 採用 Boot-time Resolution (啟動時編譯路由與依賴)，確保 Runtime (執行時) 為唯讀且極速

```typescript
// 核心啟動流程
const core = new PlanetCore({
  orbits: [OrbitDB, OrbitAuth, OrbitInertia], // 插件選配
})

await core.boot() // Boot-time Resolution
await core.ignite() // 啟動服務
```

### B. 智能上下文 (Smart Context)

#### `ctx.view(template, props)` - 核心黑科技

**協商機制 (Negotiation)**: 自動判斷請求來源

| 請求類型 | 回應內容 | 用途 |
|---------|---------|------|
| **Inertia 請求** | JSON | 給 React/Vue 前端接管 |
| **HTML 請求** | Server-Side Render HTML (App Shell) | 給爬蟲或首頁 |

```typescript
// Controller 範例
export class HomeController {
  index(ctx: Context) {
    return ctx.view('Home', { 
      title: 'Welcome to Gravito',
      features: ['Fast', 'Light', 'Clean']
    })
  }
}
```

#### `ctx.meta(tags)` - SEO 整合

提供統一的 SEO 設定介面，自動注入 HTML `<head>` 或傳遞給 Inertia `<Head>` 組件。

```typescript
ctx.meta({
  title: 'Gravito Framework',
  description: 'The High-Performance Framework for Artisans',
  og: {
    image: '/images/og-cover.png',
    type: 'website'
  }
})
```

### C. 插件系統 (Plugin System)

- **Opt-in (選配式)**: 預設不含 DB、Auth，按需引入
- **Interface-based**: 透過 Hono Middleware 機制封裝

#### 插件生命週期

| 階段 | Hook | 用途 |
|------|------|------|
| 啟動時 | `onBoot()` | 初始化連線、載入設定 |
| 請求時 | `onRequest()` | 注入 Context、驗證 |

```typescript
// 插件定義範例
export class OrbitDB implements GravitoOrbit {
  async onBoot(core: PlanetCore) {
    // 建立資料庫連線
  }
  
  async onRequest(ctx: Context, next: Next) {
    // 注入 ctx.db
  }
}
```

---

## 4. 開發體驗 (DX & AI-First)

### A. AI 友善體系

| 特性 | 說明 |
|------|------|
| **架構文檔** | 專案內建 `GRAVITO_AI_GUIDE.md`，定義編碼規範 |
| **顯式合約** | Controller 依賴 Interface 而非具體實作，讓 AI 能精準生成業務邏輯 |
| **型別安全** | 全 TypeScript 嚴格模式，提供完整型別推導 |

### B. 前端靈活切換 (View Adapter)

同一個 Controller，可以無縫切換 React、Vue 或純 HTML 模板，後端邏輯不變。

```typescript
// 同一個 Controller，不同 View 引擎
export class ProductController {
  show(ctx: Context) {
    const product = await this.productService.find(ctx.params.id)
    
    // 自動根據專案設定選擇 React/Vue/HTML
    return ctx.view('Product/Show', { product })
  }
}
```

---

## 5. 佈署戰略 (Deployment Strategy)

### 方案一：單一執行檔 (主打亮點) ⭐

```bash
# 編譯指令
bun build --compile --outfile=server ./src/index.ts

# 產出結構
dist/
├── server          # 獨立 Binary 檔案
└── public/         # 靜態資源資料夾
```

**優勢**: 伺服器無需安裝 Node/npm/Bun，Linux 系統直接執行

### 方案二：Docker 容器化 (企業標準)

提供標準 Multi-stage Dockerfile，分離 Build 環境與 Run 環境，產出極小化 Image。

```dockerfile
# Multi-stage Build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install && bun run build

FROM debian:bookworm-slim
COPY --from=builder /app/dist/server /app/server
COPY --from=builder /app/dist/public /app/public
CMD ["/app/server"]
```

---

## 6. 1.0 驗收標準 (Definition of Done)

透過開發 **Gravito 官方介紹網站** 來驗收以下項目：

| 驗收項目 | 標準 | 狀態 |
|---------|------|------|
| **路由通暢** | 能夠訪問首頁 `/` 與文檔頁 `/docs` | ⬜ |
| **畫面渲染** | 能夠看到 React/Vue 渲染的 UI，且樣式載入正確 | ⬜ |
| **互動驗證** | 實作「訂閱電子報」表單，後端能收到 POST 資料並回傳成功 | ⬜ |
| **SEO 驗證** | 檢視網頁原始碼，`<title>` 與 Open Graph 標籤正確顯示 | ⬜ |
| **佈署驗證** | 成功編譯出 Binary 檔，並在乾淨的 Linux 環境跑起來 | ⬜ |

---

## 7. 專案結構 (Project Structure)

```
gravito-core/
├── packages/                 # 核心模組 (Monorepo)
│   ├── cli/                  # 命令列工具 (create-gravito)
│   ├── core/                 # PlanetCore (IoC 容器 + 生命週期)
│   ├── orbit-auth/           # 認證插件
│   ├── orbit-cache/          # 快取插件
│   ├── orbit-db/             # 資料庫插件 (Drizzle ORM)
│   ├── orbit-inertia/        # Inertia.js 整合
│   ├── orbit-storage/        # 儲存插件
│   └── orbit-view/           # 模板引擎
│
├── templates/                # 專案模板
│   ├── basic/                # 基礎 MVC 模板 (純 HTML)
│   └── inertia-react/        # Inertia + React SPA 模板
│
├── docs/                     # 文件
├── examples/                 # 範例專案
└── GRAVITO_AI_GUIDE.md       # 本文件
```

---

## 8. 編碼規範 (Coding Standards)

### TypeScript 規範

```typescript
// ✅ 使用 Interface 定義合約
interface UserService {
  find(id: string): Promise<User>
  create(data: CreateUserDTO): Promise<User>
}

// ✅ Controller 依賴 Interface
export class UserController {
  constructor(private userService: UserService) {}
}

// ❌ 避免直接依賴具體實作
export class UserController {
  private userService = new ConcreteUserService() // Bad
}
```

### 命名規範

| 類型 | 規範 | 範例 |
|------|------|------|
| **Controller** | PascalCase + `Controller` 後綴 | `UserController` |
| **Service** | PascalCase + `Service` 後綴 | `AuthService` |
| **Orbit (插件)** | `Orbit` 前綴 + PascalCase | `OrbitDB`, `OrbitAuth` |
| **路由檔案** | kebab-case | `api-routes.ts` |
| **View 組件** | PascalCase | `UserProfile.tsx` |

### 檔案結構規範

```
src/
├── controllers/        # 控制器 (處理 HTTP 請求)
├── services/           # 業務邏輯層
├── models/             # 資料模型 (Drizzle Schema)
├── views/              # HTML 模板 (Server-Side)
├── client/             # 前端程式碼 (React/Vue)
│   ├── pages/          # 頁面組件
│   ├── components/     # 共用組件
│   └── layouts/        # 佈局組件
├── routes/             # 路由定義
├── middlewares/        # 中間件
└── bootstrap.ts        # 啟動進入點
```

---

## 貢獻指南

在修改 Gravito 框架時，請確保：

1. **遵循 MVC 分層**: Controller 不應包含業務邏輯，應委派給 Service
2. **保持型別安全**: 所有 public API 必須有完整的 TypeScript 型別
3. **維護 AI 友善性**: 更新本文件以反映架構變更

---

*Last updated: 2025-12-17*
