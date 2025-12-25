# 錯誤處理 (Error Handling)

當您開始一個新的 Gravito 專案時，錯誤與異常處理已經為您配置好了。

## 異常處理器

所有的異常都是由核心的異常處理器處理的。

### 報告異常 (Reporting)

當異常發生時，Gravito 會自動記錄它。如果您想自定義報告邏輯 (例如發送到 Sentry)，可以使用 Hooks (需查閱進階文檔)。

### 渲染異常 (Rendering)

Gravito 會將異常轉換為 HTTP 回應。

- **對於 API 請求**：會自動轉換為 JSON 格式，包含 `error` 欄位。
- **對於網頁請求**：會嘗試渲染 `src/views/errors` 目錄下的視圖。

## HTTP 異常

有些異常描述了來自伺服器的 HTTP 錯誤代碼。例如這可能是一個「頁面未找到」錯誤 (404)，「未授權」錯誤 (401) 或甚至是開發者造成的 500 錯誤。

您可以在應用程式的任何地方使用輔助方法來拋出這些異常：

```typescript
// 404 Not Found
return c.notFound('User not found');

// 403 Forbidden
return c.forbidden();
```

## 自定義 HTTP 錯誤頁面

Gravito 讓您可以輕鬆地為各種 HTTP 狀態碼顯示自定義錯誤頁面。例如，如果您想自定義 404 錯誤頁面，請建立 `src/views/errors/404.html`：

```html
<!-- src/views/errors/404.html -->
@extends('layouts/app')

@section('content')
  <h1>404 - 找不到頁面</h1>
  <p>抱歉，您要找的頁面不存在。</p>
@endsection
```

當應用程式拋出 404 異常時，此視圖將被渲染。支援的預設頁面包括：`404.html` 和 `500.html`。
