# 🛰️ Gravito Satellite: Catalog

這是 Gravito Galaxy Architecture 中的核心商品目錄插件。它負責管理商品的靜態定義、規格（SKUs）以及無限層級的分類樹。

## 🌟 核心功能

- **📦 結構化商品模型**: 區分商品主體 (Product) 與 規格變體 (Variants/SKUs)。
- **🌲 智慧型分類樹**: 使用路徑列 (Materialized Path) 實作，支援無限層級分類，且在移動分類時自動同步所有子孫路徑。
- **🖼️ 媒體整合**: 完美整合 `@gravito/nebula`，自動將存儲 Key 解析為完整的 CDN/本地 URL。
- **🌐 多語系支援**: 名稱與描述預設支援 JSON 格式的 i18n 儲存。
- **🚀 高性能查詢**: 針對大數據量設計，利用索引路徑進行子分類商品的快速檢索。

## 🛠️ API 接口

| 方法 | 路徑 | 說明 |
| :--- | :--- | :--- |
| `GET` | `/api/catalog/products` | 獲取商品列表 (含 SKU) |
| `GET` | `/api/catalog/products/:id` | 獲取單一商品詳情 |
| `POST` | `/api/catalog/products` | 建立商品與多個 SKU (原子化) |
| `GET` | `/api/catalog/categories` | 獲取完整的樹狀分類結構 |

## 🏗️ 領域驅動設計 (DDD) 結構

- **Domain**: 包含 `Category`, `Product`, `Variant` 實體與業務規則。
- **Application**: 提供 `CreateProduct` 與 `UpdateCategory` (含路徑同步) UseCases。
- **Infrastructure**: 基於 `Atlas` 的倉儲實現，支援事務保護。
- **Interface**: 基於 `Photon` 的 RESTful 控制器。

## ⚙️ 安裝與註冊

在您的 `PlanetCore` 中註冊：

```typescript
import { CatalogServiceProvider } from '@gravito/satellite-catalog';

await core.use(new CatalogServiceProvider());
```

## 🧪 驗證

執行全系統校閱測試：
```bash
cd satellites/catalog
bun tests/grand-review.ts
```

---
*Created by Gravito Core Team.*
