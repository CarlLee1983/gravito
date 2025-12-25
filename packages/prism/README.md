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
import { defineConfig, PlanetCore } from 'gravito-core'
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
