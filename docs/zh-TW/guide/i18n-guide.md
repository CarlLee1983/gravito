---
title: 國際化 (I18n)
description: 為 Gravito 應用程式實現可擴展的多語系支援。
---

# 🌐 國際化 (I18n)

Gravito 讓構建全球化應用程式變得簡單。我們的 I18n 系統旨在提供類型安全、高效能且「保姆級」友好的開發體驗。

---

## 🛠️ 如何增加新語言

擴展您的應用程式語系僅需三個簡單步驟。我們以增加「日語 (`ja`)」支援為例：

### 1. 創建翻譯文件
在 `src/locales/ja.ts` 創建一個新文件。我們建議使用 TypeScript，這樣您在視圖中編寫代碼時就能享有自動補全功能！

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

### 2. 在 I18nService 中註冊
打開 `src/services/I18nService.ts` 並將新語言加入映射表。

```typescript
import en from '../locales/en'
import zh from '../locales/zh'
import ja from '../locales/ja' // 👈 導入新文件

export type Locale = 'en' | 'zh' | 'ja' // 👈 加入類型定義
export type Translation = typeof en

const locales: Record<Locale, Translation> = { en, zh, ja } // 👈 在此註冊

export const getTranslation = (locale: string): Translation => {
  return locales[locale as Locale] || locales.en
}
```

### 3. 更新路由規則（如果使用路徑前綴）
如果您的網站使用 URL 前綴（如 `/ja/about`），請更新 `src/routes/index.ts` 中的路由註冊。

```typescript
// 帶有語系前綴的群組範例
router.prefix('/:locale(en|zh|ja)').group((r) => {
  r.get('/', [HomeController, 'index'])
  r.get('/about', [HomeController, 'about'])
})
```

---

## 🚀 在 Controller 中使用

Gravito 的 I18n 軌道會自動處理語言偵測，您只需要獲取正確的字串即可。

```typescript
import { getTranslation } from '../services/I18nService'

export class HomeController {
  index = async (c: Context) => {
    // 從 Context 獲取當前語言
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

## ⚛️ 在 React 組件中使用

使用 Inertia 時，您可以將翻譯直接作為 Props 傳遞。

```tsx
// 在您的 React 組件中
export default function Home({ t }) {
  return (
    <div>
      <h1>{t.site.title}</h1>
      <p>{t.site.description}</p>
    </div>
  )
}
```

### 製作語系切換器 (Language Switcher)
這是一個使用 Inertia `<Link />` 組件的簡單語系切換器範例：

```tsx
import { Link } from '@inertiajs/react'

export function LanguageSwitcher({ currentLocale }) {
  return (
    <div className="flex gap-2">
      <Link href="/en" className={currentLocale === 'en' ? 'font-bold' : ''}>English</Link>
      <Link href="/zh" className={currentLocale === 'zh' ? 'font-bold' : ''}>繁體中文</Link>
      <Link href="/ja" className={currentLocale === 'ja' ? 'font-bold' : ''}>日本語</Link>
    </div>
  )
}
```

---

## 💡 專業提示

- **回退策略 (Fallback)**：如果新語言文件中缺少某個鍵值，TypeScript 會提醒您（前提是您使用了 `typeof en` 進行約束）。
- **SEO 整合**：如果您希望 Google 索引所有版本，請記得更新 `seoConfig` 中的 Sitemap 解析器，將新語言的網址也納入其中。
- **巢狀鍵值**：您可以根據需求進行任意深度的嵌套組織。`t` 對象將完全遵循您 TypeScript 文件的結構。
