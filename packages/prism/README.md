# @gravito/prism (Orbit View)

Standard view orbit for Gravito. A simple server-side template engine with image optimization built for Core Web Vitals.

## Features

- **Template engine**: Variables, conditionals, loops, and partials
- **Image component**: Zero client dependencies with optimized output
- **Helper registry**: Extendable helper registration
- **Core Web Vitals**: Automatic image loading optimizations
- **Two modes**: HTML templates and optional React components
- **Type-safe**: Full TypeScript support

## Installation

```bash
bun add @gravito/prism
```

Optional React support:

```bash
bun add react react-dom
```

## Quick Start

### 1. Register the orbit

```typescript
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'

const config = defineConfig({
  config: {
    VIEW_DIR: 'src/views',
  },
  orbits: [OrbitPrism],
})

const core = await PlanetCore.boot(config)
```

### 2. Render a template

```typescript
import { Context } from '@gravito/photon'

export class HomeController {
  index = async (c: Context) => {
    const view = c.get('view')

    return c.html(
      view.render('home', {
        title: 'Welcome',
        visitors: 1000,
        version: '1.0.0'
      })
    )
  }
}
```

### 3. Use the image helper

```html
{{image src="/assets/hero.jpg" alt="Hero" width=1200 height=630 loading="eager"}}
```

## Performance Optimization (v3.1.0)

Enable template caching for production environments to achieve significant performance gains:

```typescript
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'

const config = defineConfig({
  config: {
    VIEW_DIR: 'src/views',
  },
  orbits: [
    new OrbitPrism({
      cache: {
        maxSize: 500,      // Max templates to cache (default: 500)
        enabled: true,     // Enable caching (default: true)
        development: false // Validate cache on every access in dev (default: false)
      }
    })
  ],
})

const core = await PlanetCore.boot(config)
```

**Performance Results:**
- 141x faster than target (10k renders in 35ms)
- 7x faster repeat renders with 100% cache hit rate
- Hash-based invalidation ensures template freshness
- LRU eviction prevents memory bloat

## Modern Image Features (v3.1.0)

### Picture Element with Format Negotiation

Automatically serve modern image formats (AVIF, WebP) with fallbacks:

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

Outputs:
```html
<picture>
  <source srcset="/hero.avif 640w, /hero.avif 1920w" type="image/avif" />
  <source srcset="/hero.webp 640w, /hero.webp 1920w" type="image/webp" />
  <img src="/hero.jpg" alt="Hero" width="1920" height="1080" loading="lazy" decoding="async" />
</picture>
```

### CDN Integration

Integrate with popular image CDNs for automatic transformations:

```typescript
import { ImageService } from '@gravito/prism'
import { createCloudinaryLoader } from '@gravito/prism/image/loaders/cloudinary'

const service = new ImageService()
const loader = createCloudinaryLoader({ cloudName: 'demo' })

const html = service.generateImageTag({
  src: '/hero.jpg',
  alt: 'Hero',
  width: 800,
  height: 600,
  loader
})
// Outputs: <img src="https://res.cloudinary.com/demo/image/fetch/f_auto,w_800,q_80/hero.jpg" ... />
```

**Supported CDNs:**
- **Cloudinary**: `createCloudinaryLoader({ cloudName })`
- **imgix**: `createImgixLoader({ domain })`
- **Vercel**: `vercelLoader` (built-in)

### LQIP (Low Quality Image Placeholder)

Generate blur placeholders for optimal LCP scores:

```typescript
import { calculateMinLQIPSize, generatePlaceholderStyles } from '@gravito/prism/image/ImagePlaceholder'

// Calculate minimum size for Chrome LCP compliance (0.05 BPP)
const minSize = calculateMinLQIPSize(1440, 810)
// Returns: ~8.02 KB

// Generate blur effect CSS
const styles = generatePlaceholderStyles('data:image/jpeg;base64,...', 1440, 810)
// Returns: { background-image: '...', filter: 'blur(20px)', ... }
```

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

## React Component (Optional)

```tsx
import { Image } from '@gravito/prism/react'

export const Hero = () => (
  <Image
    src="/assets/hero.jpg"
    alt="Hero"
    width={1200}
    height={630}
    loading="eager"
  />
)
```

## License

MIT
