# @gravito/satellite-membership API 文檔

本文檔涵蓋前端會員管理 API 的完整規格，包括認證、授權、設定和錯誤處理。

---

## 目錄

1. [快速開始](#快速開始)
2. [認證模式](#認証模式)
3. [API 端點](#api-端點)
4. [錯誤處理](#錯誤處理)
5. [設定指南](#設定指南)
6. [示例](#示例)

---

## 快速開始

### 安裝

```bash
bun add @gravito/satellite-membership
```

### 基本設定

```typescript
import { MembershipServiceProvider } from '@gravito/satellite-membership'
import { PlanetCore } from '@gravito/core'

const core = new PlanetCore({
  // 基本設定...
})

// 註冊會員服務
core.register(MembershipServiceProvider)

// 啟動應用
await core.boot()
```

---

## 認証模式

### 1. Session 模式（預設）

使用 Gravito Sentinel 的 session-based 認證，適合傳統伺服器渲染應用。

**設定**：
```typescript
core.config.set('membership.auth.mode', 'session')
```

**特性**：
- 伺服器維護會話狀態
- Cookie 自動傳遞認證信息
- 適合同域名應用
- 內建登出機制

---

### 2. JWT 模式

無狀態 JWT 認證，適合 SPA 和跨域應用。

**設定**：
```typescript
core.config.set('membership.auth.mode', 'jwt')
core.config.set('membership.jwt.secret', 'your-256-bit-secret-key-here')
```

**特性**：
- 無狀態認證
- accessToken：15 分鐘有效期
- refreshToken：7 天有效期
- 支援 Token 黑名單強制撤銷
- Bearer token 方式傳遞

**Token 結構**：
```typescript
// accessToken payload
{
  sub: 'user-id',           // 會員 ID
  email: 'user@example.com', // 郵箱
  iat: 1234567890,          // 簽發時間
  exp: 1234568790           // 過期時間
}

// refreshToken payload
{
  sub: 'user-id',
  type: 'refresh',
  iat: 1234567890,
  exp: 1234654290           // 7 天後
}
```

---

### 3. Dual 模式

同時支援 JWT 和 Session，優先使用 JWT，Session 作為備用。

**設定**：
```typescript
core.config.set('membership.auth.mode', 'dual')
core.config.set('membership.jwt.secret', 'your-256-bit-secret-key-here')
```

**特性**：
- JWT 優先
- Session 自動備用
- 靈活支援多種客戶端
- 建議生產環境使用

---

## API 端點

### 公開端點

#### `POST /api/member/register`

註冊新會員。

**請求**：
```bash
curl -X POST http://localhost:3000/api/member/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

**請求體**：
```typescript
{
  name: string        // 會員名稱 (1-255 字)
  email: string       // 郵箱地址（唯一）
  password: string    // 密碼（最少 8 字）
}
```

**響應** (201 Created / 200 OK)：
```typescript
{
  success: true,
  data: {
    member: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'PENDING',
      emailVerified: false,
      createdAt: '2024-02-27T10:00:00Z'
    },
    accessToken?: 'eyJ0eXAiOiJKV1QiLCJhbGc...',    // JWT 模式
    refreshToken?: 'eyJ0eXAiOiJKV1QiLCJhbGc...',   // JWT 模式
    sessionId?: 'sess_xxx',                       // Session 模式
    expiresIn?: 900                              // accessToken 有效期（秒）
  }
}
```

**錯誤響應**：
```typescript
// 400 Bad Request - 驗證失敗
{
  success: false,
  error: 'Validation failed: Email is invalid'
}

// 409 Conflict - 郵箱已存在
{
  success: false,
  error: {
    code: 'MEMBER_EXISTS',
    message: 'Email already registered'
  }
}
```

---

#### `POST /api/member/login`

會員登入。

**請求**：
```bash
curl -X POST http://localhost:3000/api/member/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

**請求體**：
```typescript
{
  email: string     // 郵箱地址
  password: string  // 密碼
}
```

**響應** (200 OK)：
```typescript
{
  success: true,
  data: {
    member: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'ACTIVE',
      emailVerified: true,
      lastLogin: '2024-02-27T10:05:00Z'
    },
    accessToken?: 'eyJ0eXAiOiJKV1QiLCJhbGc...',
    refreshToken?: 'eyJ0eXAiOiJKV1QiLCJhbGc...',
    sessionId?: 'sess_yyy',
    expiresIn?: 900
  }
}
```

**錯誤響應**：
```typescript
// 400 - 驗證失敗
{ success: false, error: 'Validation failed: Email is required' }

// 401 - 密碼錯誤
{
  success: false,
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password'
  }
}

// 403 - 會員未啟用
{
  success: false,
  error: {
    code: 'MEMBER_INACTIVE',
    message: 'Member is not active'
  }
}
```

---

#### `POST /api/member/refresh` (JWT 模式)

使用 refreshToken 更新 accessToken。

**請求**：
```bash
curl -X POST http://localhost:3000/api/member/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }'
```

**請求體**：
```typescript
{
  refreshToken: string  // 有效的 refreshToken
}
```

**響應** (200 OK)：
```typescript
{
  success: true,
  data: {
    accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGc...',  // 新的 accessToken
    expiresIn: 900                             // 有效期（秒）
  }
}
```

**錯誤響應**：
```typescript
// 401 - Token 過期或無效
{
  success: false,
  error: {
    code: 'TOKEN_EXPIRED',
    message: 'Invalid or expired refresh token'
  }
}
```

---

### 受保護端點（需認證）

使用 Bearer token 或 Session cookie 進行認證。

#### `GET /api/member/me`

取得當前登入的會員信息。

**請求** (JWT 模式)：
```bash
curl -X GET http://localhost:3000/api/member/me \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**請求** (Session 模式)：
```bash
# Cookie 自動包含在請求中
curl -X GET http://localhost:3000/api/member/me
```

**響應** (200 OK)：
```typescript
{
  success: true,
  data: {
    member: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'ACTIVE',
      emailVerified: true,
      metadata: {
        theme: 'dark',
        language: 'en'
      },
      createdAt: '2024-02-27T10:00:00Z',
      updatedAt: '2024-02-27T10:05:00Z'
    }
  }
}
```

**錯誤響應**：
```typescript
// 401 - 未認證或 Token 無效
{
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'Unauthorized'
  }
}
```

---

#### `PUT /api/member/profile`

更新會員個人資料。

**請求**：
```bash
curl -X PUT http://localhost:3000/api/member/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -d '{
    "name": "Jane Doe",
    "metadata": {
      "theme": "light",
      "language": "zh"
    }
  }'
```

**請求體**：
```typescript
{
  name?: string              // 新名稱（可選，1-255 字）
  metadata?: {
    theme?: 'light' | 'dark'
    language?: string
    [key: string]: any      // 其他自訂欄位
  }
}
```

**響應** (200 OK)：
```typescript
{
  success: true,
  data: {
    member: {
      id: 'user-123',
      name: 'Jane Doe',
      email: 'john@example.com',
      metadata: {
        theme: 'light',
        language: 'zh'
      },
      updatedAt: '2024-02-27T10:10:00Z'
    }
  }
}
```

**錯誤響應**：
```typescript
// 400 - 驗證失敗
{
  success: false,
  error: 'Validation failed: Name must be 1-255 characters'
}

// 401 - 未認證
{
  success: false,
  error: { code: 'UNAUTHORIZED' }
}
```

**安全特性**：
- 無法更改郵箱地址（需郵箱驗證流程）
- 無法通過 metadata 修改 `roles` 或 `status`
- 名稱自動修剪空白字符
- 名稱限制 255 字

---

#### `POST /api/member/logout`

會員登出。

**請求**：
```bash
curl -X POST http://localhost:3000/api/member/logout \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**響應** (200 OK)：
```typescript
{
  success: true,
  data: null
}
```

**後續操作**：
- **JWT 模式**：前端刪除 accessToken 和 refreshToken
- **Session 模式**：伺服器清除 session，前端清除 cookie
- **Dual 模式**：後端同時清除 session 並黑名單化 JWT token

---

## 錯誤處理

### 錯誤碼

| 代碼 | HTTP | 含義 | 建議操作 |
|------|------|------|---------|
| `MEMBER_EXISTS` | 409 | 郵箱已被註冊 | 提示用戶使用其他郵箱或登入 |
| `INVALID_CREDENTIALS` | 401 | 郵箱或密碼錯誤 | 提示用戶檢查輸入 |
| `MEMBER_INACTIVE` | 403 | 會員未啟用（需驗證郵箱） | 引導用戶驗證郵箱 |
| `TOKEN_EXPIRED` | 401 | Token 過期 | 使用 refreshToken 更新或重新登入 |
| `UNAUTHORIZED` | 401 | 缺少認證或 token 無效 | 清除 token 並重新登入 |

### 錯誤響應格式

```typescript
{
  success: false,
  error: {
    code: 'ERROR_CODE',        // 錯誤代碼
    message: 'Human readable message'  // 人類可讀的訊息
  }
}
```

### 前端錯誤處理範例

```typescript
try {
  const response = await fetch('/api/member/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const result = await response.json()

  if (!result.success) {
    switch (result.error?.code) {
      case 'INVALID_CREDENTIALS':
        showError('郵箱或密碼錯誤')
        break
      case 'MEMBER_INACTIVE':
        redirectToEmailVerification()
        break
      case 'MEMBER_EXISTS':
        showError('郵箱已被註冊')
        break
      default:
        showError(result.error?.message || '登入失敗')
    }
  } else {
    // 保存 token
    localStorage.setItem('accessToken', result.data.accessToken)
    localStorage.setItem('refreshToken', result.data.refreshToken)
    redirectToDashboard()
  }
} catch (error) {
  showError('網絡錯誤，請檢查連線')
}
```

---

## 設定指南

### 環境變數

```bash
# .env
MEMBERSHIP_AUTH_MODE=jwt                    # jwt | session | dual
MEMBERSHIP_JWT_SECRET=your-256-bit-secret-key
MEMBERSHIP_AUTH_SINGLE_DEVICE=false         # 啟用單設備登入
```

### 程式設定

```typescript
// gravito.config.ts 或 core 初始化

const core = new PlanetCore({
  config: {
    'membership.auth.mode': 'jwt',
    'membership.jwt.secret': process.env.MEMBERSHIP_JWT_SECRET,
    'membership.auth.single_device': false,
  }
})
```

### JWT Secret 生成

```bash
# 使用 OpenSSL 生成安全密鑰（推薦 256-bit）
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 單設備登入（可選）

啟用此選項後，會員在新設備登入時會自動登出其他設備。

```typescript
core.config.set('membership.auth.single_device', true)
```

**行為**：
- 後端記錄當前有效的 sessionId/JWT
- 登入新設備時，舊 token 自動失效
- Session 模式：清除舊 session
- JWT 模式：舊 token 加入黑名單

---

## 示例

### Vue 3 + Composition API 範例

```typescript
import { ref, computed } from 'vue'

const accessToken = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
const member = ref<Member | null>(null)

async function login(email: string, password: string) {
  const res = await fetch('/api/member/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const { success, data, error } = await res.json()

  if (success) {
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    member.value = data.member
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
  } else {
    throw new Error(error?.message || '登入失敗')
  }
}

async function logout() {
  await fetch('/api/member/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.value}`
    }
  })

  accessToken.value = null
  refreshToken.value = null
  member.value = null
  localStorage.clear()
}

async function refreshAccessToken() {
  const res = await fetch('/api/member/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshToken.value })
  })

  const { success, data, error } = await res.json()

  if (success) {
    accessToken.value = data.accessToken
    localStorage.setItem('accessToken', data.accessToken)
  } else if (error?.code === 'TOKEN_EXPIRED') {
    await logout()
    redirectToLogin()
  }
}

