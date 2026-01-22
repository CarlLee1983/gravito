# 遷移指南：從 v3.0.x 升級到 v3.1.0

> **重要**: v3.1.0 是 **完全向下相容** 的版本。所有現有程式碼無需修改即可正常運作。

---

## 快速升級

```bash
# 更新依賴
bun update @gravito/prism

# 驗證
bun test
```

就這樣！你的專案應該可以正常運作。

---

## 新功能採用指南

### 1. 啟用模板快取（建議）

**之前 (v3.0.x):**
```typescript
const prism = new OrbitPrism()
```

**之後 (v3.1.0):**
```typescript
const prism = new OrbitPrism({
  cache: {
    maxSize: 500,      // 快取最多 500 個模板
    enabled: true,     // 生產環境啟用
    development: false // 開發時可設為 true 以驗證快取
  }
})
```

**效果**: 重複渲染效能提升 7 倍以上。

---

### 2. 使用現代圖片格式

**之前 (v3.0.x):**
```handlebars
{{image src="/hero.jpg" alt="Hero" width=1200}}
```

**之後 (v3.1.0) - 啟用格式協商:**
```handlebars
{{image
  src="/hero.jpg"
  alt="Hero"
  width=1200
  formatNegotiation=true
  usePicture=true
}}
```

**效果**: 自動產生 `<picture>` 元素，支援 AVIF/WebP。

---

### 3. 使用 CDN 載入器

**之前 (v3.0.x):**
```typescript
// 需要手動處理 CDN URL
const cdnUrl = `https://res.cloudinary.com/demo/image/fetch/w_800/${src}`
```

**之後 (v3.1.0):**
```typescript
import { ImageService, createCloudinaryLoader } from '@gravito/prism'

const service = new ImageService()
const loader = createCloudinaryLoader({ cloudName: 'demo' })

const html = service.generateImageTag({
  src: '/hero.jpg',
  alt: 'Hero',
  width: 800,
  loader  // 自動處理 CDN URL
})
```

---

### 4. 使用增量 SSG 建置

**之前 (v3.0.x):**
```typescript
// 每次全量建置
await ssg.export('./dist', 'https://example.com')
```

**之後 (v3.1.0):**
```typescript
// 增量建置 - 只重建變更的頁面
await ssg.exportIncremental('./dist', {
  baseUrl: 'https://example.com',
  incremental: true
})
```

**效果**: 大型網站建置時間大幅縮短。

---

### 5. 使用動態路由生成

**之前 (v3.0.x):**
```typescript
// 需要手動遍歷並生成路徑
const posts = await fetchPosts()
for (const post of posts) {
  await generatePage(`/blog/${post.slug}`, post)
}
```

**之後 (v3.1.0):**
```typescript
import { DynamicRouteResolver } from '@gravito/prism'

const dynamicRoutes = [
  {
    pattern: '/blog/[slug]',
    getStaticPaths: async () => {
      const posts = await fetchPosts()
      return posts.map(post => ({
        params: { slug: post.slug },
        data: post
      }))
    }
  }
]

await ssg.exportDynamic(dynamicRoutes, './dist')
```

---

## Import 路徑變更

### 內部結構變更（不影響使用）

v3.1.0 重構了內部目錄結構，但 **所有公開 API 的導入路徑保持不變**：

```typescript
// ✅ 這些導入路徑完全不變
import {
  OrbitPrism,
  TemplateEngine,
  ImageService,
  StaticSiteGenerator
} from '@gravito/prism'

import { Image } from '@gravito/prism'  // React 組件
```

### 新增導出

v3.1.0 新增了以下導出，可選擇性使用：

```typescript
import {
  // 快取相關
  TemplateCache,
  type CacheOptions,
  type CacheStats,

  // 編譯器相關
  TemplateCompiler,
  type CompilerOptions,

  // SSG 相關
  IncrementalBuilder,
  DynamicRouteResolver,
  type DynamicRoute,
  type ResolvedRoute,

  // CDN Loaders
  createCloudinaryLoader,
  createImgixLoader,
  vercelLoader,
  type ImageCDNLoader,

  // LQIP 工具
  calculateMinLQIPSize,
  calculateLQIPDimensions,
  generatePlaceholderStyles,
  generateColorPlaceholder
} from '@gravito/prism'
```

---

## 已棄用功能

v3.1.0 **沒有棄用任何功能**。所有 v3.0.x 的 API 都繼續支援。

---

## 破壞性變更

v3.1.0 **沒有破壞性變更**。

---

## 效能比較

| 指標 | v3.0.x | v3.1.0 | 改善 |
|------|--------|--------|------|
| 首次渲染 | ~5ms | ~5ms | - |
| 重複渲染 (10k 次) | ~250ms | ~35ms | 7x |
| 快取命中率 | N/A | 100% | 新功能 |
| 增量建置 | N/A | <10% 全量時間 | 新功能 |

---

## 常見問題

### Q: 升級後測試失敗怎麼辦？

A: 首先確認是否真的是 v3.1.0 造成的問題：

```bash
# 回退到 v3.0.x
bun add @gravito/prism@3.0.2

# 執行測試
bun test
```

如果 v3.0.x 也失敗，問題可能不在升級。如果 v3.0.x 通過但 v3.1.0 失敗，請回報問題。

### Q: 快取會造成記憶體問題嗎？

A: 不會。快取使用 LRU (Least Recently Used) 策略，會自動驅逐最少使用的項目。預設最多快取 500 個模板，可透過 `maxSize` 調整。

### Q: 如何在開發時禁用快取？

A: 設定 `enabled: false` 或 `development: true`：

```typescript
new OrbitPrism({
  cache: {
    enabled: process.env.NODE_ENV === 'production',
    development: process.env.NODE_ENV === 'development'
  }
})
```

### Q: 增量建置的 manifest 檔案要提交到 Git 嗎？

A: 不建議。`.build-manifest.json` 是建置產物，應加入 `.gitignore`。每個環境會自動建立自己的 manifest。

---

## 取得協助

- **問題回報**: [GitHub Issues](https://github.com/gravito-framework/gravito/issues)
- **API 文檔**: [docs/API.md](./API.md)
- **架構說明**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)

---

**相關文檔:**
- [CHANGELOG](../CHANGELOG.md)
- [API 參考](./API.md)
- [架構說明](./ARCHITECTURE.md)
