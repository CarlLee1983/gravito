---
title: Image Optimization
description: Automated image optimization for high-performance Gravito applications.
---

# Image Optimization

**Orbit Prism** includes a powerful Image Optimization feature. It ensures your application meets the highest performance standards, inspired by the best practices of Next.js but with **Zero Client-side Runtime**.

---

## Why Use Gravito Image?

Unlike standard `<img>` tags, the Gravito `Image` component automatically handles complex performance optimizations:

- **CLS Prevention**: Automatically sets `width` and `height` to prevent layout shifts.
- **Responsive Images**: Generates `srcset` and `sizes` automatically based on your source.
- **Lazy Loading**: Defaults to `loading="lazy"` for all images except critical ones.
- **Modern Performance**: Uses `decoding="async"` and supports `fetchpriority` for LCP optimization.
- **Zero JS**: All logic happens on the server. No heavy JavaScript bundle is sent to the browser.

---

## Usage in React (Inertia)

If you are using React with Inertia, simply import the `Image` component.

```tsx
import { Image } from '@gravito/prism'

export default function Hero() {
  return (
    <section>
      {/* 1. Basic Usage */}
      <Image 
        src="/static/hero.jpg" 
        alt="Hero Image" 
        width={1920} 
        height={1080} 
      />

      {/* 2. Critical Image (LCP Optimization) */}
      <Image 
        src="/static/banner.jpg" 
        alt="Main Banner" 
        width={1200} 
        height={600}
        loading="eager"      // Load immediately
        fetchpriority="high" // Tell the browser this is important
      />

      {/* 3. Responsive Breakpoints */}
      <Image 
        src="/static/product.png" 
        alt="Product" 
        width={800} 
        height={800}
        srcset={[400, 800, 1200]} // Automatically generates versioned paths
      />
    </section>
  )
}
```

---

## Usage in Vue

For Vue 3 applications, import the component from the specialized subpath.

```vue
<script setup>
import { Image } from '@gravito/prism/vue'
</script>

<template>
  <div class="hero">
    <!-- 1. Basic Usage -->
    <Image 
      src="/static/hero.jpg" 
      alt="Hero Image" 
      :width="1920" 
      :height="1080" 
    />

    <!-- 2. Critical Image (LCP Optimization) -->
    <Image 
      src="/static/banner.jpg" 
      alt="Main Banner" 
      :width="1200" 
      :height="600"
      loading="eager"
      fetchpriority="high"
    />
  </div>
</template>
```

---

## Usage in HTML Templates

If you are using our built-in template engine, use the `image` helper.

```html
<!-- One line of power -->
{{image src="/static/hero.jpg" alt="Hero" width=1920 height=1080 loading="eager"}}

<!-- Or inside a component -->
<x-card>
  {{image src="/static/thumb.jpg" alt="Thumb" width=400 height=300}}
  <p>Card Content</p>
</x-card>
```

## Modern Formats & Picture Element

Starting from **v3.1.0**, the `Image` component supports the `<picture>` element for advanced format negotiation.

```handlebars
{{image 
  src="/hero.jpg" 
  alt="Hero" 
  width=1920 
  height=1080
  formatNegotiation=true
  usePicture=true
}}
```

This will automatically generate a `<picture>` tag with optimized `AVIF` and `WebP` sources, falling back to the original `JPG`.

---

## CDN Integration

Prism integrates seamlessly with popular image CDNs. This allows you to offload image processing to specialized services while keeping your codebase clean.

```typescript
import { ImageService } from '@gravito/prism'
import { createCloudinaryLoader } from '@gravito/prism/image/loaders/cloudinary'

const loader = createCloudinaryLoader({ cloudName: 'your-cloud-name' })

// In your template or component
<Image 
  src="/products/shoes.jpg" 
  alt="Shoes" 
  width={800} 
  height={600} 
  loader={loader}
/>
```

**Supported Loaders:**
- **Cloudinary**: `createCloudinaryLoader({ cloudName })`
- **imgix**: `createImgixLoader({ domain })`
- **Vercel**: `vercelLoader`

---

## LQIP (Low Quality Image Placeholder)

To improve Largest Contentful Paint (LCP) and provide a better user experience, Prism supports **Low Quality Image Placeholders (LQIP)**.

```handlebars
{{image 
  src="/hero.jpg" 
  alt="Hero"
  width=1440
  height=810
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
}}
```

### Generating Placeholders

You can use the built-in utilities to calculate optimal placeholder sizes that comply with Chrome's LCP standards (0.05 Bits Per Pixel).

```typescript
import { calculateMinLQIPSize } from '@gravito/prism'

const minSizeKB = calculateMinLQIPSize(1440, 810) // Returns ~8KB
```

---

## Core Web Vitals Checklist

The Image module is designed to help you score 100 on Google PageSpeed Insights:

| Metric | How Gravito Helps |
|--------|-------------------|
| **LCP** | Use `loading="eager"` and `fetchpriority="high"` for the largest image on your page. |
| **CLS** | `width` and `height` are **required** props to ensure the browser knows the aspect ratio before loading. |
| **FCP** | Non-blocking `async` decoding ensures the browser can paint text while the image is being decoded. |

---

## Pro Tips

1.  **Requirement**: The `alt` attribute is **mandatory**. Gravito enforces accessibility by throwing an error if it's missing.
2.  **Pathing**: If you use `srcset`, Gravito assumes your build process generates width-versioned images (e.g., `hero-800w.jpg`). If you use an external image service (like Cloudinary or Imgix), you can customize the `ImageService` path logic.
3.  **Aspect Ratio**: Even if you want the image to be responsive via CSS (e.g., `w-full h-auto`), you must still provide the original `width` and `height` for CLS prevention.

> **Next Step**: Learn how to make your optimized site visible to search engines in the [SEO Engine Guide](/en/docs/guide/seo-engine).