const isAuthenticated = computed(() => !!member.value)
```

### React Hooks 範例

```typescript
import { useState, useCallback } from 'react'

export function useAuth() {
  const [member, setMember] = useState<Member | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  )
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken')
  )

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/member/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const { success, data, error } = await res.json()

    if (success) {
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      setMember(data.member)
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
    } else {
      throw new Error(error?.message || '登入失敗')
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/member/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    setMember(null)
    setAccessToken(null)
    setRefreshToken(null)
    localStorage.clear()
  }, [accessToken])

  return { member, accessToken, refreshToken, login, logout }
}
```

---

## 常見問題

### Q: 如何自動刷新 accessToken？

**A:** 實現一個 API 攔截器，在 token 過期前自動刷新：

```typescript
// axios 攔截器範例
instance.interceptors.response.use(
  response => response,
  async error => {
    const { config } = error
    if (error.response?.status === 401) {
      try {
        const { data } = await instance.post('/api/member/refresh', {
          refreshToken: localStorage.getItem('refreshToken')
        })
        localStorage.setItem('accessToken', data.accessToken)
        config.headers.Authorization = `Bearer ${data.accessToken}`
        return instance(config)
      } catch {
        // refreshToken 也過期，需重新登入
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
```

### Q: CORS 如何配置？

**A:** 在 Photon 中設定 CORS middleware：

```typescript
import { cors } from '@gravito/photon/middleware/cors'

const app = new Hono()
  .use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  }))
```

### Q: 如何處理跨頁籤登出？

**A:** 使用 `storage` 事件監聽 localStorage 變化：

```typescript
window.addEventListener('storage', (e) => {
  if (e.key === 'accessToken' && !e.newValue) {
    // 其他頁籤已登出，清除本地狀態
    location.href = '/login'
  }
})
```

---

## 相關文檔

- [DCI 架構設計](./DCI.md)
- [認證流程圖](./authentication-flow.md)
- [安全考量](./security.md)
