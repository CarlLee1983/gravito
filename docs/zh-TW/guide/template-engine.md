---
title: 樣版引擎
description: 學習如何使用 Gravito 的原生樣版引擎進行服務端渲染。
---

# 🎨 樣版引擎 (Orbit View)

雖然 Gravito 擅長使用 Inertia.js 構建現代 SPA，但它也包含了一個強大、輕量的原生樣版引擎，用於傳統的服務端渲染 (MPA)。這非常適合簡單的 Landing Page、電子郵件模板，或需要極致 SEO 性能且無客戶端 JavaScript 開銷的應用。

## 🚀 概覽

Gravito View Engine 的靈感來自 Mustache 和 Handlebars，提供了一種無邏輯的語法，鼓勵關注點分離。它支援：

- **變數**: `{{ name }}`
- **條件判斷**: `{{#if isAdmin}} ... {{/if}}`
- **迴圈**: `{{#each users}} ... {{/each}}`
- **局部視圖 (Partials)**: `{{ include 'partials/footer' }}`
- **安全性**: 自動 HTML 轉義以防止 XSS 攻擊。

## 📦 使用方法

要在控制器中渲染視圖，請從上下文中獲取 `view` 服務。

```typescript
import type { Context } from 'hono'
import type { PlanetCore } from 'gravito-core'

export class HomeController {
  constructor(private core: PlanetCore) {}

  index = (c: Context) => {
    // 1. 獲取 View 服務
    const view = c.get('view')

    // 2. 渲染樣版
    // 第一個參數是相對於 `src/views` 的路徑
    // 第二個參數是傳遞給視圖的數據
    return c.html(view.render('home', {
      title: '歡迎回家',
      visitors: 1024,
      features: ['快速', '簡單', '安全']
    }))
  }
}
```

## 📂 目錄結構

按照慣例，所有視圖樣版都存儲在 `src/views` 目錄中。

```bash
src/
  views/
    layouts/
      main.html
    partials/
      header.html
      footer.html
    home.html
    about.html
```

## 📝 語法指南

### 變數 (Variables)

顯示從控制器傳遞的數據。

```html
<h1>你好, {{ name }}!</h1>
<p>訪問次數: {{ visitors }}</p>
```

### 條件判斷 (`#if`)

僅當值為真時渲染內容。

```html
{{#if showBanner}}
  <div class="banner">限時優惠！</div>
{{/if}}

{{#if user}}
  <p>歡迎回來, {{ user.name }}</p>
{{/if}}
```

### 迴圈 (`#each`)

遍歷陣列。

```html
<ul>
  {{#each items}}
    <li>{{ this }}</li>
  {{/each}}
</ul>

<table>
  {{#each users}}
    <tr>
      <td>{{ name }}</td>
      <td>{{ email }}</td>
    </tr>
  {{/each}}
</table>
```

### 引入 (Includes)

重用像頁首和頁尾這樣的通用組件。引入的路徑是相對於 `src/views` 的。

```html
<!-- src/views/home.html -->
{{ include 'partials/header' }}

<main>
  <h1>頁面內容</h1>
</main>

{{ include 'partials/footer' }}
```

## 🧩 佈局模式 (Layout Pattern)

Gravito 視圖支援透過「內容注入」進行組合。你先渲染內部內容，然後將其傳遞給佈局樣版。

### 1. 建立佈局 (`src/views/layouts/main.html`)

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
</head>
<body>
  {{ include 'partials/header' }}

  <div class="container">
    <!-- 內容將被注入到這裡 -->
    {{ content }}
  </div>

  {{ include 'partials/footer' }}
</body>
</html>
```

### 2. 建立頁面 (`src/views/home.html`)

```html
<div class="hero">
  <h1>{{ headline }}</h1>
  <p>{{ description }}</p>
</div>
```

### 3. 在控制器中渲染

```typescript
export class HomeController {
  index = (c: Context) => {
    const view = c.get('view')

    // 1. 先渲染內部頁面
    const content = view.render('home', {
      headline: '歡迎來到 Gravito',
      description: '後端開發的未來。'
    })

    // 2. 渲染佈局，並傳遞內部內容
    return c.html(view.render('layouts/main', {
      title: '首頁',
      content: content
    }))
  }
}
```

這種模式讓你可以完全控制頁面的組合方式，而無需複雜的繼承邏輯。

---

> **提示**: 對於更複雜的 UI 需求，請考慮使用 Gravito 完全支援的 **Inertia.js** (React/Vue)。原生 View Engine 最適合用於靜態內容、電子郵件和簡單頁面。
