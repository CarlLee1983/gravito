# 認證流程文檔

本文檔說明 @gravito/satellite-membership 支援的各種認證流程。

---

## 目錄

1. [註冊流程](#註冊流程)
2. [登入流程](#登入流程)
3. [Token 刷新](#token-刷新)
4. [登出流程](#登出流程)
5. [單設備登入](#單設備登入)
6. [Dual 模式](#dual-模式)

---

## 註冊流程

### 流程圖

```
┌─────────────┐
│   用戶      │
└──────┬──────┘
       │ POST /api/member/register
       │ { name, email, password }
       │
       ▼
┌──────────────────────────────────┐
│ MemberAuthController.register()  │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ RegistrationContext.execute()│
└──────────┬───────────────────┘
           │
           ├─ 1. 雜湊密碼 (bcrypt)
           │
           ├─ 2. 建立 Member Entity
           │    - 生成 ID
           │    - 生成 verificationToken
           │    - 設定 status = PENDING
           │
           ├─ 3. 注入 RegistrantRole
           │
           ├─ 4. 驗證郵箱唯一性
           │    - findByEmail()
           │    - 如已存在 → 409 MEMBER_EXISTS
           │
           ├─ 5. 保存 Member
           │    - repo.save()
           │
           ├─ 6. 觸發鉤子
           │    - membership:registered
           │    - (發送驗證郵件)
           │
           ▼
┌──────────────────────────────┐
│ 發行認證 Token               │
├──────────────────────────────┤
│ JWT 模式:                    │
│  - accessToken (15 分)       │
│  - refreshToken (7 天)       │
│                              │
│ Session 模式:                │
│  - sessionId                 │
│  - session cookie            │
└──────┬───────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 返回 200/201 AuthResponseDTO   │
│ {                               │
│   member: MemberDTO,            │
│   accessToken?: string,         │
│   refreshToken?: string,        │
│   expiresIn?: number            │
│ }                               │
└─────────────────────────────────┘
```

### 代碼範例

```typescript
// 前端
const response = await fetch('/api/member/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'SecurePass123!'
  })
})

const { success, data, error } = await response.json()

if (success) {
  // 保存 token
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)

  // 導向郵箱驗證頁面
  location.href = '/verify-email'
} else {
  // 處理錯誤
  if (error.code === 'MEMBER_EXISTS') {
    showError('郵箱已被註冊')
  }
}
```

---

## 登入流程

### JWT 模式

```
┌─────────────┐
│   用戶      │
└──────┬──────┘
       │ POST /api/member/login
       │ { email, password }
       │
       ▼
┌──────────────────────────────┐
│ MemberAuthController.login() │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ AuthenticationContext.execute()
└──────────┬───────────────────┘
           │
           ├─ 1. 查找會員
           │    - findByEmail()
           │    - 未找到 → 401 INVALID_CREDENTIALS
           │
           ├─ 2. 注入 AuthenticatableRole
           │
           ├─ 3. 驗證密碼
           │    - hasher.check(input, hash)
           │    - 失敗 → 401 INVALID_CREDENTIALS
           │
           ├─ 4. 檢查狀態
           │    - status !== ACTIVE → 403 MEMBER_INACTIVE
           │
           ├─ 5. 清除舊 session（單設備模式）
           │
           ├─ 6. 記錄登入
           │    - 更新 lastLogin
           │    - 保存 sessionId
           │
           ├─ 7. 觸發鉤子
           │    - membership:login
           │
           ▼
┌──────────────────────────────┐
│ 簽發 JWT Token               │
│                              │
│ accessToken:                 │
│ {                            │
│   sub: 'user-123',           │
│   email: 'user@ex.com',      │
│   iat: 1234567890,           │
│   exp: 1234568790  (+15min)  │
│ }                            │
│                              │
│ refreshToken:                │
│ {                            │
│   sub: 'user-123',           │
│   type: 'refresh',           │
│   iat: 1234567890,           │
│   exp: 1234654290  (+7days)  │
│ }                            │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 返回 200 AuthResponseDTO     │
└──────────────────────────────┘
```

### Session 模式

```
┌─────────────┐
│   用戶      │
└──────┬──────┘
       │ POST /api/member/login (带 Cookie)
       │ { email, password }
       │
       ▼
┌──────────────────────────────┐
│ AuthenticationContext.execute()
└──────────┬───────────────────┘
           │
           ├─ 1-6. [同 JWT 流程]
           │
           ▼
┌──────────────────────────────┐
│ SessionAuthStrategy          │
│ .issueCredentials()          │
└──────────┬───────────────────┘
           │
           ├─ 調用 Sentinel
           │  guard('web').loginUsingId()
           │
           ├─ 返回 session ID
           │
           ▼
┌──────────────────────────────┐
│ 返回 200 + Set-Cookie        │
│ {                            │
│   member: MemberDTO,         │
│   sessionId: 'sess_xxx'      │
│ }                            │
│                              │
│ Set-Cookie:                  │
│  id=sess_xxx; Path=/;        │
│  HttpOnly; Secure; SameSite  │
└──────────────────────────────┘
```

### 前端實現

**JWT 模式**：
```typescript
// 保存 token 到 localStorage
function handleLoginSuccess(data) {
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)

  // 設定 API 預設 header
  api.defaults.headers.Authorization = `Bearer ${data.accessToken}`
}
```

**Session 模式**：
```typescript
// Cookie 自動跟隨請求
function handleLoginSuccess(data) {
  // 無需額外操作，cookie 已由伺服器設定

  // 後續請求會自動包含 session cookie
}
```

---

## Token 刷新

### JWT refreshToken 流程

```
┌─────────────────────────────────┐
│ accessToken 即將過期或已過期     │
└──────┬───────────────────────────┘
       │ POST /api/member/refresh
       │ { refreshToken: '...' }
       │
       ▼
┌──────────────────────────────┐
│ MemberAuthController.refresh()
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ JwtAuthStrategy              │
│ .refreshAccessToken()        │
└──────────┬───────────────────┘
           │
           ├─ 1. 驗證 refreshToken
           │    - verify(token, secret)
           │    - 檢查 type === 'refresh'
           │
           ├─ 2. 查找會員
           │    - findById(payload.sub)
           │
           ├─ 3. 簽發新 accessToken
           │    - 設定新 exp (+15min)
           │    - 使用相同 sub, email
           │
           ▼
┌──────────────────────────────┐
│ 返回 200                     │
│ {                            │
│   accessToken: 'new_token',  │
│   expiresIn: 900             │
│ }                            │
└──────────────────────────────┘
```

### 自動刷新策略（前端）

```typescript
// 方案 1: 過期前自動刷新
function setupAutoRefresh() {
  const payload = jwtDecode(accessToken)
  const expiresIn = (payload.exp * 1000) - Date.now()

  // 在過期前 1 分鐘刷新
  const refreshTime = expiresIn - 60000

  setTimeout(async () => {
    const { data } = await api.post('/api/member/refresh', {
      refreshToken: localStorage.getItem('refreshToken')
    })

    localStorage.setItem('accessToken', data.accessToken)
    api.defaults.headers.Authorization = `Bearer ${data.accessToken}`

    // 遞迴設定下次刷新
    setupAutoRefresh()
  }, refreshTime)
}
```

```typescript
// 方案 2: 響應攔截器刷新
api.interceptors.response.use(
  response => response,
  async error => {
    const { config } = error

    if (error.response?.status === 401) {
      try {
        // 嘗試刷新 token
        const { data } = await api.post('/api/member/refresh', {
          refreshToken: localStorage.getItem('refreshToken')
        })

        // 更新 token 和重試原請求
        localStorage.setItem('accessToken', data.accessToken)
        config.headers.Authorization = `Bearer ${data.accessToken}`

        return api(config)
      } catch {
        // refreshToken 也過期，需要重新登入
        location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)
```

---

## 登出流程

### 完整登出

```
┌─────────────┐
│   用戶      │
└──────┬──────┘
       │ POST /api/member/logout
       │ Authorization: Bearer <token>
       │
       ▼
┌──────────────────────────────┐
│ MemberAuthController.logout()│
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ IAuthStrategy.revokeCredentials()
└──────────┬───────────────────┘
           │
           ├─ JWT 模式:
           │  ├─ 驗證 token
           │  ├─ 將 token 加入黑名單
           │  │  blacklist.blacklist(token, ttl)
           │  └─ 返回 200
           │
           ├─ Session 模式:
           │  ├─ 調用 Sentinel
           │  │  guard('web').logout()
           │  ├─ 清除 session
           │  └─ 返回 200 + Clear-Cookie
           │
           ├─ Dual 模式:
           │  ├─ 嘗試黑名單化 JWT
           │  ├─ 清除 Session
           │  └─ 返回 200
           │
           ▼
┌──────────────────────────────┐
│ 觸發鉤子                     │
│ membership:logout            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 返回 200 { success: true }  │
└──────────────────────────────┘
```

### 前端登出

```typescript
async function logout() {
  try {
    // 通知伺服器
    await fetch('/api/member/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    })
  } catch (error) {
    // 忽略伺服器錯誤，繼續本地清理
    console.error('Logout error:', error)
  } finally {
    // 清除本地 token
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')

    // 清除 API 預設 header
    delete api.defaults.headers.Authorization

    // 重定向到登入
    location.href = '/login'
  }
}
```

---

## 單設備登入

啟用時，新登入會自動登出其他設備。

### 流程

```
┌─────────────────────────────────┐
│ 設備 A: 已登入                  │
│ currentSessionId = 'sess_A'    │
└─────────────────────────────────┘

設備 B 登入...

┌──────────────────────────────┐
│ AuthenticationContext.execute()
└──────────┬───────────────────┘
           │
           ├─ 檢查單設備模式
           │  config.get('membership.auth.single_device')
           │
           ├─ 清除舊 session
           │  member.currentSessionId = undefined
           │
           ├─ 設定新 session
           │  member.currentSessionId = 'sess_B'
           │
           ▼
       設備 A 的 sessionId 失效
       設備 B 的 sessionId 有效

┌─────────────────────────────────┐
│ 設備 A: 後續請求返回 401        │
│ 提示用戶其他設備已登入          │
└─────────────────────────────────┘
```

### 實現

```typescript
// backend
export class AuthenticationContext {
  async execute(input: LoginMemberInput) {
    const member = await this.repository.findByEmail(input.email)

    // ... 驗證密碼和狀態 ...

    // 單設備模式：清除舊 session
    const singleDeviceMode = this.core.config.get('membership.auth.single_device')
    if (singleDeviceMode) {
      // JWT 模式：舊 token 自動過期
      // Session 模式：舊 session 被覆蓋
      member.currentSessionId = undefined
    }

    // 記錄新登入
    const newSessionId = randomUUID()
    await role.recordLogin(this.repository, newSessionId)

    return { member, sessionId: newSessionId }
  }
}

// 前端
// 設備 A 定期檢查 currentSessionId
setInterval(async () => {
  const { data } = await api.get('/api/member/me')

  if (data.member.currentSessionId !== storedSessionId) {
    // 其他設備已登入
    showAlert('Your account logged in from another device')
    await logout()
  }
}, 60000)  // 每分鐘檢查一次
```

---

## Dual 模式

同時支援 JWT 和 Session，根據客戶端自動選擇。

### 請求優先級

```
┌────────────────────────────────┐
│ 傳入請求                       │
└────────┬───────────────────────┘
         │
         ├─ 有 Authorization Bearer header?
         │  └─ 是 → JWT 驗證
         │
         ├─ 有有效 Session Cookie?
         │  └─ 是 → Session 驗證
         │
         ├─ 兩者都無?
         │  └─ 401 Unauthorized
         │
         ▼
    ┌──────────────────┐
    │ 驗證成功，繼續  │
    └──────────────────┘
```

### 實現

```typescript
// middleware
export const memberAuthMiddleware = (core: PlanetCore): GravitoMiddleware => {
  return async (c, next) => {
    const mode = core.config.get('membership.auth.mode')

    if (mode !== 'dual') {
      // 單一模式，使用對應策略
      return singleModeAuth(c, next, mode)
    }

    // Dual 模式：嘗試 JWT，失敗則嘗試 Session
    const strategy = core.container.make('membership.auth.strategy')

    let member: Member | null = null

    // 1. 嘗試 JWT
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      member = await strategy.getAuthenticatedMember(c)
    }

    // 2. JWT 失敗，嘗試 Session
    if (!member) {
      const sessionGuard = core.container.make('auth').guard('web')
      member = await sessionGuard.user()
    }

    if (!member) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401)
    }

    c.set('member', member)
    await next()
  }
}
```

### 用戶場景

```
┌─────────────────────────────────┐
│ SPA (Vue/React)                │
│ - 使用 JWT                      │
│ - localStorage 保存 token       │
│ - Authorization header 傳遞    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 傳統伺服器渲染                  │
│ - 使用 Session                  │
│ - Cookie 自動傳遞               │
│ - 無需手動處理 token           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 行動應用                        │
│ - 使用 JWT (自動刷新)           │
│ - RefreshToken 用於更新        │
│ - localStorage 或 keychain     │
└─────────────────────────────────┘

所有客戶端可連接同一後端 (Dual 模式)
```

---

## 錯誤恢復

### Token 過期恢復

```
發出請求 → 401 TOKEN_EXPIRED
    ↓
嘗試刷新 accessToken
    ├─ 成功 → 使用新 token 重試請求
    └─ 失敗 → refreshToken 也過期
           → 清除本地 token
           → 重定向到登入頁
```

### Session 失效恢復

```
發出請求 → 401 UNAUTHORIZED
    ↓
後端 session 已清除（可能原因：
  - 伺服器重啟
  - 單設備登入（其他設備登入）
  - 管理員禁用
)
    ↓
清除本地 token
重定向到登入頁
提示重新登入
```

---

## 相關文檔

- [API 文檔](./API.md)
- [安全指南](./SECURITY.md)
- [DCI 架構](./DCI.md)
