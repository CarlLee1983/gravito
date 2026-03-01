# API 參考指南

## 概述

satellite-ad 提供完整的廣告管理與投放 API，分為兩個部分：

- **管理 API** (`/api/admin/v1/ads`) - 後台廣告 CRUD 操作
- **投放 API** (`/api/v1/ads`) - 公開廣告投放接口

所有 API 返回統一的 JSON 格式，支持錯誤碼映射和詳細錯誤訊息。

## 回應格式

### 成功回應

```json
{
  "success": true,
  "data": {
    // 端點特定的返回數據
  }
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "詳細的錯誤訊息"
  }
}
```

## 數據類型定義

### AdDTO（廣告數據傳輸對象）

用於所有 API 回應中的完整廣告信息：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | string | 廣告唯一識別碼（UUID） |
| `slotSlug` | string | 版位標識（如 `HOME_HERO`） |
| `title` | string | 廣告標題 |
| `imageUrl` | string | 廣告圖片 URL |
| `targetUrl` | string | 廣告目標 URL |
| `weight` | number | 投放權重（1-10） |
| `status` | string | 廣告狀態：`draft`、`active`、`paused` |
| `startsAt` | string | 開始時間（ISO 8601） |
| `endsAt` | string | 結束時間（ISO 8601） |
| `isDeliverable` | boolean | 是否可投放（狀態 + 排程） |
| `daysRemaining` | number | 剩餘投放天數 |
| `createdAt` | string | 建立時間（ISO 8601） |
| `updatedAt` | string | 更新時間（ISO 8601） |
| `metadata` | object | 自訂元數據（可選） |

### DeliveredAd（投放廣告輕量信息）

用於 `/delivery` 端點返回的簡化廣告信息：

| 欄位 | 型別 |
|------|------|
| `id` | string |
| `title` | string |
| `imageUrl` | string |
| `targetUrl` | string |
| `slotSlug` | string |
| `weight` | number |

---

## 管理 API

### 1. POST /api/admin/v1/ads - 建立廣告

建立新的廣告。初始狀態為 `draft`，可選擇立即啟用。

**Request Body:**

```json
{
  "slotSlug": "HOME_HERO",
  "title": "春季促銷活動",
  "imageUrl": "https://example.com/image.jpg",
  "targetUrl": "https://example.com/campaign",
  "weight": 5,
  "startsAt": "2026-03-01T00:00:00Z",
  "endsAt": "2026-03-31T23:59:59Z",
  "activateImmediately": false,
  "metadata": {
    "campaign_id": "SPRING_2026"
  }
}
```

**欄位驗證：**

| 欄位 | 規則 |
|------|------|
| `slotSlug` | 必填，大寫字母和底線，格式 `^[A-Z]+(?:_[A-Z]+)*$` |
| `title` | 必填，非空字串，最少 1 個字元 |
| `imageUrl` | 必填，有效的 URL |
| `targetUrl` | 必填，有效的 URL |
| `weight` | 必填，整數，範圍 1-10 |
| `startsAt` | 必填，ISO 8601 日期時間 |
| `endsAt` | 必填，ISO 8601 日期時間，必須 > startsAt |
| `activateImmediately` | 可選，預設 false |
| `metadata` | 可選，任意 JSON 物件 |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slotSlug": "HOME_HERO",
    "title": "春季促銷活動",
    "imageUrl": "https://example.com/image.jpg",
    "targetUrl": "https://example.com/campaign",
    "weight": 5,
    "status": "draft",
    "startsAt": "2026-03-01T00:00:00Z",
    "endsAt": "2026-03-31T23:59:59Z",
    "isDeliverable": false,
    "daysRemaining": 30,
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-01T10:00:00Z",
    "metadata": {
      "campaign_id": "SPRING_2026"
    }
  }
}
```

**可能的錯誤碼：**

| 錯誤碼 | HTTP | 原因 |
|--------|------|------|
| `INVALID_WEIGHT` | 400 | 權重不在 1-10 整數範圍 |
| `INVALID_TITLE` | 400 | 標題為空或只有空白 |
| `INVALID_SCHEDULE` | 400 | `endsAt` <= `startsAt` |
| `INVALID_SLOT` | 400 | 版位 slug 格式不符 |
| `INVALID_URL` | 400 | URL 格式無效 |
| `VALIDATION_ERROR` | 400 | Zod 驗證失敗 |

**cURL 範例：**

```bash
curl -X POST http://localhost:3000/api/admin/v1/ads \
  -H "Content-Type: application/json" \
  -d '{
    "slotSlug": "HOME_HERO",
    "title": "春季促銷",
    "imageUrl": "https://example.com/img.jpg",
    "targetUrl": "https://example.com/sale",
    "weight": 5,
    "startsAt": "2026-03-01T00:00:00Z",
    "endsAt": "2026-03-31T23:59:59Z"
  }'
