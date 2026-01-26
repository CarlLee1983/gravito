# @gravito/impulse-bridge 🌉

**Impulse** (後端) 與 **前端** (Inertia/Prism) 之間的驗證橋樑。

`@gravito/impulse-bridge` 是一個同步層，讓你能夠將後端的 `FormRequest` 驗證規則、欄位定義與錯誤訊息共享給前端組件。它確保了整個技術棧中驗證邏輯的「單一事實來源」(Single Source of Truth)。

## 🌟 核心功能

- **藍圖共享 (Blueprint Sharing)**：自動將 `FormRequest` 類別序列化為前端可讀取的「藍圖」。
- **Inertia.js 整合**：完美支援透過 Inertia 的共享屬性 (Shared Props) 分派藍圖。
- **中間件支援**：可透過中間件在全域或特定路由中註冊並共享多個表單藍圖。
- **零重複邏輯**：在伺服器端使用 TypeScript 定義一次驗證規則，即可讓前端直接用於即時驗證。

## 🛠️ 安裝

```bash
bun add @gravito/impulse-bridge
```

## 🚀 使用方式

### 1. 在控制器中手動共享

你可以直接在控制器方法中共享特定的 `FormRequest` 藍圖。

```typescript
import { ImpulseBridge } from '@gravito/impulse-bridge';
import { RegisterRequest } from './requests/RegisterRequest';

export class AuthController {
  async showRegister(ctx: GravitoContext) {
    // 使用鍵名 'register' 共享藍圖
    ImpulseBridge.share(ctx, 'register', RegisterRequest);

    return ctx.inertia('Auth/Register');
  }
}
```

### 2. 使用中間件

為一組路由自動共享藍圖。

```typescript
import { impulseBridgeMiddleware } from '@gravito/impulse-bridge';
import { ContactRequest } from './requests/ContactRequest';

router.group({
  middleware: [
    impulseBridgeMiddleware({
      contact: ContactRequest,
    }),
  ],
}, () => {
  router.get('/contact', 'ContactController@show');
});
```

### 3. 前端使用

在前端 (Inertia.js) 中，藍圖將可在 `blueprints` 共享屬性中取得：

```javascript
// 在 React 組件中的範例
const { blueprints } = usePage().props;
const registerBlueprint = blueprints.register;

// 搭配你的前端驗證庫使用 (例如 @gravito/prism-form)
```

## 📦 同儕依賴 (Peer Dependencies)

- `@gravito/core`: Gravito 微核心。
- `@gravito/impulse`: 驗證與表單處理引擎。

## 📄 授權條款

MIT © Carl Lee
