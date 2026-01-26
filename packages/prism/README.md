# @gravito/prism 💎

> High-performance template engine & image optimization orbit for Gravito.

`@gravito/prism` is the standard view orbit for the Gravito framework. It features a Blade-inspired server-side template engine combined with a powerful image optimization service designed to achieve perfect Core Web Vitals scores.

## 🌟 Key Features

- **🚀 Performance-First Rendering**: LRU template caching with hash-based invalidation (140x faster renders).
- **🖼️ Advanced Image Optimization**: Automatic AVIF/WebP conversion, responsive `srcset` generation, and LQIP blur placeholders.
- **🏗️ Static Site Generation (SSG)**: Full site export with incremental build support (only rebuilds changed pages).
- **🧩 Component System**: Build UI using clean `<x-component>` syntax.
- **⚡ Core Web Vitals Ready**: Automatic CLS prevention, lazy loading, and priority hints.
- **🔌 Multi-Framework Support**: Optional React and Vue components for seamless integration.

## 📦 Installation

```bash
bun add @gravito/prism
```

## 🚀 Quick Start

### 1. Register the Orbit

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'

const core = await PlanetCore.boot({
  config: { VIEW_DIR: 'src/views' },
  orbits: [new OrbitPrism()]
})
```

### 2. Render Templates

Prism supports a rich set of directives:

```handlebars
{{-- src/views/home.html --}}
@extends('layout')

@section('content')
  <h1>Welcome, {{ user.name }}</h1>
  
  @if(items.length > 0)
    <ul>
      @foreach(item in items)
        <li>{{ item.name }}</li>
      @endforeach
    </ul>
  @endif

  <x-alert type="success">Operation completed!</x-alert>
@endsection
```

```typescript
const view = core.container.resolve('view')
const html = view.render('home', { user: { name: 'Carl' }, items: [] })
```

### 3. Image Optimization

Use the built-in `{{image}}` helper to generate highly optimized tags:

```handlebars
{{image 
  src="/hero.jpg" 
  alt="Hero Image" 
  width=1200 
  height=630
  placeholder="blur"
  formatNegotiation=true
}}
```

## ⏳ Advanced Features

### Static Site Generation (SSG)

Prism can crawl your routes and generate a fully static site:

```typescript
const ssg = core.container.resolve('ssg')

// Full export
await ssg.export('./dist', 'https://example.com')

// Incremental export (fast rebuilds)
await ssg.exportIncremental('./dist', { incremental: true })
```

### Dynamic Route Resolution

Handle static generation for dynamic paths like `/blog/[slug]`:

```typescript
await ssg.exportDynamic([
  {
    pattern: '/blog/[slug]',
    getStaticPaths: async () => {
      const posts = await db.getPosts()
      return posts.map(p => ({ params: { slug: p.slug } }))
    }
  }
], './dist')
```

## 🛠️ Supported Image CDNs

Prism integrates with popular CDNs for on-the-fly transformations:
- **Cloudinary**: `createCloudinaryLoader({ cloudName: '...' })`
- **imgix**: `createImgixLoader({ domain: '...' })`
- **Vercel**: `vercelLoader` (built-in)

## 🧩 API Reference

- `view.render(name, data)`: Render a template file.
- `view.registerHelper(name, fn)`: Add custom template helpers.
- `ssg.export(outDir, baseUrl)`: Export site to static files.
- `ImageService`: Core logic for generating optimized image tags.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT © Carl Lee
