# 資料分頁 (Pagination)

在其他框架中，分頁可能非常痛苦。Atlas 讓這一切變得簡單。查詢建構器的 `paginate` 方法會根據當前頁碼自動處理正確的 `limit` 與 `offset`。

## 基礎用法

### 分頁查詢結果

要對結果進行分頁，您可以使用 `paginate` 方法。它會自動檢測當前頁碼，或者您可以專門傳入頁碼。

```typescript
const users = await User.where('votes', '>', 100).paginate(15);
```

傳遞給 `paginate` 的整數是您希望「每頁」顯示的項目數量。

### 分頁模型結果

您也可以對 ORM 模型進行分頁：

```typescript
const posts = await Post.query().paginate(10);
```

## 分頁結果物件 (Paginate Result Object)

`paginate` 方法會返回一個 `PaginateResult<T>` 物件，其中包含您的數據以及關於分頁狀態的元數據：

```json
{
  "data": [...],
  "pagination": {
    "total": 50,
    "perPage": 15,
    "page": 1,
    "totalPages": 4,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 存取數據

```typescript
const result = await User.paginate(15);

console.log(result.data); // User 實例陣列
console.log(result.pagination.total); // 50
```

## 簡易分頁

如果您只需要在 UI 中顯示「下一頁」與「上一頁」連結，而不需要知道總頁數，您可以使用手動的 `skip` 與 `take`：

```typescript
const users = await User.skip(30).take(15).get();
```

## 前端整合

當使用 `@gravito/client` 或 Inertia 時，分頁物件會直接傳遞給您的 React/Vue 組件，這使得渲染分頁導航組件變得輕而易舉。
