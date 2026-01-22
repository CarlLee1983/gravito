# Gravito Prism 架構說明

> **版本**: 3.1.0
> **最後更新**: 2026-01-22

---

## 概述

Gravito Prism 是一個 Blade-like 模板引擎，提供以下核心功能：

- **模板繼承**: `@extends`, `@section`, `@yield`
- **內容堆疊**: `@push`, `@stack`
- **組件系統**: `<x-component>` 語法
- **控制結構**: `@if`, `@foreach`, `@unless`
- **圖片優化**: 自動 srcset、格式協商、LQIP
- **靜態網站生成**: 增量建置、動態路由

---

## 目錄結構

```
packages/prism/src/
├── core/                       # 核心邏輯
│   ├── TemplateCache.ts        # LRU 快取實作
│   └── TemplateCompiler.ts     # 模板編譯器
│
├── engine/                     # 引擎層
│   └── TemplateEngine.ts       # 主要編排器
│
├── image/                      # 圖片處理
│   ├── ImageService.ts         # 圖片標籤生成
│   ├── ImageCDNLoader.ts       # CDN 載入器介面
│   ├── ImagePlaceholder.ts     # LQIP 工具
│   └── loaders/                # CDN 實作
│       ├── cloudinary.ts
│       ├── imgix.ts
│       └── vercel.ts
│
├── ssg/                        # 靜態網站生成
│   ├── StaticSiteGenerator.ts  # SSG 核心
│   ├── IncrementalBuilder.ts   # 增量建置
│   └── DynamicRouteResolver.ts # 動態路由解析
│
├── components/                 # 框架組件
│   └── Image.tsx               # React 圖片組件
│
├── helpers/                    # 模板 Helper
│   └── image.ts                # 圖片 Helper
│
├── types/                      # 類型定義
│   ├── template.ts
│   ├── image.ts
│   ├── ssg.ts
│   ├── cache.ts
│   └── index.ts
│
├── vue.ts                      # Vue 組件
└── index.ts                    # Barrel Exports
```

---

## 分層架構

### 1. 編排層 (Engine Layer)

**檔案**: `engine/TemplateEngine.ts`

**職責**:
- 檔案讀取與快取管理
- Layout 繼承處理
- Helper 註冊
- 協調編譯流程

```typescript
class TemplateEngine {
  private cache: TemplateCache
  private compiler: TemplateCompiler
  private helpers: Map<string, HelperFunction>

  render(view: string, data: object): string
  registerHelper(name: string, fn: HelperFunction): void
}
```

### 2. 編譯層 (Compiler Layer)

**檔案**: `core/TemplateCompiler.ts`

**職責**:
- 指令處理 (`@if`, `@foreach`, `@section`)
- 組件解析 (`<x-component>`)
- Helper 調用
- 變數插值

```typescript
class TemplateCompiler {
  compile(
    template: string,
    data: object,
    ctx: RenderContext,
    helpers: Map<string, HelperFunction>,
    readTemplate: (name: string) => string
  ): string

  extractSections(template: string, ctx: RenderContext): void
  extractStacks(template: string, ctx: RenderContext): void
}
```

### 3. 快取層 (Cache Layer)

**檔案**: `core/TemplateCache.ts`

**職責**:
- LRU 驅逐策略
- Hash-based 失效驗證
- 統計追蹤

```typescript
class TemplateCache {
  getSource(name: string): string | null
  setSource(name: string, source: string): void
  getStats(): CacheStats
}
```

---

## 資料流

```
User Request
     │
     ▼
┌────────────────┐
│ TemplateEngine │ ← registerHelper
│   (編排層)      │
└────────────────┘
     │
     ├── readTemplate() → TemplateCache
     │
     ▼
┌────────────────┐
│ TemplateCompiler│
│   (編譯層)       │
└────────────────┘
     │
     ├── extractSections()
     ├── processDirectives()
     ├── processComponents()
     ├── processHelpers()
     └── interpolate()
     │
     ▼
  HTML Output
```

---

## 關鍵設計決策

### 1. 為什麼分離 Compiler?

**問題**: 原本的 `TemplateEngine` 有 500+ 行，混合了檔案 I/O 和編譯邏輯。

**解決方案**:
- `TemplateEngine` 負責 I/O 和協調
- `TemplateCompiler` 負責純粹的編譯邏輯
- 更容易測試、維護、擴展

### 2. 為什麼使用 Regex 而非 AST?

**現狀**: 使用 Regex-based 解析

**優點**:
- 簡單、快速
- 已驗證可靠
- 對簡單模板效能更好

**缺點**:
- 錯誤訊息品質較差
- 難以擴展新語法

**未來**: 考慮在 v4.0.0 引入 AST-based 解析

### 3. 類型定義統一管理

所有公開類型都集中在 `src/types/` 目錄：
- 避免重複定義
- 更容易找到類型
- 更好的 TypeScript 體驗

---

## 擴展指南

### 新增 CDN 載入器

```typescript
// src/image/loaders/custom.ts
import type { ImageCDNLoader, TransformOptions } from '../ImageCDNLoader'

export const customLoader: ImageCDNLoader = {
  name: 'custom',
  canHandle(src) {
    return src.includes('custom-cdn.com')
  },
  transform(src, options) {
    // 實作轉換邏輯
    return transformedUrl
  }
}
```

### 新增模板指令

在 `TemplateCompiler.processDirectives()` 中添加：

```typescript
.replace(/@newDirective\s*\((.+?)\)/g, (_, args) => {
  // 處理新指令
  return processedOutput
})
```

---

## 測試策略

1. **單元測試**: 各層獨立測試
2. **整合測試**: 完整渲染流程
3. **效能測試**: 快取效能驗證

```bash
# 執行所有測試
bun test

# 帶覆蓋率
bun test --coverage

# 類型檢查
bun run typecheck
```

---

## 相關文檔

- [Phase 1-4 開發文檔](./PHASE1-4_DOCUMENTATION.md)
- [Phase 5 架構重構](./PHASE5_ARCHITECTURE_REFACTOR.md)
- [驗收標準](./ACCEPTANCE_CRITERIA.md)
