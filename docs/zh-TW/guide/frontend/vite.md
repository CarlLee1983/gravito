---
title: 資產打包 (Asset Bundling)
description: 了解 Gravito 如何整合 Vite 進行前端資產的打包與熱更新。
---

# 資產打包 (Asset Bundling)

Gravito 深度整合了 **Vite**，為您的全端開發提供閃擊般的 HMR (Hot Module Replacement) 體驗與生產環境的最佳化打包。

## 目錄結構

在標準的 Gravito 全端專案中，前端代碼通常位於 `src/client`：

```text
src/client/
├── components/      # 共享元件
├── pages/           # 頁面元件 (Inertia)
├── app.ts           # 前端入口點
└── style.css        # 全域樣式
```

## 開發模式

當您執行 `bun dev` 時，Gravito 會同時啟動：
1.  **Gravito 後端引擎**：監聽請求並處理邏輯。
2.  **Vite 開發伺服器**：負責即時編譯並注入前端代碼。

Gravito 內部會自動配置代理，讓您只需訪問一個端口 (預設 3000) 即可享受完整的全端同步。

## 引入資產

### 在樣板中 (MVC/MPA)

如果您使用 `Prism` 或其他樣板引擎，可以使用 `@vite` 指令（或類似輔助函數）來引入 Vite 資源：

```html
<!-- src/views/welcome.hbs -->
<head>
  {{ vite_client }}
  {{ vite_assets "src/client/app.ts" }}
</head>
```

### 在 Inertia.js 中

如果您使用 `Ion` (Inertia 橋接器)，這一切都是全自動的。您只需定義好元件路徑，Gravito 會負責剩餘的事項。

## 生產環境打包

當準備部署時，執行：

```bash
bun build
```

此指令會呼叫 `vite build` 並將優化後的檔案輸出到 `dist/client` 目錄。Gravito 的後端程式碼也會被編譯到 `dist`。

### 設定檔：`vite.config.ts`

您可以像一般的 Vite 專案一樣自定義 `vite.config.ts`。Gravito 透過專屬插件與 Vite 溝通：

```typescript
import { defineConfig } from 'vite';
import { gravito } from '@gravito/core/vite';

export default defineConfig({
  plugins: [
    gravito({
      input: 'src/client/app.ts',
      ssr: 'src/client/ssr.ts',
    }),
  ],
});
```

---

## 接下來
閱讀 [Inertia 開發](./inertia-react.md) 了解如何建構強大的全端 SPA 介面。
