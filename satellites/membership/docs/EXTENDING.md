# 🛠️ Membership Satellite 擴充與自定義指南

歡迎使用 Gravito 會員系統！本模組設計之初就考慮到了極高的靈活性。您可以透過以下幾種方式，在不修改原始碼的情況下，將此模組轉化為您專屬的服務。

## 1. 視覺與品牌 (Branding)

這是最簡單的自定義方式。

### 更改顏色與名稱
在您的 `PlanetCore` 配置中：
```typescript
core.configure({
  membership: {
    branding: {
      name: '您的專案名稱',
      primary_color: '#FF5733' // 您的品牌主色調
    }
  }
})
```

### 覆寫郵件模板
本模組使用 Prism 模板引擎。如果您想更換郵件設計，**不需要**更動本模組。
只需在您的專案根目錄下建立對應檔案：
- `views/emails/welcome.html`
- `views/emails/reset_password.html`

系統會自動優先讀取您的檔案。您可以在模板中使用 `{{ branding.name }}` 等變數來保持同步。

---

## 2. 業務邏輯擴充 (Hooks)

如果您想在特定動作發生時「順便」做些什麼，請使用 Hook。

### 範例：註冊成功後發送 Slack 通知
在您的 `ServiceProvider` 中：
```typescript
core.hooks.addAction('membership:registered', async ({ member }) => {
  // 調用您的 Slack API
  await mySlackService.notify(`新用戶註冊: ${member.email}`);
});
```

---

## 3. 深度行為替換 (Container Override)

如果您覺得預設的登入邏輯不符合需求（例如：您想增加圖形驗證碼檢查），您可以直接替換 UseCase。

### 步驟 A：繼承並擴充
```typescript
import { LoginMember } from '@gravito/satellite-membership'

export class MyCustomLogin extends LoginMember {
  async execute(input) {
    // 1. 執行您的自定義驗證
    if (!await checkCaptcha(input.captcha)) {
      throw new Error('驗證碼錯誤');
    }
    // 2. 調用父類別完成標準登入
    return super.execute(input);
  }
}
```

### 步驟 B：重新註冊
在您的 `bootstrap` 過程中：
```typescript
core.container.singleton('membership.login', () => new MyCustomLogin(core));
```

---

## 4. 數據擴充 (Metadata)

您不需要為會員資料表增加欄位（如：電話、地址）。

### 存入自定義資料
```typescript
const update = container.make('membership.update-settings')
await update.execute({
  memberId: '...',
  metadata: {
    phone: '0912345678',
    address: '台北市...',
    preferences: { theme: 'dark' }
  }
})
```
這些資料會以 JSON 格式存儲於 `metadata` 欄位中，並隨時可以透過 `member.metadata.phone` 讀取。

---

## 🎯 DX 小貼士
- **本地預覽**: 啟動 `devMode: true`，所有發出的郵件都會在 Console 印出，並可在 `/__mail` 介面預覽。
- **類型安全**: 建議始終使用 `MemberDTO` 來進行前端數據交換，確保敏感資料（如 Password Hash）不會洩漏。

希望這份指南能幫助您快速打造出完美的會員系統！🚀
