---
title: Ether HTML 轉換引擎
description: 基於 Bun 原生 HTMLRewriter 的高效能流式 HTML 轉換引擎。
---

# ☄️ Ether HTML 轉換引擎

`@gravito/ether` 是專為 Gravito 框架打造的高效能 HTML 轉換引擎。它基於 Bun 原生的 `HTMLRewriter`，允許您在不讀取整個文檔到記憶體的情況下，即時修改 HTTP 回應中的 HTML 內容。

---

## ✨ 核心特性

- **原生速度**：利用 Bun 的 C++ SAX-like 解析器，提供極致的效能。
- **流式處理**：採用的流式架構，無論 HTML 文件多大，記憶體佔用始終保持恆定。
- **零依賴**：純 TypeScript 實現，不依賴任何第三方運行時套件。
- **宣告式規則**：使用 CSS 選擇器精確定位並轉換元素、文字與註解。
- **Photon 整合**：原生支援 Photon/Hono 中介軟體。
- **銀河相容**：完美適配 Galaxy Architecture 的 Orbit 模式。

---

## 🚀 快速上手

### 安裝

```bash
bun add @gravito/ether
```

### 基礎轉換範例

```typescript
import { EtherRewriter, createSecurityRule } from '@gravito/ether'

const rewriter = new EtherRewriter()
  .addRule(createSecurityRule({ cspNonce: true }));

const html = '<script>alert("hi")</script>';
const result = await rewriter.transformHtml(html);
// 結果: <script nonce="...">alert("hi")</script>
```

---

## 🛡️ Photon 中介軟體應用

在 Photon 應用中使用 Ether 是最常見的場景，這讓您能對所有輸出的 HTML 進行全域增強。

### 自動注入腳本

```typescript
import { etherMiddleware, createInjectRule } from '@gravito/ether'

app.use('*', etherMiddleware({
  rules: [
    ...createInjectRule({
      headEnd: '<link rel="stylesheet" href="/global.css">',
      bodyEnd: '<script src="/analytics.js"></script>'
    })
  ]
}));
```

### CSP Nonce 管理

Ether 提供專用的中介軟體來自動處理安全策略中的 Nonce 注入：

```typescript
import { cspMiddleware } from '@gravito/ether'

app.use('*', cspMiddleware({
  directives: {
    'script-src': "'self' 'nonce-{nonce}'",
    'style-src': "'self' 'nonce-{nonce}'"
  }
}));
```

---

## 🏗️ 核心組件

### EtherRewriter
核心引擎。採用不可變設計，每次 `addRule()` 都會回傳一個包含新規則的實例。

### EtherPipeline
一組規則的集合，可以根據 URL 模式或請求條件動態啟用。

### TransformRules (轉換規則)
定義了針對元素 (`element`)、文字節點 (`text`) 與註解 (`comments`) 的處理邏輯。

---

## 🎨 內建規則工廠

| 規則名稱 | 功能說明 |
| :--- | :--- |
| `createSecurityRule` | 注入 CSP Nonce、加入 `rel="noopener"` 與資源完整性校驗。 |
| `createSeoRule` | 動態注入 Meta 標籤、OpenGraph 與 Twitter Card 資料。 |
| `createSanitizeRule` | 移除危險腳本與事件處理器（XSS 防護）。 |
| `createLinkRule` | 重寫連結 URL 與屬性。 |
| `createInjectRule` | 在特定位置（如 head 結尾）注入原始 HTML 字串。 |

---

## 📈 效能指標

Ether 專為高併發環境設計：

- **記憶體**：恆定的 O(1) 使用（約 2MB 額外開銷）。
- **延遲**：典型網頁轉換延遲 < 1ms。
- **吞吐量**：在標準硬體上處理 10MB HTML 僅需約 850ms。

---

## 🔗 延伸閱讀

- 🛡️ [安全最佳實踐](../security/security.md)
- 🚀 [Photon Core 引擎](../architecture/photon-core.md)
- 📡 [Xenon 並行運行時](../architecture/xenon-architecture-deep-dive.md)
