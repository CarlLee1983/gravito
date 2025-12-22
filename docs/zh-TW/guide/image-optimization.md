---
title: 圖片優化
description: 為高效能 Gravito 應用程式提供的自動化圖片優化方案。
---

# 圖片優化 (Image Optimization)

Gravito 內建了強大的**圖片優化**模組（屬於 `Gravito-View` 的一部分）。它參考了 Next.js 的最佳實踐，確保您的應用程式符合最高效能標準，但其核心優勢在於：**零客戶端執行路徑 (Zero Client-side Runtime)**。

---

## 為什麼要使用 Gravito Image？

不同於標準的 `<img>` 標籤，Gravito 的 `Image` 元件會自動處理複雜的效能優化：

- **防止佈局抖動 (CLS Prevention)**：自動設定 `width` 與 `height`，確保瀏覽器在圖片下載完成前就預留空間。
- **響應式圖片 (Responsive Images)**：根據您的設定自動生成 `srcset` 與 `sizes` 屬性。
- **延遲載入 (Lazy Loading)**：預設為 `loading="lazy"`，僅對標記為關鍵的圖片立即載入。
- **現代效能標準**：預設使用 `decoding="async"` 並支援 `fetchpriority` 來優化 LCP 指標。
- **零 JS 腳本**：所有邏輯都在伺服器端執行，不會向瀏覽器發送沉重的 JavaScript 套件。

---

## 在 React (Inertia) 中使用

如果您使用 React 與 Inertia，只需導入 `Image` 元件即可。

```tsx
import { Image } from '@gravito/prism'

export default function Hero() {
  return (
    <section>
      {/* 1. 基本使用 */}
      <Image
        src="/static/hero.jpg"
        alt="首頁大圖"
        width={1920}
        height={1080}
      />

      {/* 2. 關鍵圖片 (LCP 優化) */}
      <Image
        src="/static/banner.jpg"
        alt="主橫幅"
        width={1200}
        height={600}
        loading="eager"      // 立即加載
        fetchpriority="high" // 告知瀏覽器這是最高優先順序
      />

      {/* 3. 自訂響應式斷點 */}
      <Image
        src="/static/product.png"
        alt="產品圖"
        width={800}
        height={800}
        srcset={[400, 800, 1200]} // 會自動生成對應寬度的路徑
      />
    </section>
  )
}
```

---

## 在 Vue 中使用

對於 Vue 3 應用程式，請從專用的子路徑導入元件。

```vue
<script setup>
import { Image } from '@gravito/prism/vue'
</script>

<template>
  <div class="hero">
    <!-- 1. 基本使用 -->
    <Image
      src="/static/hero.jpg"
      alt="首頁大圖"
      :width="1920"
      :height="1080"
    />

    <!-- 2. 關鍵圖片 (LCP 優化) -->
    <Image
      src="/static/banner.jpg"
      alt="主橫幅"
      :width="1200"
      :height="600"
      loading="eager"
      fetchpriority="high"
    />
  </div>
</template>
```

---

## 在 HTML 樣板中使用

如果您使用我們內建的樣板引擎（Orbit Prism V2+），可以使用 `image` 助手（Helper）。

```html
<!-- 一行程式碼，火力全開 -->
{{image src="/static/hero.jpg" alt="Hero" width=1920 height=1080 loading="eager"}}

<!-- 或者在組件中使用 -->
<x-card>
  {{image src="/static/thumb.jpg" alt="Thumb" width=400 height=300}}
  <p>Card Content</p>
</x-card>
```

---

## Core Web Vitals 核對清單

圖片模組旨在幫助您在 Google PageSpeed Insights 中獲得 100 分：

| 指標 | Gravito 如何提供幫助 |
|--------|-------------------|
| **LCP** | 針對頁面上最大的圖片使用 `loading="eager"` 和 `fetchpriority="high"`。 |
| **CLS** | `width` 和 `height` 是**強制性**參數，確保瀏覽器在載入前已知曉寬高比。 |
| **FCP** | 非阻塞的 `async` 解碼確保瀏覽器在圖片解碼時仍能渲染文字。 |

---

## 專業提示

1.  **必要性**：`alt` 屬性是**強制要求**的。Gravito 嚴格執行無障礙訪問標準，如果缺失將會拋出錯誤。
2.  **路徑邏輯**：如果您使用 `srcset`，Gravito 預設您的建構流程會生成帶有寬度後綴的圖片（如 `hero-800w.jpg`）。如果您使用外部圖片服務（如 Cloudinary），可以自訂 `ImageService` 的路徑邏輯。
3.  **寬高比**：即使您希望使用 CSS 讓圖片響應式（例如 `w-full h-auto`），您仍然必須提供原始的 `width` 和 `height` 以防止佈局抖動。

> **下一站**：學習如何在 [SEO 引擎指南](/zh/docs/guide/seo-engine) 中讓您優化後的網站更好地被搜尋引擎發現。