```

---

### 2. GET /api/admin/v1/ads - 查詢廣告列表

分頁查詢廣告列表，支援狀態和版位篩選。

**Query Parameters:**

| 參數 | 型別 | 規則 | 預設 |
|------|------|------|------|
| `status` | string | `draft` \| `active` \| `paused` | 無（返回所有） |
| `slotSlug` | string | 版位標識 | 無 |
| `limit` | number | 整數，1-100 | 20 |
| `offset` | number | 整數，>= 0 | 0 |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "slotSlug": "HOME_HERO",
        "title": "春季促銷活動",
        "imageUrl": "https://example.com/image.jpg",
        "targetUrl": "https://example.com/campaign",
        "weight": 5,
        "status": "active",
        "startsAt": "2026-03-01T00:00:00Z",
        "endsAt": "2026-03-31T23:59:59Z",
        "isDeliverable": true,
        "daysRemaining": 25,
        "createdAt": "2026-03-01T10:00:00Z",
        "updatedAt": "2026-03-01T10:00:00Z"
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

**cURL 範例：**

```bash
# 查詢所有活躍廣告，分頁
curl "http://localhost:3000/api/admin/v1/ads?status=active&limit=10&offset=0"

# 查詢特定版位的草稿廣告
curl "http://localhost:3000/api/admin/v1/ads?slotSlug=HOME_HERO&status=draft"
```

---

### 3. GET /api/admin/v1/ads/:id - 查詢單一廣告

取得指定 ID 的完整廣告信息。

**Path Parameters:**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | string | 廣告 UUID |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slotSlug": "HOME_HERO",
    "title": "春季促銷活動",
    "imageUrl": "https://example.com/image.jpg",
    "targetUrl": "https://example.com/campaign",
    "weight": 5,
    "status": "active",
    "startsAt": "2026-03-01T00:00:00Z",
    "endsAt": "2026-03-31T23:59:59Z",
    "isDeliverable": true,
    "daysRemaining": 25,
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-01T10:00:00Z"
  }
}
```

**可能的錯誤碼：**

| 錯誤碼 | HTTP | 原因 |
|--------|------|------|
| `AD_NOT_FOUND` | 404 | 廣告 ID 不存在 |

**cURL 範例：**

```bash
curl http://localhost:3000/api/admin/v1/ads/550e8400-e29b-41d4-a716-446655440000
```

---

### 4. PUT /api/admin/v1/ads/:id - 更新廣告

更新廣告信息。所有欄位都是可選的（部分更新）。

**Path Parameters:**

| 參數 | 說明 |
|------|------|
| `id` | 廣告 UUID |

**Request Body（所有欄位可選）：**

```json
{
  "title": "新標題",
  "imageUrl": "https://example.com/new-image.jpg",
  "targetUrl": "https://example.com/new-target",
  "weight": 8,
  "startsAt": "2026-04-01T00:00:00Z",
  "endsAt": "2026-04-30T23:59:59Z"
}
```

**Response (200 OK):**

返回更新後的完整 AdDTO

**可能的錯誤碼：**

| 錯誤碼 | HTTP | 原因 |
|--------|------|------|
| `AD_NOT_FOUND` | 404 | 廣告不存在 |
| `INVALID_TITLE` | 400 | 標題為空 |
| `INVALID_URL` | 400 | URL 無效 |
| `INVALID_WEIGHT` | 400 | 權重超出範圍 |
| `INVALID_SCHEDULE` | 400 | 排程無效 |
| `VALIDATION_ERROR` | 400 | Zod 驗證失敗 |

**cURL 範例：**

```bash
curl -X PUT http://localhost:3000/api/admin/v1/ads/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新後的標題",
    "weight": 8
  }'
```

---

