# @gravito/signal 🛰️

`@gravito/signal` 是 Gravito 生態系統中功能強大且支援多種驅動程式的電子郵件框架。它提供了一個簡潔、流暢的 API 來構建和發送電子郵件，並支援多種渲染引擎和傳輸驅動程式。

## 🌟 特性

- **流暢的 API**：使用具表現力的 `Mailable` 類別來構建電子郵件內容。
- **多驅動傳輸**：支援 SMTP (Nodemailer)、AWS SES、Log (控制台日誌) 和 Memory (記憶體)。
- **靈活的渲染引擎**：支援使用以下方式渲染郵件內容：
  - 原生 HTML 字串
  - **Prism** (Edge 優化的模板引擎)
  - **React** 組件 (透過 `react-dom/server`)
  - **Vue** 組件 (透過 `@vue/server-renderer`)
- **開發體驗優化**：
  - **開發模式 (Dev Mode)**：在本地開發時攔截電子郵件，而不實際發送。
  - **信箱 UI (Mailbox UI)**：在開發期間透過 `/__mail` 存取攔截到的郵件預覽界面。
- **隊列整合**：內建支援透過 `@gravito/stream` 進行異步郵件發送。
- **國際化 (I18n)**：整合多語系支援，輕鬆發送在地化郵件。
- **類型安全**：完全使用 TypeScript 編寫，提供完善的配置與使用類型定義。

## 📦 安裝

```bash
bun add @gravito/signal
```

### 選用依賴

根據您選擇的傳輸方式或渲染引擎，您可能需要安裝額外的套件：

```bash
# 若使用 AWS SES
bun add @aws-sdk/client-ses

# 若使用 React 組件
bun add react react-dom

# 若使用 Vue 組件
bun add vue @vue/server-renderer
```

## 🚀 快速上手

### 1. 配置 Orbit

在您的 Gravito 應用程式中註冊 `OrbitSignal`：

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitSignal, SmtpTransport } from '@gravito/signal';

const core = new PlanetCore();

const mail = new OrbitSignal({
  from: { name: 'Gravito 支援團隊', address: 'support@example.com' },
  transport: new SmtpTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: { user: '...', pass: '...' }
  }),
  devMode: process.env.NODE_ENV === 'development',
});

mail.install(core);
```

### 2. 建立 Mailable

繼承 `Mailable` 類別來定義您的郵件內容：

```typescript
import { Mailable } from '@gravito/signal';

export class WelcomeEmail extends Mailable {
  constructor(private user: { name: string; email: string }) {
    super();
  }

  build() {
    return this
      .to(this.user.email)
      .subject('歡迎來到 Gravito！')
      .view('emails/welcome', { name: this.user.name });
  }
}
```

### 3. 發送郵件

透過 Gravito Context 存取郵件服務：

```typescript
// 在路由處理器中
const mail = c.get('mail');
await mail.send(new WelcomeEmail(user));
```

## 🛠️ 進階用法

### 使用 React 或 Vue 渲染

您可以使用現代前端框架來設計您的郵件：

```typescript
// React 範例
export class MonthlyReport extends Mailable {
  build() {
    return this
      .subject('您的每月報表')
      .react(ReportComponent, { data: this.data });
  }
}

// Vue 範例
export class InvoiceEmail extends Mailable {
  build() {
    return this
      .subject('發票單號 #12345')
      .vue(InvoiceTemplate, { total: 100 });
  }
}
```

### 隊列發送 (Queueing)

為了提升應用程式效能，建議使用異步隊列發送郵件：

```typescript
const email = new WelcomeEmail(user)
  .onQueue('notifications')
  .delay(60); // 60 秒後發送

await email.queue();
```

### 開發者信箱 (Dev Mailbox)

當啟用 `devMode` 時，`OrbitSignal` 會攔截所有外發郵件並將其存儲在記憶體中。您可以透過瀏覽器訪問 `/__mail` (或您配置的 `devUiPrefix`) 來查看。此界面提供：
- 所有已攔截郵件的列表。
- HTML 與純文字內容預覽。
- 中繼資料查看 (主旨、收件者、寄件者等)。

## 🔧 配置選項

`MailConfig` 物件支援以下選項：

| 選項 | 類型 | 描述 |
|---|---|---|
| `from` | `Address` | 預設寄件者地址。 |
| `transport` | `Transport` | 使用的傳輸驅動程式。 |
| `devMode` | `boolean` | 是否啟用郵件攔截開發模式。 |
| `viewsDir` | `string` | 模板檔案存放目錄。 |
| `devUiPrefix`| `string` | 開發界面 URL 前綴 (預設: `/__mail`)。 |
| `translator` | `Function` | I18n 翻譯函數。 |

## 📄 授權

MIT © Carl Lee
