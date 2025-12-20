---
title: 專案結構
description: 深入瞭解 Gravito 應用程式的目錄佈局與架構設計。
---

# 專案結構

Gravito 遵循一種可預測且整潔的目錄結構。對於熟悉 MVC (如 Laravel 或 Rails) 的開發者來說會感到非常親切，同時它也針對 Bun/Hono 生態進行了極致優化。

## 目錄佈局

以下是一個標準 Gravito 專案（使用 Inertia-React 樣本）的結構：

```text
my-gravito-app/
├── src/
│   ├── client/          # 前端資源與 React 元件
│   │   ├── components/  # 共享的 React 元件
│   │   └── pages/       # Inertia 頁面元件（對應到 Controller）
│   ├── controllers/     # MVC 控制器（商業邏輯層）
│   ├── locales/         # 翻譯文件（國際化 I18n）
│   ├── routes/          # 路由定義（基於 Hono）
│   ├── services/        # 服務層（處理資料庫、外部 API）
│   ├── bootstrap.ts     # 應用程式的「點火器」（Orbit 註冊中心）
│   └── index.ts         # Bun 的主入口點
├── public/              # 靜態資源（圖片、robots.txt）
├── docs/                # 專案文件
├── gravito.config.ts    # 框架設定
└── package.json
```

---

## 核心哲學：行星與軌道 (Planets & Orbits)

要理解 Gravito 的運作方式，您需要掌握兩個核心概念：

### 1. PlanetCore (微核心)
Gravito 的核心被刻意設計得非常微小。它不知道如何渲染 React，也不知道如何連接資料庫。它只負責管理 **生命週期 (Lifecycle)** 與 **服務容器 (Service Container)**。

### 2. Orbits (基礎設施軌道)
功能是以「軌道」的形式圍繞著核心旋轉並增加能力的：
- 想要 React？加入 **Orbit Inertia**。
- 想要 SEO？加入 **Orbit SEO**。
- 需要資料庫？加入 **Orbit DB**。

這種「只為您使用的功能付費（效能開銷）」的方法，確保了您的應用無論規模大小，都能保持閃電般的速度。

---

## 生命週期 (The Lifecycle)

當您執行 `bun dev` 或 `bun run src/index.ts` 時，會發生以下過程：

1. **點火 (Ignition - `index.ts`)**：Bun 啟動並呼叫 `bootstrap()`。
2. **註冊 (Registration - `bootstrap.ts`)**：註冊所有必要的 Orbits。
   ```typescript
   core.orbit(OrbitInertia)
   core.orbit(OrbitView)
   ```
3. **啟動 (Booting)**：核心呼叫每個 Orbit 的 `boot()` 方法，準備 View 引擎或資料庫連線等服務。
4. **升空 (Liftoff)**：HTTP 適配器 (Hono) 開始監聽請求。

## 程式碼該寫在哪裡？

- **路由定義**：請看 `src/routes/index.ts`，這裏負責將網址對應到控制器。
- **邏輯處理**：請看 `src/controllers/`，這是應用程式的「大腦」所在。
- **介面建構**：請看 `src/client/pages/`，這是您建構視覺體驗的地方。

> **下一步**：學習如何在 [路由系統](/zh/docs/guide/routing) 中處理請求。
