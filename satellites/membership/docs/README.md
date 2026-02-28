# @gravito/satellite-membership 文檔

歡迎來到會員管理模組的完整文檔。本模組實現了 DCI 架構和雙模式認證（JWT + Session）。

---

## 📚 文檔導覽

### 核心文檔

| 文檔 | 用途 | 對象 |
|------|------|------|
| **[API.md](./API.md)** | 完整 API 規格和使用範例 | 前端開發者、集成者 |
| **[DCI.md](./DCI.md)** | DCI 架構設計和實現原理 | 後端開發者、架構師 |
| **[AUTHENTICATION_FLOWS.md](./AUTHENTICATION_FLOWS.md)** | 各種認證流程圖和實現細節 | 全棧開發者 |
| **[SECURITY.md](./SECURITY.md)** | 安全最佳實踐和配置指南 | DevOps、安全工程師 |

---

## 🚀 快速開始

### 1. 安裝

```bash
bun add @gravito/satellite-membership
```

### 2. 配置

```typescript
import { MembershipServiceProvider } from '@gravito/satellite-membership'

const core = new PlanetCore({
  config: {
    'membership.auth.mode': 'jwt',  // jwt | session | dual
    'membership.jwt.secret': process.env.MEMBERSHIP_JWT_SECRET
  }
})

core.register(MembershipServiceProvider)
await core.boot()
```

### 3. 基本用法

```bash
# 註冊
curl -X POST http://localhost:3000/api/member/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'

# 登入
curl -X POST http://localhost:3000/api/member/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'

# 取得個人資料（需認證）
curl -X GET http://localhost:3000/api/member/me \
  -H "Authorization: Bearer <accessToken>"
```

詳細文檔見 **[API.md](./API.md)**

---

## 🏗️ 架構概述

### DCI 模式

會員管理使用 **DCI（Data-Context-Interaction）** 架構：

```
HTTP Controllers
    ↓
DCI Contexts (Registration, Authentication, Profile)
    ↓
Role Injection (Registrant, Authenticatable, ProfileOwner)
    ↓
Member Entity (Data)
```

**優勢**：
- 💡 業務邏輯清晰分離
- 🧪 易於測試（無需模擬）
- 🔧 靈活擴展（新增 Role 而非修改 Entity）
- 🛡️ 防止權限提升攻擊

詳細說明見 **[DCI.md](./DCI.md)**

### 認證策略

支援三種模式，根據應用場景選擇：

| 模式 | 使用場景 | 優勢 | 劣勢 |
|------|---------|------|------|
| **JWT** | SPA、行動應用 | 無狀態、跨域 | Token 管理複雜 |
| **Session** | 伺服器渲染應用 | 簡單、自動 | 伺服器負載、不跨域 |
| **Dual** | 通用應用 | 兼容多客戶端 | 複雜度最高 |

詳細流程見 **[AUTHENTICATION_FLOWS.md](./AUTHENTICATION_FLOWS.md)**

---

## 🔒 安全特性

✅ **密碼**
- Bcrypt 雜湊儲存
- Timing-safe 比較

✅ **JWT**
- HS256 簽名
- 15 分鐘 accessToken + 7 天 refreshToken
- Token 黑名單支援強制撤銷

✅ **防護**
- CORS 限制
- 速率限制
- CSRF 保護
- 輸入驗證
- 單設備登入（可選）

✅ **隱私**
- 敏感資訊屏蔽
- 不洩露郵箱存在信息
- 個人資料隔離

詳細指南見 **[SECURITY.md](./SECURITY.md)**

---

## 📋 API 端點

### 公開端點

```
POST   /api/member/register      # 註冊
POST   /api/member/login         # 登入
POST   /api/member/refresh       # JWT: 刷新 token
```

### 受保護端點

```
GET    /api/member/me            # 取得個人資料
PUT    /api/member/profile       # 更新個人資料
POST   /api/member/logout        # 登出
```

完整規格見 **[API.md](./API.md)**

---

## 🔧 設定

### 環境變數

```bash
MEMBERSHIP_AUTH_MODE=jwt                    # jwt | session | dual
MEMBERSHIP_JWT_SECRET=<256-bit-secret>      # JWT secret (必須)
MEMBERSHIP_AUTH_SINGLE_DEVICE=false         # 單設備登入開關
```

### JWT Secret 生成

```bash
# 256-bit secret
openssl rand -base64 32
```

### 路由註冊

會員 API 路由在 `index.ts` 的 ServiceProvider 中自動註冊：

```typescript
// 自動註冊的路由
POST   /api/member/register
POST   /api/member/login
POST   /api/member/logout
POST   /api/member/refresh     (JWT 模式)
GET    /api/member/me
PUT    /api/member/profile
```

---

## 🧪 測試

### 測試覆蓋

- ✅ DCI Contexts (3 個)：15+ 測試
- ✅ DCI Roles (3 個)：16+ 測試
- ✅ Auth Strategies (2 個)：12+ 測試
- ✅ Strategy Factory (1 個)：7+ 測試

