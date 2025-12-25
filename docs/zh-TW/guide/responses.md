# 回應 (Responses)

Gravito 提供了多種方式來建立 HTTP 回應。控制器的每個方法都必須回傳一個 `Response` 物件。

## 建立回應

### JSON 回應

`json` 方法會自動將給定數據序列化為 JSON，並設定正確的 `Content-Type` 標頭：

```typescript
return c.json({
  name: 'Carl',
  state: 'Taiwan'
});
```

您也可以指定 HTTP 狀態碼：

```typescript
return c.json({ error: 'Unauthorized' }, 401);
```

### HTML 與 文字回應

```typescript
// 回傳 HTML
return c.html('<h1>Hello World</h1>');

// 回傳純文字
return c.text('Hello World');
```

### 重新導向 (Redirects)

重新導向回應讓您可以將使用者導向另一個 URL：

```typescript
return c.redirect('/home');

// 帶有特定狀態碼
return c.redirect('/login', 301);
```

## 其他回應類型

### 串流回應 (Streams)

對於大型檔案或即時生成的數據，可以使用串流：

```typescript
const stream = new ReadableStream({ /* ... */ });
return c.stream(stream);
```

### 404 與其他錯誤輔助方法

```typescript
return c.notFound('找不到該內容');
return c.forbidden('權限不足');
return c.unauthorized();
return c.badRequest('無效的請求');
```

## 回應標頭 (Headers)

您可以在回傳回應前使用 `header` 方法來設定標頭：

```typescript
c.header('X-Custom-Header', 'Value');
c.header('Cache-Control', 'no-cache');

return c.json({ success: true });
```

## 設定狀態碼

```typescript
c.status(201);
return c.json({ message: 'Created' });
```
