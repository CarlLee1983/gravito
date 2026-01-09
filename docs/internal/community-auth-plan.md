---
title: 社群登入架構規劃
---

# 目標
打造一套社群登入體驗，整合 Passkeys（WebAuthn）、單點登入（SSO/OAuth/OIDC）等現代認證方式，同時可重複利用 Gravito 現有的 `sentinel`、`stasis`、`membership` 等模組。

# 現有資源
- `@gravito/sentinel`：提供守門、中介層、速率限制與 session/cookie 管理，可當作各種認證流程的 guard。
- `@gravito/stasis`：支援鎖、隊列與排程，可用於處理多步驟的登入或帳號合併。
- `satellites/membership`（屬於 `@gravito/satellite-membership`）：負責會員資料、登入/API 路由，可延伸加上第三方登入 UI/API。

# 擴充方向
1. **Passkeys**
   - 在 `sentinel` 增加 WebAuthn credential 層級（建立/驗證 credential、綁定使用者、挑戰/回應流程）。
   - 提供可插拔的 middleware（例如 `passkeysGuard`），讓路由直接套用。
   - 在 membership 星際模組新增 Passkeys API，例如 `POST /auth/passkeys/register` 和 `POST /auth/passkeys/login`，並提供前端資料（challenge, relying party）。
    - **實作草案**
      1. 建 `member_passkeys` 表，儲存 credential ID、公鑰、signCount 與設備描述。
      2. 增加 `PasskeysService`（依賴 `@simplewebauthn/server`）管理註冊/驗證挑戰，並將 challenge 存到 session。
      3. 註冊 `PasskeyController` 路由，提供 `/register/options`, `/register/verify`, `/login/options`, `/login/verify` 四個端點；
         使用 `auth()` middleware 限制註冊、用 `email` 或 memberId 查出資格、最後 `auth.login(member)` 建立 session。
      4. 後續可把這套服務抽出成 `@gravito/passkeys`，讓其他衛星重用。

2. **SSO / OAuth/OIDC**
   - 在 `sentinel` 內部提供 provider 抽象（可注入多個 `OAuthProvider`/`OIDCProvider`）。
   - 建立 `Satellites/membership` 的 SSO redirect/ callback 路由，處理 token 交換、會員映射與 session 建立。
   - 可利用 `@gravito/stasis` 或 `@gravito/pulsar` 來排隊長時間的資料同步或 webhook 處理。

# 下一步實作切分
- [ ] 準備 `@gravito/sentinel` 的 credential/strategy hooks（Passkeys、SSO）。
- [ ] 在 `satellites/membership` 加入新的 API 路由並驗證現有路由與 middleware。
- [ ] 撰寫 front/backend 通訊示例，說明如何取得 challenge、跳轉 provider、建立 session。
- [ ] 規劃使用者綁定流程（例如登入時選擇 Passkey 或 SSO provider，並可在會員帳戶內管理 credential）。

> 這份文件可作為 `feature/community-auth` 的參考，後續實作可在對應模組加上實際程式碼與測試並更新此計畫。
