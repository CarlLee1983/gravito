# @gravito/orbit-inertia

> Inertia.js integration for Gravito - The bridge between backend MVC and frontend SPA.

## 📦 Installation

```bash
bun add @gravito/orbit-inertia
```

## 🎯 What is Inertia.js?

Inertia.js allows you to create fully client-side rendered, single-page apps, without much of the complexity that comes with modern SPAs. It does this by leveraging existing server-side frameworks.

**Key Benefits:**

- Write controllers like traditional MVC
- Get SPA user experience (no page reloads)
- SEO-friendly with server-side rendering
- Use React, Vue, or Svelte on the frontend

---

## 🚀 Quick Start

### 1. Setup the Orbit

```typescript
// gravito.config.ts
import { defineConfig } from 'gravito-core'
import { OrbitInertia } from '@gravito/orbit-inertia'

export default defineConfig({
  config: {
    inertia: {
      rootView: 'app',           // HTML template name
      version: '1.0.0',          // Asset version for cache busting
    }
  },
  orbits: [OrbitInertia]
})
```

### 2. Create HTML Template

```html
<!-- src/views/app.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  {{{ inertiaHead }}}
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>
  <div id="app" data-page="{{ inertiaPage }}"></div>
  <script type="module" src="/js/app.js"></script>
</body>
</html>
```

### 3. Create Controller

```typescript
// src/controllers/HomeController.ts
import { Context } from 'hono'
import { inertia } from '@gravito/orbit-inertia'

export class HomeController {
  index(ctx: Context) {
    return inertia(ctx, 'Home', {
      title: 'Welcome',
      features: ['Fast', 'Light', 'Clean']
    })
  }

  about(ctx: Context) {
    return inertia(ctx, 'About', {
      title: 'About Us',
      team: ['Alice', 'Bob', 'Charlie']
    })
  }
}
```

### 4. Setup Frontend (React)

```tsx
// src/client/app.tsx
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })
    return pages[`./pages/${name}.tsx`]
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  }
})
```

```tsx
// src/client/pages/Home.tsx
import { Head } from '@inertiajs/react'

interface HomeProps {
  title: string
  features: string[]
}

export default function Home({ title, features }: HomeProps) {
  return (
    <>
      <Head title={title} />
      <h1>{title}</h1>
      <ul>
        {features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </>
  )
}
```

---

## 🔄 Content Negotiation

The `inertia()` helper automatically handles content negotiation:

| Request Header | Response Type |
|----------------|---------------|
| `X-Inertia: true` | JSON (for SPA navigation) |
| Regular request | Full HTML (for initial load/crawlers) |

This means:

- **First visit**: User gets server-rendered HTML (great for SEO)
- **Subsequent navigation**: Only JSON payload is sent (fast SPA experience)

---

## 📋 API Reference

### `inertia(ctx, component, props)`

Render an Inertia response.

| Parameter | Type | Description |
|-----------|------|-------------|
| `ctx` | `Context` | Hono request context |
| `component` | `string` | Component name (maps to frontend page) |
| `props` | `object` | Data to pass to the component |

### `OrbitInertia` Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rootView` | `string` | `'app'` | HTML template name |
| `version` | `string` | `'1.0.0'` | Asset version for cache busting |

---

## 🪝 Hooks

| Hook | Trigger | Arguments |
|------|---------|-----------|
| `inertia:render` | Before rendering | `{ component, props }` |
| `inertia:response` | After response created | `{ response }` |

### Example: Add shared props

```typescript
core.hooks.addFilter('inertia:render', async ({ component, props }) => {
  return {
    component,
    props: {
      ...props,
      auth: { user: getCurrentUser() },   // Add auth data
      flash: { success: 'Welcome!' }      // Add flash messages
    }
  }
})
```

---

## 🔗 Links & Navigation

### React

```tsx
import { Link } from '@inertiajs/react'

<Link href="/about">About Us</Link>
<Link href="/users" method="post">Create User</Link>
```

### Form Handling

```tsx
import { useForm } from '@inertiajs/react'

function ContactForm() {
  const { data, setData, post, processing } = useForm({
    email: '',
    message: ''
  })

  const submit = (e) => {
    e.preventDefault()
    post('/contact')
  }

  return (
    <form onSubmit={submit}>
      <input
        value={data.email}
        onChange={(e) => setData('email', e.target.value)}
      />
      <textarea
        value={data.message}
        onChange={(e) => setData('message', e.target.value)}
      />
      <button disabled={processing}>Send</button>
    </form>
  )
}
```

---

## 🎨 Layouts

Create persistent layouts that don't re-render on navigation:

```tsx
// src/client/components/Layout.tsx
import { Link } from '@inertiajs/react'

export default function Layout({ children }) {
  return (
    <div>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
      </nav>
      <main>{children}</main>
      <footer>© 2024 Gravito</footer>
    </div>
  )
}
```

```tsx
// src/client/pages/Home.tsx
import Layout from '../components/Layout'

function Home({ title }) {
  return <h1>{title}</h1>
}

Home.layout = (page) => <Layout>{page}</Layout>

export default Home
```

---

*For more details, see the [Inertia.js documentation](https://inertiajs.com/).*
