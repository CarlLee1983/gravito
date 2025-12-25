---
title: Template Engine (Prism)
description: Learn how to use Gravito's native template engine for elegant server-side rendering.
---

# Template Engine (Prism)

Prism is the high-performance template engine built into Gravito. While inspired by Handlebars for simple data binding, it also supports a powerful directive system similar to **Laravel Blade**, including layout inheritance, components, and stacks.

This is perfect for scenarios requiring peak SEO performance, Landing Pages, or email templates.

## Displaying Data

You can use double curly braces to display variables passed from your controller:

```html
<h1>Hello, {{ name }}</h1>
```

### Displaying Unescaped Data

By default, `{{ }}` automatically performs HTML escaping to prevent XSS attacks. If you need to display raw HTML, use triple curly braces:

```html
<div class="content">
  {{{ rawHtmlContent }}}
</div>
```

## Directives

Prism provides fluent directives for handling logic.

### If Statements

You can use `@if`, `@else`, and `@endif` directives:

```html
@if (isAdmin)
  <p>Welcome back, Admin!</p>
@else
  <p>Hello, User.</p>
@endif
```

And the `@unless` directive (renders unless the condition is true):

```html
@unless (isGuest)
  <p>You are logged in.</p>
@endunless
```

### Loops

Currently, loops use the `{{#each}}` syntax:

```html
<ul>
  {{#each items}}
    <li>{{ this }}</li>
  {{/each}}
</ul>

{{#each users}}
  <p>User: {{ name }} ({{ email }})</p>
{{/each}}
```

## Components

Components allow you to create reusable UI blocks.

### Defining Components

Store components in the `src/views/components` directory. For example, `src/views/components/alert.html`:

```html
<div class="alert alert-{{ type }}">
  <div class="icon">{{ icon }}</div>
  <div class="content">
    {{ slot }}
  </div>
</div>
```

### Using Components

Use the `<x-` prefix in any template:

```html
<x-alert type="danger" icon="⚠️">
  This is a critical error!
</x-alert>
```

### Named Slots

Components support multiple slots. Define them using `<x-slot:name>`:

```html
<!-- Component: src/views/components/modal.html -->
<div class="modal">
  <div class="header">{{ title }}</div>
  <div class="body">{{ slot }}</div>
  <div class="footer">{{ footer }}</div>
</div>

<!-- Usage -->
<x-modal>
  <x-slot:title>Confirm Delete</x-slot:title>
  
  Are you sure you want to delete this item?
  
  <x-slot:footer>
    <button>Cancel</button>
    <button>Confirm</button>
  </x-slot:footer>
</x-modal>
```

## Layouts

Prism supports a full layout inheritance pattern, very similar to Laravel Blade.

### 1. Defining a Layout (`src/views/layouts/app.html`)

Use `@yield` to reserve content sections, and `@stack` for script or style sections:

```html
<!DOCTYPE html>
<html>
<head>
  <title>@yield('title', 'Default Title')</title>
  @stack('styles')
</head>
<body>
  <nav>Navbar</nav>

  <main>
    @yield('content')
  </main>

  @stack('scripts')
</body>
</html>
```

### 2. Using a Layout (`src/views/home.html`)

Use `@extends` to specify the layout and `@section` to fill content:

```html
@extends('layouts/app')

@section('title', 'Home')

@section('content')
  <h1>Welcome to Gravito</h1>
  <p>This is the home page content.</p>
@endsection

@push('scripts')
  <script src="/js/home.js"></script>
@endpush
```

## Stacks

Stacks allow you to "push" content into specific sections defined in your layout. This is especially useful for adding specific JavaScript files from subviews.

```html
<!-- Push in a subview -->
@push('scripts')
  <script>console.log('Sub-view script loaded');</script>
@endpush

<!-- Output in layout -->
@stack('scripts')
```

## Including Subviews

You can use `@include` to include other template fragments:

```html
@include('partials/header')

<div class="content">
  Main content
</div>

@include('partials/footer')
```

---

## Controller Usage

Rendering views in your controller is straightforward:

```typescript
export class HomeController {
  async index(c: Context) {
    const view = c.get('view');
    
    return c.html(view.render('home', {
      name: 'Carl',
      isAdmin: true
    }));
  }
}
```