### 5. PATCH /api/admin/v1/ads/:id/status - 切換廣告狀態

改變廣告的狀態（啟用或暫停）。

**Path Parameters:**

| 參數 | 說明 |
|------|------|
| `id` | 廣告 UUID |

**Request Body:**

```json
{
  "action": "activate"
}
```

**狀態轉移規則：**

| 當前狀態 | 允許的操作 | 新狀態 |
|---------|-----------|--------|
| `draft` | `activate` | `active` |
| `active` | `pause` | `paused` |
| `paused` | `activate` | `active` |

**Response (200 OK):**

返回更新後的完整 AdDTO（狀態已改變）

**可能的錯誤碼：**

| 錯誤碼 | HTTP | 原因 |
|--------|------|------|
| `AD_NOT_FOUND` | 404 | 廣告不存在 |
| `INVALID_STATUS_TRANSITION` | 400 | 不允許的狀態轉移 |
| `AD_EXPIRED` | 400 | 嘗試啟用已過期廣告 |
| `VALIDATION_ERROR` | 400 | Zod 驗證失敗 |

**cURL 範例：**

```bash
# 啟用廣告
curl -X PATCH http://localhost:3000/api/admin/v1/ads/550e8400-e29b-41d4-a716-446655440000/status \
  -H "Content-Type: application/json" \
  -d '{"action": "activate"}'

# 暫停廣告
curl -X PATCH http://localhost:3000/api/admin/v1/ads/550e8400-e29b-41d4-a716-446655440000/status \
  -H "Content-Type: application/json" \
  -d '{"action": "pause"}'
```

---

### 6. DELETE /api/admin/v1/ads/:id - 刪除廣告

永久刪除廣告。刪除操作會觸發 `ad:deleted` Hook 事件。

**Path Parameters:**

| 參數 | 說明 |
|------|------|
| `id` | 廣告 UUID |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "廣告 550e8400-e29b-41d4-a716-446655440000 已刪除"
  }
}
```

**可能的錯誤碼：**

| 錯誤碼 | HTTP | 原因 |
|--------|------|------|
| `AD_NOT_FOUND` | 404 | 廣告不存在 |

**cURL 範例：**

```bash
curl -X DELETE http://localhost:3000/api/admin/v1/ads/550e8400-e29b-41d4-a716-446655440000
```

---

## 投放 API

### 7. POST /api/v1/ads/delivery - 投放廣告（POST 方法）

根據版位和數量投放廣告。使用加權隨機算法確保不重複。

**Request Body:**

```json
{
  "slotSlug": "HOME_HERO",
  "count": 3
}
```

**欄位驗證：**

| 欄位 | 規則 |
|------|------|
| `slotSlug` | 必填，大寫字母和底線 |
| `count` | 可選，整數，1-10，預設 1 |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "春季促銷活動",
        "imageUrl": "https://example.com/image.jpg",
        "targetUrl": "https://example.com/campaign",
        "slotSlug": "HOME_HERO",
        "weight": 5
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "夏季新品上市",
        "imageUrl": "https://example.com/image2.jpg",
        "targetUrl": "https://example.com/summer",
        "slotSlug": "HOME_HERO",
        "weight": 3
      }
    ],
    "totalAvailable": 5
  }
}
```

**可能的錯誤碼：**

| 錯誤碼 | HTTP | 原因 |
|--------|------|------|
| `INVALID_SLOT` | 400 | 版位 slug 格式無效 |
| `INVALID_DELIVERY_COUNT` | 400 | 數量不在 1-10 整數範圍 |
| `NO_ACTIVE_ADS` | 404 | 版位無活躍廣告 |
| `VALIDATION_ERROR` | 400 | Zod 驗證失敗 |

**cURL 範例：**

```bash
# 投放 3 則廣告
curl -X POST http://localhost:3000/api/v1/ads/delivery \
  -H "Content-Type: application/json" \
  -d '{
    "slotSlug": "HOME_HERO",
    "count": 3
  }'

# 投放預設 1 則廣告
curl -X POST http://localhost:3000/api/v1/ads/delivery \
  -H "Content-Type: application/json" \
  -d '{"slotSlug": "HOME_HERO"}'
```

---

### 8. GET /api/v1/ads/slots/:slotSlug - 投放廣告（GET 方法）

