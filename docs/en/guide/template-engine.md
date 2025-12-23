---
title: Template Engine
description: Learn how to use Gravito's native template engine for server-side rendering.
---

# 🎨 Template Engine (Orbit View)

While Gravito excels at building modern SPAs with Inertia.js, it also includes a powerful, lightweight native template engine for traditional server-side rendering (MPA). This is perfect for simple landing pages, emails, or applications requiring maximum SEO performance with zero client-side JavaScript overhead.

## 🚀 Overview

The Gravito View Engine is inspired by Mustache and Handlebars, providing a logic-less syntax that encourages separation of concerns. It supports:

- **Variables**: `{{ name }}`
- **Conditionals**: `{{#if isAdmin}} ... {{/if}}`
- **Loops**: `{{#each users}} ... {{/each}}`
- **Partials/Includes**: `{{ include 'partials/footer' }}`
- **Security**: Automatic HTML escaping to prevent XSS.

## 📦 Usage

To render a view from your controller, retrieve the `view` service from the context.

```typescript
import type { Context } from 'hono'
import type { PlanetCore } from 'gravito-core'

export class HomeController {
  constructor(private core: PlanetCore) {}

  index = (c: Context) => {
    // 1. Get the View Service
    const view = c.get('view')

    // 2. Render a template
    // The first argument is the path relative to `src/views`
    // The second argument is the data to pass to the view
    return c.html(view.render('home', {
      title: 'Welcome Home',
      visitors: 1024,
      features: ['Fast', 'Simple', 'Secure']
    }))
  }
}
```

## 📂 Directory Structure

By convention, all view templates are stored in the `src/views` directory.

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

## 📝 Syntax Guide

### Variables

Display data passed from the controller.

```html
<h1>Hello, {{ name }}!</h1>
<p>Visits: {{ visitors }}</p>
```

### Conditionals (`#if`)

Render content only if a value is truthy.

```html
{{#if showBanner}}
  <div class="banner">Special Offer!</div>
{{/if}}

{{#if user}}
  <p>Welcome back, {{ user.name }}</p>
{{/if}}
```

### Loops (`#each`)

Iterate over arrays.

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

### Includes (Partials)

Reuse common components like headers and footers. The included file path is relative to `src/views`.

```html
<!-- src/views/home.html -->
{{ include 'partials/header' }}

<main>
  <h1>Page Content</h1>
</main>

{{ include 'partials/footer' }}
```

## 🧩 Layout Pattern

Gravito views support composition through "Content Injection". You render the inner content first, then pass it to a layout template.

### 1. Create a Layout (`src/views/layouts/main.html`)

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
</head>
<body>
  {{ include 'partials/header' }}

  <div class="container">
    <!-- The content will be injected here -->
    {{ content }}
  </div>

  {{ include 'partials/footer' }}
</body>
</html>
```

### 2. Create a Page (`src/views/home.html`)

```html
<div class="hero">
  <h1>{{ headline }}</h1>
  <p>{{ description }}</p>
</div>
```

### 3. Render in Controller

```typescript
export class HomeController {
  index = (c: Context) => {
    const view = c.get('view')

    // 1. Render the inner page first
    const content = view.render('home', {
      headline: 'Welcome to Gravito',
      description: 'The future of backend development.'
    })

    // 2. Render the layout, passing the inner content
    return c.html(view.render('layouts/main', {
      title: 'Home Page',
      content: content
    }))
  }
}
```

This pattern gives you complete control over how pages are composed without complex inheritance logic.

---

> **Tip**: For more complex UI requirements, consider using **Inertia.js** (React/Vue) which is fully supported by Gravito. The native View Engine is best suited for static content, emails, and simple pages.
