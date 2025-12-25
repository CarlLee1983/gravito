---
title: 樣板引擎 (Prism)
description: 學習如何使用 Gravito 的原生樣板引擎進行優雅的服務端渲染。
---

# 樣板引擎 (Prism)

Prism 是 Gravito 內建的高效能樣板引擎。雖然它受 Handlebars 的啟發提供簡單的資料綁定，但也同時支援了類似 **Laravel Blade** 的強大指令系統，包含佈局繼承、組件與堆疊 (Stacks)。

這非常適合需要極致 SEO、Landing Page 或郵件樣板的場景。

## 顯示資料 (Displaying Data)

您可以使用雙大括號來顯示從控制器傳遞的變數：

```html
<h1>Hello, {{ name }}</h1>
```

### 顯示未轉義資料

預設情況下，`{{ }}` 會自動進行 HTML 轉義以防止 XSS 攻擊。如果您需要顯示原始 HTML，請使用三大括號：

```html
<div class="content">
  {{{ rawHtmlContent }}}
</div>
```

## 指令 (Directives)

Prism 提供了流暢的指令來處理邏輯判斷。

### If 語句

您可以使用 `@if`, `@else`, `@endif` 指令：

```html
@if (isAdmin)
  <p>歡迎回來，管理員！</p>
@else
  <p>您好，使用者。</p>
@endif
```

以及 `@unless` 指令（除非條件為真，否則顯示）：

```html
@unless (isGuest)
  <p>您已登入。</p>
@endunless
```

### 迴圈 (Loops)

目前迴圈使用 `{{#each}}` 語法：

```html
<ul>
  {{#each items}}
    <li>{{ this }}</li>
  {{/each}}
</ul>

{{#each users}}
  <p>使用者：{{ name }} ({{ email }})</p>
{{/each}}
```

## 組件 (Components)

組件讓您可以建立可重用的 UI 區塊。

### 定義組件

將組件存放在 `src/views/components` 目錄中。例如 `src/views/components/alert.html`：

```html
<div class="alert alert-{{ type }}">
  <div class="icon">{{ icon }}</div>
  <div class="content">
    {{ slot }}
  </div>
</div>
```

### 使用組件

在任何樣板中使用 `<x-` 前綴標籤：

```html
<x-alert type="danger" icon="⚠️">
  這是一個嚴重的錯誤提示！
</x-alert>
```

### 具名插槽 (Named Slots)

組件支援多個插槽。使用 `<x-slot:name>` 定義：

```html
<!-- 組件：src/views/components/modal.html -->
<div class="modal">
  <div class="header">{{ title }}</div>
  <div class="body">{{ slot }}</div>
  <div class="footer">{{ footer }}</div>
</div>

<!-- 使用 -->
<x-modal>
  <x-slot:title>刪除確認</x-slot:title>
  
  您確定要刪除此項目嗎？
  
  <x-slot:footer>
    <button>取消</button>
    <button>確定</button>
  </x-slot:footer>
</x-modal>
```

## 佈局繼承 (Layouts)

Prism 支援完整的佈局繼承模式，這與 Laravel Blade 非常相似。

### 1. 定義佈局 (`src/views/layouts/app.html`)

使用 `@yield` 來預留內容區塊，使用 `@stack` 預留腳本或樣式區塊：

```html
<!DOCTYPE html>
<html>
<head>
  <title>@yield('title', '預設標題')</title>
  @stack('styles')
</head>
<body>
  <nav>導覽列</nav>

  <main>
    @yield('content')
  </main>

  @stack('scripts')
</body>
</html>
```

### 2. 使用佈局 (`src/views/home.html`)

使用 `@extends` 指定佈局，使用 `@section` 填充內容：

```html
@extends('layouts/app')

@section('title', '首頁')

@section('content')
  <h1>歡迎來到 Gravito</h1>
  <p>這是首頁內容。</p>
@endsection

@push('scripts')
  <script src="/js/home.js"></script>
@endpush
```

## 堆疊 (Stacks)

堆疊允許您將內容「推送到」佈局中定義的特定區塊。這對於在子視圖中新增特定的 JavaScript 檔案特別有用。

```html
<!-- 在子視圖中推送 -->
@push('scripts')
  <script>console.log('載入子視圖腳本');</script>
@endpush

<!-- 在佈局中輸出 -->
@stack('scripts')
```

## 引入子視圖 (Includes)

您可以使用 `@include` 包含其他的樣板片段：

```html
@include('partials/header')

<div class="content">
  主內容
</div>

@include('partials/footer')
```

---

## 控制器用法

在控制器中，您可以輕鬆渲染視圖：

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