### 運行測試

```bash
cd satellites/membership

# 全部測試
bun test

# 特定測試
bun test tests/Domain/DCI/Contexts/AuthenticationContext.test.ts

# 監視模式
bun test --watch
```

### 測試文件位置

```
satellites/membership/tests/
├── Domain/
│   └── DCI/
│       ├── Contexts/          (3 個測試檔)
│       └── Roles/             (3 個測試檔)
└── Interface/
    └── Http/
        └── Strategies/        (3 個測試檔)
```

---

## 📖 前端集成範例

### Vue 3 Composable

```typescript
import { ref, computed } from 'vue'

export function useAuth() {
  const member = ref(null)
  const accessToken = ref(localStorage.getItem('accessToken'))

  async function login(email, password) {
    const res = await fetch('/api/member/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    const { data } = await res.json()
    accessToken.value = data.accessToken
    member.value = data.member
    localStorage.setItem('accessToken', data.accessToken)
  }

  async function logout() {
    await fetch('/api/member/logout', {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    accessToken.value = null
    member.value = null
    localStorage.clear()
  }

  return {
    member: computed(() => member.value),
    isAuthenticated: computed(() => !!member.value),
    login,
    logout
  }
}
```

### React Hook

```typescript
import { useState } from 'react'

export function useAuth() {
  const [member, setMember] = useState(null)
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem('accessToken')
  )

  const login = async (email, password) => {
    const res = await fetch('/api/member/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    const { data } = await res.json()
    setAccessToken(data.accessToken)
    setMember(data.member)
    localStorage.setItem('accessToken', data.accessToken)
  }

  const logout = async () => {
    await fetch('/api/member/logout', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    setAccessToken(null)
    setMember(null)
    localStorage.clear()
  }

  return { member, isAuthenticated: !!member, login, logout }
}
```

詳細範例見 **[API.md - 示例](./API.md#示例)**

---

## 🎯 常見問題

### Q: 如何在 JWT 和 Session 之間切換？

**A:** 修改配置即可：

```typescript
// 改為 JWT 模式
core.config.set('membership.auth.mode', 'jwt')
core.config.set('membership.jwt.secret', 'your-secret')

// 改為 Session 模式
core.config.set('membership.auth.mode', 'session')

// 啟用 Dual 模式
core.config.set('membership.auth.mode', 'dual')
```

### Q: refreshToken 過期後怎麼辦？

**A:** 需要重新登入：

```typescript
try {
  const { data } = await fetch('/api/member/refresh', {
    body: JSON.stringify({ refreshToken })
  })
  // 成功，更新 accessToken
} catch (error) {
  // refreshToken 過期，重定向到登入
  location.href = '/login'
}
```

### Q: 如何實現單設備登入？

**A:** 啟用配置選項：

```typescript
core.config.set('membership.auth.single_device', true)
```

新登入會自動登出其他設備。

### Q: 前端應該如何自動刷新 token？

**A:** 使用攔截器或定時器：

```typescript
// 攔截器方式（推薦）
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const { data } = await api.post('/api/member/refresh', {
        refreshToken: localStorage.getItem('refreshToken')
      })
      localStorage.setItem('accessToken', data.accessToken)
      error.config.headers.Authorization = `Bearer ${data.accessToken}`
      return api(error.config)
    }
  }
)
```

詳細見 **[API.md - 常見問題](./API.md#常見問題)**

---

## 🔐 部署檢查清單

- [ ] JWT secret 已配置（256+ bits）
- [ ] HTTPS 已啟用（生產環境）
- [ ] CORS 已限制到允許的域名
- [ ] 速率限制已啟用
- [ ] 資料庫備份已配置
- [ ] 監控和日誌已設定
- [ ] 預備 plan 已建立（token 洩露等）

詳細見 **[SECURITY.md - 緊急響應](./SECURITY.md#緊急響應)**

---

## 📞 支援

### 文檔結構

```
docs/
├── README.md                (本文件) 📍
├── API.md                   (API 規格)
├── DCI.md                   (架構設計)
├── AUTHENTICATION_FLOWS.md  (流程圖)
└── SECURITY.md              (安全指南)
```

### 相關資源

- [Gravito 官方文檔](../../../README.md)
- [WHITEPAPER_ZH_TW.md](../../../WHITEPAPER_ZH_TW.md)
- [DCI 原始論文](http://www.artima.com/articles/dci_vision.html)

---

## 🚀 路線圖

未來計畫的功能：

- [ ] 社交登入（Google、GitHub）
- [ ] 雙因素認證（2FA）
- [ ] 磁力鏈接登入
- [ ] 會員權限管理（RBAC）
- [ ] 審計日誌
- [ ] IP 白名單/黑名單

---

## 📝 版本

- **Current**: v1.0.0
- **Last Updated**: 2026-02-27

---

**開始使用** → 檢查 **[API.md](./API.md#快速開始)**

**理解架構** → 閱讀 **[DCI.md](./DCI.md)**

**確保安全** → 遵循 **[SECURITY.md](./SECURITY.md)**
