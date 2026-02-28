# 安全指南

本文檔涵蓋 @gravito/satellite-membership 的安全設計和最佳實踐。

---

## 目錄

1. [認證安全](#認證安全)
2. [資料保護](#資料保護)
3. [API 安全](#api-安全)
4. [配置安全](#配置安全)
5. [緊急響應](#緊急響應)

---

## 認證安全

### 密碼策略

#### 儲存

```typescript
// ✅ 正確：使用 core.hasher（bcrypt）
const hashedPassword = await core.hasher.make(plainPassword)
member.passwordHash = hashedPassword
```

**密碼要求**：
- 最少 8 字
- 推薦 12+ 字
- 支援特殊字符

#### 驗證

```typescript
// ✅ 正確：使用 timing-safe 比較
const isValid = await core.hasher.check(plainPassword, member.passwordHash)

// ❌ 錯誤：直接字串比較（易受時序攻擊）
const isValid = plainPassword === storedPassword
```

#### 前端驗證

```typescript
// 密碼強度檢查（前端 UX，非安全保障）
const isStrong = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  )
}
```

### JWT 安全

#### Secret 管理

```typescript
// ✅ 正確：從環境變數讀取
const secret = process.env.MEMBERSHIP_JWT_SECRET

if (!secret) {
  throw new Error('MEMBERSHIP_JWT_SECRET not configured')
}

// ❌ 錯誤：硬碼 secret
const secret = 'my-secret-key'
```

#### Secret 生成

```bash
# 256-bit secret（推薦）
openssl rand -base64 32

# 複製到 .env
MEMBERSHIP_JWT_SECRET=<base64-encoded-secret>
```

#### Token 簽發

```typescript
// ✅ 正確：設定合理的過期時間
const accessToken = await sign(
  {
    sub: member.id,
    email: member.email,
    iat: now,
    exp: now + 15 * 60  // 15 分鐘
  },
  secret,
  'HS256'
)

// ❌ 錯誤：過期時間過長
const accessToken = await sign({ ...payload, exp: now + 30 * 24 * 60 * 60 }, secret)
```

#### Token 驗證

```typescript
// ✅ 正確：驗證簽名和過期時間
try {
  const payload = await verify(token, secret, 'HS256')
  // token 自動檢查 exp 聲明
} catch (error) {
  // Token 過期或簽名無效
  return null
}

// ❌ 錯誤：跳過驗證
const payload = JSON.parse(atob(token.split('.')[1]))  // 不安全！
```

### Token 黑名單

#### 強制撤銷

```typescript
// 使用黑名單強制吊銷 token
const blacklist = new JwtTokenBlacklist(core)
await blacklist.blacklist(token, ttl)

// 檢查 token 是否被吊銷
const isBlacklisted = await blacklist.isBlacklisted(token)
if (isBlacklisted) {
  return null  // 拒絕請求
}
```

#### TTL 設定

```typescript
// ✅ 正確：TTL = token 剩餘有效期
const now = Math.floor(Date.now() / 1000)
const ttl = Math.max(0, payload.exp - now)
await blacklist.blacklist(token, ttl)
```

### Session 安全

#### Sentinel 委派

```typescript
// ✅ 使用 Sentinel 進行 session 管理
const guard = core.container.make('auth').guard('web')

// 創建 session
await guard.loginUsingId(member.id)

// 清除 session
await guard.logout()

// 檢索當前 session
const member = await guard.user()
```

#### 單設備登入

```typescript
// 配置
core.config.set('membership.auth.single_device', true)

// 自動清除舊 session
if (singleDeviceEnabled && member.currentSessionId) {
  // 舊 token/session 自動失效
}
```

---

## 資料保護

### 郵箱驗證

```typescript
// ✅ 建立驗證流程
const member = Member.create(id, name, email, passwordHash)
// member.emailVerified 初始為 false
// member.verificationToken 自動生成

// 驗證郵箱
member.verifyEmail()  // 設定 emailVerified = true，清除 token
```

### 個人資料隔離

#### 防止權限提升

```typescript
// ✅ 正確：清毒 metadata
export function injectProfileOwnerRole(member: Member): ProfileOwnerRole {
  return {
    sanitizeProfileUpdate(data: UpdateProfileInput) {
      const sanitized = { ...data }

      // 禁止修改敏感欄位
      if (sanitized.metadata) {
        delete sanitized.metadata.roles
        delete sanitized.metadata.status
        delete sanitized.metadata.admin
      }

      return sanitized
    }
  }
}
```

#### 存取控制

```typescript
// ✅ 只允許修改自己的資料
async updateProfile(memberId: string, data: UpdateProfileInput) {
  if (currentMemberId !== memberId) {
    throw new MembershipError('UNAUTHORIZED', 'Cannot modify other member')
  }

  // 進行更新...
}
```

### 敏感資訊屏蔽

```typescript
// ✅ 不返回 passwordHash
export function toDTO(member: Member): MemberDTO {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    status: member.status,
    emailVerified: member.emailVerified,
    // ❌ 不包含 passwordHash
    // ❌ 不包含 verificationToken
  }
}
```

---

## API 安全

### 認證中間件

```typescript
// ✅ 檢查認證
export const memberAuthMiddleware = (core: PlanetCore): GravitoMiddleware => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401)
    }

    const token = authHeader.slice(7)
    const strategy = core.container.make('membership.auth.strategy')
    const member = await strategy.getAuthenticatedMember(c)

    if (!member) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401)
    }

    c.set('member', member)
    await next()
  }
}
```

### CORS 配置

```typescript
// ✅ 明確指定允許的來源
import { cors } from '@gravito/photon/middleware/cors'

app.use(cors({
  origin: [
    'https://example.com',
    'https://app.example.com'
  ],
  credentials: true,  // 允許 cookie 跨域
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// ❌ 錯誤：允許所有來源
app.use(cors({ origin: '*', credentials: true }))  // 衝突！
```

### 速率限制

```typescript
// ✅ 限制登入嘗試
import { rateLimit } from '@gravito/photon/middleware/rate-limit'

app.post('/api/member/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 分鐘
    maxRequests: 5,            // 最多 5 次嘗試
    keyGenerator: (c) => c.req.header('X-Forwarded-For') || c.req.ip
  }),
  (c) => handleLogin(c)
)

// ✅ 限制註冊速率
app.post('/api/member/register',
  rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 小時
    maxRequests: 10             // 最多 10 個新帳戶
  }),
  (c) => handleRegister(c)
)
```

### 輸入驗證

```typescript
// ✅ 驗證所有輸入
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required')
})

app.post('/api/member/login', async (c) => {
  const input = await c.req.json()

  try {
    const validated = loginSchema.parse(input)
    // 使用驗證後的資料
  } catch (error) {
    return c.json({ success: false, error: 'Validation failed' }, 400)
  }
})
```

### 錯誤訊息

```typescript
// ✅ 不洩露敏感信息
throw new MembershipError(
  'INVALID_CREDENTIALS',
  'Invalid email or password'  // 不區分郵箱或密碼錯誤
)

// ❌ 錯誤：洩露用戶存在信息
throw new Error('Email not found')  // 攻擊者可推斷郵箱是否存在

// ❌ 錯誤：洩露實現細節
throw new Error('bcrypt hash mismatch')
```

### 防止 CSRF

```typescript
// ✅ 使用 CSRF 保護
import { csrfProtection } from '@gravito/photon/middleware/security'

app.use(csrfProtection())

// 表單中包含 CSRF token
<form method="POST" action="/api/member/logout">
  <input type="hidden" name="_csrf" value={csrfToken} />
  <button type="submit">登出</button>
</form>
```

---

## 配置安全

### 環境變數

```bash
# .env（不提交到版本控制）
MEMBERSHIP_AUTH_MODE=jwt
MEMBERSHIP_JWT_SECRET=<securely-generated-secret>
MEMBERSHIP_AUTH_SINGLE_DEVICE=true

# .env.example（提交到版本控制，無實際值）
MEMBERSHIP_AUTH_MODE=jwt
MEMBERSHIP_JWT_SECRET=<your-256-bit-secret-here>
MEMBERSHIP_AUTH_SINGLE_DEVICE=true
```

### .gitignore

```gitignore
# 不提交敏感文件
.env
.env.local
.env.*.local
*.key
*.pem
```

### 安全檢查清單

```typescript
// 部署前檢查
const securityChecklist = {
  // ✅ JWT secret 已配置
  hasJwtSecret: !!process.env.MEMBERSHIP_JWT_SECRET,

  // ✅ JWT secret 足夠長
  jwtSecretLength: (process.env.MEMBERSHIP_JWT_SECRET?.length || 0) >= 32,

  // ✅ HTTPS 已啟用（生產環境）
  httpsEnabled: process.env.NODE_ENV === 'development' || isHttpsEnabled,

  // ✅ CORS 已限制
  corsConfigured: corsAllowList.length > 0,

  // ✅ 速率限制已啟用
  rateLimitEnabled: true,

  // ✅ 密碼最少長度
  passwordMinLength: 8,

  // ✅ 密碼雜湊演算法
  passwordHasher: 'bcrypt'  // 或其他強演算法
}
```

---

## 緊急響應

### 洩露 JWT Secret

```bash
# 1. 立即生成新密鑰
openssl rand -base64 32

# 2. 更新環境變數
MEMBERSHIP_JWT_SECRET=<new-secret>

# 3. 重新部署應用
# 所有舊 token 自動失效（因簽名驗證失敗）

# 4. 建議用戶重新登入
# 發送通知郵件
```

### 帳戶洩露

```typescript
// 1. 禁用帳戶
await suspendMemberAccount(memberId, 'Security breach detected')

// 2. 清除所有 session
await clearAllSessions(memberId)

// 3. 黑名單化所有 token
const allTokens = await getActiveTokensForMember(memberId)
for (const token of allTokens) {
  await blacklist.blacklist(token, token.ttl)
}

// 4. 通知用戶
await sendSecurityAlertEmail(member.email)

// 5. 要求密碼重設
member.requirePasswordReset = true
```

### 暴力破解檢測

```typescript
// ✅ 追蹤失敗的登入嘗試
async function trackFailedLogin(email: string) {
  const key = `login_attempt:${email}`
  const attempts = await cache.increment(key, 1)

  if (attempts === 1) {
    // 設定 TTL
    await cache.expire(key, 15 * 60)  // 15 分鐘
  }

  if (attempts > 5) {
    // 暫時鎖定帳戶
    await suspendMemberAccount(email, 'Too many failed attempts')
    await sendSecurityAlertEmail(email)
  }
}
```

### 異常登入偵測

```typescript
// ✅ 檢測可疑登入
async function detectSuspiciousLogin(member: Member, loginData: LoginData) {
  const lastLogin = member.lastLogin
  const now = new Date()

  // 地理位置變化太快
  if (lastLogin) {
    const timeDiff = (now.getTime() - lastLogin.getTime()) / 1000 / 60  // 分鐘
    const distanceDiff = calculateDistance(lastLogin.location, loginData.location)

    // 不可能在短時間內跨越大距離
    if (timeDiff < 30 && distanceDiff > 1000) {  // < 30 分鐘且 > 1000 km
      await notifyUserOfSuspiciousActivity(member, loginData)
      // 可選：要求額外驗證（如 2FA）
    }
  }
}
```

---

## 合規性

### 資料隱私

- 遵守 GDPR、CCPA 等隱私法規
- 實現資料導出功能
- 實現帳戶刪除功能
- 維護審計日誌

### 日誌記錄

```typescript
// ✅ 記錄安全相關事件（不記錄敏感資訊）
await core.hooks.doAction('membership:security_event', {
  event: 'login',
  memberId: member.id,
  timestamp: new Date(),
  ipAddress: c.req.ip,
  // ❌ 不記錄：password、token
})
```

---

## 安全資源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT 安全](https://tools.ietf.org/html/rfc8725)
- [Bcrypt 密碼雜湊](https://github.com/kelektiv/node.bcrypt.js)
