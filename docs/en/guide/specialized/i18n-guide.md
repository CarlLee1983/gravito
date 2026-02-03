---
title: Internationalization (I18n)
description: Scalable multilingual support for Gravito applications.
---

# Internationalization (I18n)

Gravito makes building global applications easy. Our I18n system is designed to be type-safe, performant, and "developer-centric."

---

## How to Add a New Language

Expanding your application's reach is a 3-step process. Let's add Japanese (`ja`) support as an example.

### 1. Create the Translation File
Create a new file in `src/locales/ja.ts`. We recommend using TypeScript so you get auto-completion in your views!

```typescript
// src/locales/ja.ts
export default {
  site: {
    title: 'Gravito フレームワーク',
    description: '高性能バックエンド'
  },
  nav: {
    home: 'ホーム',
    docs: 'ドキュメント'
  }
}
```

### 2. Register in I18nService
Open `src/services/I18nService.ts` and add your new locale to the map.

```typescript
import en from '../locales/en'
import zh from '../locales/zh'
import ja from '../locales/ja' //  Import new file

export type Locale = 'en' | 'zh' | 'ja' //  Add to Type
export type Translation = typeof en

const locales: Record<Locale, Translation> = { en, zh, ja } //  Register here

export const getTranslation = (locale: string): Translation => {
  return locales[locale as Locale] || locales.en
}
```

### 3. Update the Router (If using prefixing)
If your site uses URL prefixes (like `/ja/about`), update your route registration in `src/routes/index.ts`.

```typescript
// Example of a prefixed group
router.prefix('/:locale(en|zh|ja)').group((r) => {
  r.get('/', [HomeController, 'index'])
  r.get('/about', [HomeController, 'about'])
})
```

---

## Usage in Controllers

**Gravito Core middleware** automatically handles the locale detection. You just need to fetch the right strings.

```typescript
import { getTranslation } from '../services/I18nService'

export class HomeController {
  index = async (c: Context) => {
    const locale = c.get('locale') || 'en'
    const t = getTranslation(locale)
    
    return c.get('inertia').render('Home', { 
      t, 
      currentLocale: locale 
    })
  }
}
```

---

## ⚛ Usage in React Components

When using Inertia, you can pass the translations directly as props. For easier access, you can use a custom hook.

```tsx
// Inside your React component
export default function Home({ t }) {
  return (
    <div>
      <h1>{t.site.title}</h1>
      <p>{t.site.description}</p>
    </div>
  )
}
```

### Creating a Language Switcher
Here is a simple example of a language toggler using Inertia's `<Link />`:

```tsx
import { Link } from '@inertiajs/react'

export function LanguageSwitcher({ currentLocale }) {
  return (
    <div className="flex gap-2">
      <Link href="/en" className={currentLocale === 'en' ? 'active' : ''}>English</Link>
      <Link href="/zh" className={currentLocale === 'zh' ? 'active' : ''}>繁體中文</Link>
      <Link href="/ja" className={currentLocale === 'ja' ? 'active' : ''}>日本語</Link>
    </div>
  )
}
```

---

## Pro Tips

- **Fallback Strategy**: If a key is missing in your new language file, TypeScript will alert you (if you use `typeof en`).
- **SEO Integration**: Remember to update your `seoConfig` to include the new language in your sitemap resolvers if you want Google to index all versions.
- **Nested Keys**: You can organize your translations as deep as you need. The `t` object follows the exact structure of your TypeScript files.
