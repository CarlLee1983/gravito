# 請求 (Requests)

Gravito 的 `GravitoRequest` 物件提供了一種與引擎無關的方式來與應用程式處理的當前 HTTP 請求進行互動。

## 存取請求數據

### 取得輸入值

您可以使用幾種簡便的方法來存取使用者的輸入。無論 HTTP 動作為何，都可以使用這些方法：

#### 取得 JSON 數據
```typescript
const body = await c.req.json();
```

#### 取得查詢字串 (Query String)
```typescript
const name = c.req.query('name'); // 單一值
const allQueries = c.req.queries(); // 所有查詢參數
```

#### 取得路由參數 (Route Parameters)
```typescript
const id = c.req.param('id');
```

#### 取得表單數據 (Multipart/Urlencoded)
```typescript
const formData = await c.req.formData();
const body = await c.req.parseBody();
```

### 檢查請求路徑與方法

```typescript
// 取得路徑 (不含查詢字串)
const path = c.req.path; // e.g. /users/1

// 取得完整 URL
const url = c.req.url;

// 取得 HTTP 方法
const method = c.req.method; // GET, POST, etc.
```

## 請求標頭 (Headers)

您可以使用 `header` 方法從請求中擷取標頭：

```typescript
const type = c.req.header('Content-Type');

// 獲取所有標頭
const allHeaders = c.req.header();
```

## 檔案上傳

處理檔案上傳時，您可以使用 `parseBody` 或 `formData`：

```typescript
const body = await c.req.parseBody();
const image = body['photo']; // 這是一個 File 物件
```

## 取得驗證過的數據

如果您使用了 Form Request 進行驗證，可以使用 `valid()` 方法取得乾淨的數據：

```typescript
const data = c.req.valid('json');
```
