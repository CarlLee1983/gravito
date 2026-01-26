# @gravito/nebula

> Galaxy 架構的標準儲存 Orbit。輕量、多磁碟支援且可插拔。

[![npm version](https://img.shields.io/npm/v/@gravito/nebula.svg)](https://www.npmjs.com/package/@gravito/nebula)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/nebula** 為 Gravito 應用程式提供統一的檔案儲存抽象層。基於 **Orbit** 模式，它充當核心微核心與各種儲存後端（本地、S3、記憶體等）之間的橋樑，支援多磁碟配置並透過 Hook 系統提供高度可擴展性。

## ✨ 特性

- 🪐 **Orbit 整合** - 無縫插入 PlanetCore 微核心。
- 💽 **多磁碟支援** - 在單個應用程式中管理多個儲存後端（磁碟）。
- 🔌 **可插拔驅動** - 內建支援 `local`、`memory` 與 `null` 驅動，並支援輕鬆實作 `custom` 驅動。
- 🪝 **強大的 Hooks** - 使用 Gravito 的異步 Hook 系統攔截並修改儲存操作（上傳、刪除等）。
- 🏢 **企業級設計** - 在 IoC 容器中自動註冊服務，並提供 Context 感知的中間件。
- 🧪 **測試友善** - 包含 `MemoryStore`，用於快速、無副作用的單元測試。
- 🚀 **現代化** - 專為 **Bun** 構建，原生支援 TypeScript。

## 📦 安裝

```bash
bun add @gravito/nebula
```

## 🚀 快速上手

### 1. 初始化與 PlanetCore 整合

```typescript
import { PlanetCore } from '@gravito/core';
import orbitStorage from '@gravito/nebula';

const core = new PlanetCore();

// 使用選項快速安裝
const storage = orbitStorage(core, {
  default: 'local',
  disks: {
    local: {
      driver: 'local',
      root: './uploads',
      baseUrl: '/uploads'
    }
  }
});
```

### 2. 在路由中使用（中間件）

Nebula 會自動將 `storage` 管理器注入請求上下文（Context）：

```typescript
core.app.post('/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  
  if (file instanceof File) {
    const storage = c.get('storage'); // 從上下文中解析
    await storage.put(`avatars/${file.name}`, file);
    
    return c.json({ 
      success: true, 
      url: storage.getUrl(`avatars/${file.name}`) 
    });
  }
  
  return c.text('No file uploaded', 400);
});
```

## 🔧 多磁碟配置

您可以定義多個磁碟並在運行時切換：

```typescript
const storage = orbitStorage(core, {
  default: 'local',
  disks: {
    local: { driver: 'local', root: './uploads', baseUrl: '/uploads' },
    temp: { driver: 'memory' },
    s3: {
      driver: 'custom',
      store: new S3Store({ bucket: 'my-bucket' })
    }
  }
});

// 使用 'local' (預設)
await storage.put('hello.txt', 'world');

// 明確使用 's3' 磁碟
await storage.disk('s3').put('backup.zip', data);
```

## 📖 API 參考

### `StorageManager`

透過 `c.get('storage')` 存取或由 `orbitStorage()` 回傳的中央管理器。

- **`disk(name?: string)`**: 存取特定的磁碟倉庫。
- **`put(key, data)`**: 儲存內容（預設磁碟）。
- **`get(key)`**: 取得內容為 `Blob`（預設磁碟）。
- **`delete(key)`**: 刪除檔案（預設磁碟）。
- **`exists(key)`**: 檢查檔案是否存在（預設磁碟）。
- **`copy(from, to)`**: 複製檔案（預設磁碟）。
- **`move(from, to)`**: 移動/重新命名檔案（預設磁碟）。
- **`getUrl(key)`**: 取得公開 URL（預設磁碟）。
- **`getSignedUrl(key, expires)`**: 取得臨時簽名 URL（預設磁碟）。
- **`getMetadata(key)`**: 取得檔案元數據（大小、MIME 類型等）。
- **`list(prefix?)`**: 列出檔案（異步叠代器）。

### `StorageRepository`

由 `storage.disk('name')` 回傳。實作與上述相同的儲存方法，但範圍限定於該特定磁碟。

## 🪝 Hooks

Nebula 在其生命週期中觸發各種 Hook：

| Hook | 類型 | 上下文 | 描述 |
|------|------|---------|-------------|
| `storage:init` | Action | `{ manager }` | 初始化時觸發 |
| `storage:upload` | Filter | `data, { key }` | 在儲存前修改資料 |
| `storage:uploaded`| Action | `{ key }` | 儲存成功後觸發 |
| `storage:hit` | Action | `{ key }` | 找到/取得檔案時觸發 |
| `storage:miss` | Action | `{ key }` | 找不到檔案時觸發 |
| `storage:deleted` | Action | `{ key }` | 檔案刪除後觸發 |

### 範例：圖片縮放

```typescript
core.hooks.addFilter('storage:upload', async (data, context) => {
  if (context.key.match(/\.(jpg|png)$/)) {
    return await myImageProcessor.resize(data, 800);
  }
  return data;
});
```

## 🔌 自定義驅動

實作 `StorageStore` 介面來建立您自己的後端：

```typescript
import type { StorageStore, StorageMetadata } from '@gravito/nebula';

class MyCustomStore implements StorageStore {
  async put(key: string, data: Blob | Buffer | string): Promise<void> { /* ... */ }
  async get(key: string): Promise<Blob | null> { /* ... */ }
  async delete(key: string): Promise<boolean> { /* ... */ }
  async exists(key: string): Promise<boolean> { /* ... */ }
  getUrl(key: string): string { /* ... */ }
  // ... 實作其他方法
}
```

## 🔄 從 v3.x 遷移

Nebula v4.0 引入了 **Manager** 模式以支援多磁碟。

- **破壞性變更**：配置結構已移至 `disks` 屬性下。
- **相容性**：舊的扁平配置格式仍然支援，但會觸發棄用警告。
- **類型變更**：`StorageProvider` 現已更名為 `StorageStore`，`LocalStorageProvider` 更名為 `LocalStore`。

## 🤝 貢獻

歡迎提交貢獻、問題與功能請求！
請隨時查看 [Issues 頁面](https://github.com/gravito-framework/gravito/issues)。

## 📝 授權

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
