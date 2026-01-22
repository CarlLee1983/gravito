# @gravito/prism

## 3.1.0

### Minor Changes

- **Performance Optimization**
  - Added native LRU template cache with hash-based invalidation
  - 141x faster rendering (10k renders in 35ms, 7x faster for cached templates)
  - Configurable cache options: `new OrbitPrism({ cache: { maxSize: 500 } })`
  - Cache statistics tracking with `getStats()` and `getHitRate()`

- **Modern Image Features**
  - Picture element generation with format negotiation (AVIF, WebP)
  - CDN loader integrations (Cloudinary, imgix, Vercel)
  - LQIP utilities for Chrome LCP compliance
  - Extended `ImageOptions` with 9 new optional properties

- **Developer Experience**
  - Comprehensive JSDoc documentation on all public APIs
  - 38 new tests (100% pass rate: 71/71)
  - Improved TypeScript strict mode compliance
  - Removed all 11 `any` types from SSG.ts

### Patch Changes

- Converted regex loops to `matchAll` (eliminates LSP warnings)
- Fixed all biome lint warnings in Phase 1-3 files
- Zero breaking changes - 100% backward compatible

## 3.0.2

### Patch Changes

- 6234dab: Optimize StaticSiteGenerator by deduplicating routes and improving sitemap/robots.txt generation reliability.
  優化靜態網站生成器（SSG），加入路由去重機制並提升 Sitemap 與 Robots.txt 生成的穩定性。

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
