# 🚀 Gravito 1.0 極簡整合腳手架

這是 Gravito 核心生態系的官方整合範例。它體現了 **「架構複雜、操作簡單」** 的核心哲學。

## 🌟 核心特色：三文件法則
您只需要關注三個文件即可完成電商網站的組裝與啟動：

1.  **`package.json`**: 宣告您需要的衛星套件 (Satellites)。
2.  **`src/config/gravito.config.ts`**: 您的控制台，用來宣告要啟動哪些功能模組。
3.  **`src/entry-server.ts`**: 點火入口，一行代碼啟動全系統。

---

## 🛠️ 快速開始

### 1. 安裝依賴
確保您在 Monorepo 根目錄執行過 `bun install`。

### 2. 配置功能清單
打開 `src/config/gravito.config.ts`：
```typescript
export default {
  name: '我的旗艦店',
  modules: [
    'catalog',    // 開啟商品系統
    'membership', // 開啟會員系統
    'analytics',  // 開啟分析報表
    'cms',        // 開啟公告與新聞
    'support'     // 開啟即時客服
  ]
};
```

### 3. 啟動開發伺服器
```bash
bun run dev
```
啟動後，後端 API (`/api/v1/...`) 與 WebSocket 客服將自動就緒。

---

## 🏗️ 模組自動發現機制
當您在 `modules` 清單中新增一個 ID 時，Gravito 框架會自動完成以下工作：
- **後端**: 自動尋找該套件的 `ServiceProvider` 並進行 DDD 依賴注入。
- **管理端**: `AdminShell` 會自動偵測新模組並在導覽列生成對應按鈕。
- **事件**: 跨模組的領域事件（Domain Events）會自動透過 `OrbitSignal` 完成連接。

---

## 📂 目錄結構
```text
.
├── src/
│   ├── config/
│   │   └── gravito.config.ts  # 這是您唯一需要頻繁改動的地方
│   ├── entry-server.ts        # 後端啟動邏輯
│   └── entry-admin.tsx        # 管理後台 UI 組裝入口
├── package.json
└── tsconfig.json
```