透過 URL 路徑和查詢參數投放廣告。與 POST 方法功能相同，適合客戶端無法使用 POST 的情況。

**Path Parameters:**

| 參數 | 說明 |
|------|------|
| `slotSlug` | 版位標識 |

**Query Parameters:**

| 參數 | 型別 | 規則 | 預設 |
|------|------|------|------|
| `count` | number | 整數，1-10 | 1 |

**Response (200 OK):**

返回同 POST /api/v1/ads/delivery

**cURL 範例：**

```bash
# 從 HOME_HERO 版位投放 2 則廣告
curl "http://localhost:3000/api/v1/ads/slots/HOME_HERO?count=2"

# 投放 1 則廣告（預設）
curl "http://localhost:3000/api/v1/ads/slots/HOME_HERO"
```

---

## 錯誤碼參考

完整的錯誤碼對應表：

| 錯誤碼 | HTTP | 觸發條件 | 解決方案 |
|--------|------|---------|---------|
| `INVALID_WEIGHT` | 400 | 權重不在 1-10 整數範圍 | 確保 weight 為 1-10 的整數 |
| `INVALID_TITLE` | 400 | 標題為空或只有空白字元 | 提供非空字串標題 |
| `INVALID_SCHEDULE` | 400 | 結束時間 <= 開始時間 | 確保 endsAt > startsAt |
| `INVALID_SLOT` | 400 | 版位 slug 格式不符 `^[A-Z]+(?:_[A-Z]+)*$` | 使用大寫字母和底線（如 HOME_HERO） |
| `AD_NOT_FOUND` | 404 | 查詢或操作的廣告不存在 | 確認 ID 正確，使用 list API 查詢 |
| `INVALID_STATUS_TRANSITION` | 400 | 不允許的狀態轉移 | 參考狀態機：draft/paused -> active，active -> paused |
| `AD_EXPIRED` | 400 | 嘗試啟用排程已過期的廣告 | 更新排程後再啟用 |
| `NO_ACTIVE_ADS` | 404 | 版位無狀態為 active 且排程在活躍期間的廣告 | 建立並啟用新廣告 |
| `INVALID_URL` | 400 | imageUrl 或 targetUrl 格式無效 | 提供完整有效的 URL（包含 protocol） |
| `INVALID_DELIVERY_COUNT` | 400 | 投放數量不在 1-10 整數範圍 | 確保 count 為 1-10 的整數 |
| `VALIDATION_ERROR` | 400 | Zod schema 驗證失敗 | 檢查 error.message 中的欄位提示修正輸入 |
| `INTERNAL_ERROR` | 500 | 伺服器錯誤 | 聯繫系統管理員，檢查伺服器日誌 |

---

## 預定義版位

satellite-ad 支援以下預定義版位（可擴展自訂版位）：

| 版位 | slug | 說明 |
|------|------|------|
| 首頁英雄區 | `HOME_HERO` | 首頁頂部大型廣告 |
| 首頁側邊欄 | `HOME_SIDEBAR` | 首頁右側欄位 |
| 列表頁頂部 | `LIST_HEADER` | 列表頁面頂部 |
| 列表頁中間 | `LIST_MIDDLE` | 列表頁面中間（內容穿插） |
| 詳情頁側邊 | `DETAIL_SIDEBAR` | 詳情頁面側邊欄 |

---

## 使用提示

### HTTP 狀態碼含義

- **200 OK** - 請求成功
- **201 Created** - 資源建立成功
- **400 Bad Request** - 業務邏輯驗證失敗
- **404 Not Found** - 資源不存在
- **500 Internal Server Error** - 伺服器錯誤

### ISO 8601 日期格式

所有日期/時間統一使用 ISO 8601 格式：

```
2026-03-01T10:00:00Z        // UTC 時間
2026-03-01T10:00:00+08:00   // 台灣時間
```

### 分頁最佳實踐

```bash
# 第一頁
curl "http://localhost:3000/api/admin/v1/ads?limit=20&offset=0"

# 第二頁
curl "http://localhost:3000/api/admin/v1/ads?limit=20&offset=20"

# 查詢所有（謹慎使用，可能返回大量數據）
curl "http://localhost:3000/api/admin/v1/ads?limit=1000&offset=0"
```

---

**最後更新：2026-03-01**
**API 版本：0.2.0**
