# 認證授權體系設計

## 1. 背景 (Background)

### 1.1 認證 vs 授權

```
認證（Authentication）：確認身份
  └─ "你是誰？"
  └─ 機制：用戶名密碼、OAuth、JWT

授權（Authorization）：確認權限
  └─ "你能做什麼？"
  └─ 機制：RBAC、ABAC、PBAC
```

### 1.2 Gravito 的認證授權架構

Gravito 使用 **Membership 衛星** 實現完整的認證授權系統：
- 用戶管理
- 密碼加密
- JWT 令牌
- 會話管理
- 角色與權限

---

## 2. 用戶認證 (User Authentication)

### 2.1 密碼存儲最佳實踐

```typescript
// ❌ 錯誤：明文存儲或簡單雜湊
async function createUser(email: string, password: string) {
  // 明文存儲 → 如果數據庫洩露，用戶密碼直接暴露
  await db('users').insert({ email, password })

  // MD5 雜湊 → 容易被彩虹表破解
  const hash = md5(password)
  await db('users').insert({ email, passwordHash: hash })
}

// ✅ 正確：使用 bcrypt 或 argon2
import { hash, verify } from 'bcrypt'

async function createUser(email: string, password: string) {
  // bcrypt：帶 salt 的迭代雜湊
  const passwordHash = await hash(password, 12)  // 12 iterations
  await db('users').insert({ email, passwordHash })
}

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return verify(password, passwordHash)
}
```

### 2.2 登入流程

```typescript
// 完整的登入實現
app.post('/api/auth/login', async (ctx: GravitoContext) => {
  const { email, password } = await ctx.req.json()

  // 1. 驗證輸入
  if (!email || !password) {
    return ctx.status(400).json({ error: 'Missing credentials' })
  }

  // 2. 查詢用戶
  const user = await db('users')
    .where('email', email)
    .first()

  if (!user) {
    // 安全實踐：不洩露用戶是否存在
    return ctx.status(401).json({ error: 'Invalid credentials' })
  }

  // 3. 驗證密碼
  const passwordValid = await verifyPassword(password, user.passwordHash)

  if (!passwordValid) {
    return ctx.status(401).json({ error: 'Invalid credentials' })
  }

  // 4. 檢查帳戶狀態
  if (user.status === 'disabled') {
    return ctx.status(403).json({ error: 'Account is disabled' })
  }

  // 5. 生成 JWT 令牌
  const token = generateJWT({
    userId: user.id,
    email: user.email,
    expiresIn: '7 days'
  })

  // 6. 可選：生成刷新令牌
  const refreshToken = generateJWT({
    userId: user.id,
    type: 'refresh',
    expiresIn: '30 days'
  })

  // 7. 記錄登入日誌
  await db('login_logs').insert({
    userId: user.id,
    ipAddress: ctx.req.header('x-forwarded-for'),
    userAgent: ctx.req.header('user-agent'),
    timestamp: new Date()
  })

  return ctx.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  })
})
```

### 2.3 JWT 令牌設計

```typescript
import { sign, verify } from 'jsonwebtoken'

interface JWTPayload {
  userId: string
  email: string
  roles: string[]
  permissions: string[]
  iat: number      // 發佈時間
  exp: number      // 過期時間
  iss: string      // 簽發者
  aud: string      // 受眾
}

function generateJWT(payload: Partial<JWTPayload>, expiresIn: string = '7d'): string {
  return sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: 'gravito',
    audience: 'api'
  })
}

function verifyJWT(token: string): JWTPayload {
  try {
    return verify(token, process.env.JWT_SECRET) as JWTPayload
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired')
    }
    throw new Error('Invalid token')
  }
}
```

---

## 3. 授權系統 (Authorization System)

### 3.1 基於角色的存取控制（RBAC）

```typescript
// 角色定義
interface Role {
  id: string
  name: string           // 'admin', 'moderator', 'user'
  permissions: string[]  // ['users:read', 'products:write', ...]
}

// 用戶與角色關聯
interface UserRole {
  userId: string
  roleId: string
}

// 權限檢查中介軟體
function requireRole(...roleNames: string[]) {
  return async (ctx: GravitoContext, next: GravitoNext) => {
    const user = ctx.get('user') as JWTPayload

    if (!user) {
      return ctx.status(401).json({ error: 'Unauthorized' })
    }

    // 檢查用戶是否有所需角色
    const hasRole = user.roles.some(r => roleNames.includes(r))

    if (!hasRole) {
      return ctx.status(403).json({ error: 'Forbidden' })
    }

    await next()
  }
}

// 使用
app.post('/api/admin/users', requireRole('admin'), async (ctx) => {
  // 僅 admin 可訪問
})
```

### 3.2 基於屬性的存取控制（ABAC）

```typescript
// 更靈活的授權：基於屬性
interface AccessPolicy {
  resource: string
  action: string
  conditions: {
    userAttribute?: Record<string, any>
    resourceAttribute?: Record<string, any>
    context?: Record<string, any>
  }
}

function requirePermission(resource: string, action: string) {
  return async (ctx: GravitoContext, next: GravitoNext) => {
    const user = ctx.get('user') as JWTPayload

    if (!user) {
      return ctx.status(401).json({ error: 'Unauthorized' })
    }

    // 檢查用戶是否有權限
    const hasPermission = user.permissions.includes(`${resource}:${action}`)

    if (!hasPermission) {
      return ctx.status(403).json({ error: 'Forbidden' })
    }

    await next()
  }
}

// 使用
app.get('/api/products/:id', requirePermission('products', 'read'), async (ctx) => {
  // 需要 'products:read' 權限
})

app.post('/api/products', requirePermission('products', 'write'), async (ctx) => {
  // 需要 'products:write' 權限
})
```

### 3.3 資源級授權

```typescript
// 某些資源需要更細粒度的授權（如：用戶只能編輯自己的訂單）
async function requireResourceOwnership(resourceType: string, resourceId: string) {
  return async (ctx: GravitoContext, next: GravitoNext) => {
    const user = ctx.get('user') as JWTPayload

    // 查詢資源所有者
    const resource = await db(resourceType).where('id', resourceId).first()

    if (!resource) {
      return ctx.status(404).json({ error: 'Resource not found' })
    }

    // 檢查所有權
    if (resource.ownerId !== user.userId) {
      // 除非用戶是 admin
      const isAdmin = user.roles.includes('admin')
      if (!isAdmin) {
        return ctx.status(403).json({ error: 'Forbidden' })
      }
    }

    ctx.set('resource', resource)
    await next()
  }
}

// 使用
app.patch('/api/orders/:id',
  requireResourceOwnership('orders', ctx => ctx.param('id')),
  async (ctx) => {
    const order = ctx.get('resource')
    // 安全地編輯訂單
  }
)
```

---

## 4. Membership 衛星實現 (Membership Satellite)

### 4.1 用戶服務架構

```typescript
export class MembershipServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 註冊倉庫
    container.singleton('membership.repository.user', () =>
      new AtlasUserRepository()
    )

    // 註冊服務
    container.singleton('membership.service.auth', (c) =>
      new AuthService(
        c.make('membership.repository.user'),
        c.make('membership.repository.role')
      )
    )

    // 註冊控制器
    container.singleton('membership.controller.auth', (c) =>
      new AuthController(c.make('membership.service.auth'))
    )
  }

  override boot(): void {
    const core = this.core!
    const authCtrl = core.container.make('membership.controller.auth')

    // 註冊路由
    core.router.prefix('/api/auth').group((router) => {
      router.post('/register', (ctx) => authCtrl.register(ctx))
      router.post('/login', (ctx) => authCtrl.login(ctx))
      router.post('/logout', (ctx) => authCtrl.logout(ctx))
      router.post('/refresh', (ctx) => authCtrl.refreshToken(ctx))
      router.get('/me', (ctx) => authCtrl.getCurrentUser(ctx))
    })

    // 發佈身份驗證中介軟體
    const authMiddleware = (ctx: GravitoContext, next: GravitoNext) => {
      const token = ctx.req.header('Authorization')?.replace('Bearer ', '')

      if (token) {
        try {
          const payload = verifyJWT(token)
          ctx.set('user', payload)
        } catch (error) {
          // 令牌無效但不阻止請求（部分路由不需要認證）
        }
      }

      return next()
    }

    core.router.use(authMiddleware)
  }
}
```

### 4.2 用戶倉庫

```typescript
export class AtlasUserRepository implements IUserRepository {
  async createUser(input: CreateUserInput): Promise<User> {
    const userId = generateId()
    const passwordHash = await hash(input.password, 12)

    await this.db('users').insert({
      id: userId,
      email: input.email,
      name: input.name,
      passwordHash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return this.findById(userId) as Promise<User>
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.db('users')
      .where('id', id)
      .first()

    if (!user) return null

    // 載入用戶角色和權限
    const roles = await this.db('user_roles')
      .join('roles', 'user_roles.role_id', '=', 'roles.id')
      .where('user_roles.user_id', id)
      .select('roles.*')

    const permissions = await this.loadPermissions(id)

    return new User({
      ...user,
      roles: roles.map(r => r.name),
      permissions
    })
  }

  private async loadPermissions(userId: string): Promise<string[]> {
    // 從用戶角色載入權限
    const roleIds = await this.db('user_roles')
      .where('user_id', userId)
      .pluck('role_id')

    if (roleIds.length === 0) return []

    const permissions = await this.db('role_permissions')
      .whereIn('role_id', roleIds)
      .pluck('permission')

    return [...new Set(permissions)]  // 去重
  }
}
```

---

## 5. OAuth2 & OpenID Connect (可選擴展)

### 5.1 OAuth2 提供商

```typescript
// 允許第三方應用訪問 Gravito 資源
import { AuthorizationServer } from 'oauth2orize'

const server = new AuthorizationServer()

// 授權碼流程
server.grant(code((client, redirectURI, user, info, done) => {
  const authCode = generateAuthCode()

  db('auth_codes').insert({
    code: authCode,
    clientId: client.id,
    userId: user.id,
    redirectURI,
    expiresAt: Date.now() + 10 * 60 * 1000  // 10 分鐘
  })

  done(null, authCode)
}))

// 令牌交換
server.exchange(code((client, code, redirectURI, done) => {
  db('auth_codes').where('code', code).first((err, authCode) => {
    if (err || !authCode) return done(err)

    // 驗證重定向 URI
    if (authCode.redirectURI !== redirectURI) {
      return done(null, false)
    }

    // 生成令牌
    const token = generateJWT({
      userId: authCode.userId,
      clientId: authCode.clientId
    })

    done(null, token)
  })
}))
```

### 5.2 與 Google OAuth 集成

```typescript
import { OAuth2Client } from 'google-auth-library'

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
)

app.get('/api/auth/google/callback', async (ctx) => {
  const code = ctx.query('code')

  // 交換授權碼獲取令牌
  const { tokens } = await oauth2Client.getToken(code)

  // 驗證 ID 令牌
  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token
  })

  const payload = ticket.getPayload()

  // 查找或建立用戶
  let user = await db('users')
    .where('email', payload.email)
    .first()

  if (!user) {
    user = await createUserFromGoogle(payload)
  }

  // 簽發 JWT
  const jwt = generateJWT({
    userId: user.id,
    email: user.email
  })

  return ctx.json({ token: jwt })
})
```

---

## 6. 會話管理 (Session Management)

### 6.1 刷新令牌

```typescript
// 長期令牌往往包含敏感信息，應該短期有效
// 刷新令牌用於獲取新的訪問令牌

const tokens = {
  accessToken: generateJWT({
    userId: user.id,
    expiresIn: '15 minutes'  // 短期
  }),
  refreshToken: generateJWT({
    userId: user.id,
    type: 'refresh',
    expiresIn: '7 days'  // 長期
  })
}

// 刷新訪問令牌
app.post('/api/auth/refresh', async (ctx) => {
  const { refreshToken } = ctx.body

  try {
    const payload = verifyJWT(refreshToken)

    if (payload.type !== 'refresh') {
      return ctx.status(401).json({ error: 'Invalid token type' })
    }

    const newAccessToken = generateJWT({
      userId: payload.userId,
      expiresIn: '15 minutes'
    })

    return ctx.json({ accessToken: newAccessToken })
  } catch (error) {
    return ctx.status(401).json({ error: 'Invalid refresh token' })
  }
})
```

### 6.2 令牌黑名單（登出）

```typescript
// 被登出的令牌應該被列入黑名單
const tokenBlacklist = new Set<string>()

app.post('/api/auth/logout', async (ctx) => {
  const token = ctx.req.header('Authorization')?.replace('Bearer ', '')

  if (token) {
    const payload = verifyJWT(token)
    // 將令牌加入黑名單直到過期
    tokenBlacklist.add(token)

    // 設置 Redis 存儲（用於分佈式系統）
    await redis.setex(`blacklist:${token}`, payload.exp - Math.floor(Date.now() / 1000), '1')
  }

  return ctx.json({ message: 'Logged out' })
})

// 驗證時檢查黑名單
function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token) || redis.exists(`blacklist:${token}`)
}
```

---

## 7. 安全最佳實踐 (Security Best Practices)

### 7.1 密碼策略

```typescript
// 強制密碼複雜性
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 12) errors.push('Password must be at least 12 characters')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Password must contain number')
  if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain special character')

  return {
    valid: errors.length === 0,
    errors
  }
}

// 定期強制更改密碼
async function checkPasswordAge(userId: string): Promise<void> {
  const user = await db('users').where('id', userId).first()
  const daysSinceChange = (Date.now() - user.passwordChangedAt) / (1000 * 60 * 60 * 24)

  if (daysSinceChange > 90) {
    // 強制用戶更改密碼
    user.requirePasswordChange = true
  }
}
```

### 7.2 多因素認證（MFA）

```typescript
import { authenticator } from 'otplib'

// 啟用 MFA
app.post('/api/auth/mfa/enable', async (ctx) => {
  const user = ctx.get('user') as JWTPayload

  // 生成 TOTP 密鑰
  const secret = authenticator.generateSecret()

  // 返回二維碼供用戶掃描
  const qrCode = authenticator.keyuri(user.email, 'Gravito', secret)

  return ctx.json({ qrCode, secret })
})

// 驗證 MFA
app.post('/api/auth/mfa/verify', async (ctx) => {
  const { code, secret } = ctx.body

  const isValid = authenticator.check(code, secret)

  if (!isValid) {
    return ctx.status(401).json({ error: 'Invalid MFA code' })
  }

  // 保存 MFA 密鑰到數據庫
  await db('users')
    .where('id', ctx.get('user').userId)
    .update({ mfaSecret: secret, mfaEnabled: true })

  return ctx.json({ message: 'MFA enabled' })
})
```

---

## 8. 相關文檔與資源

- **[Membership 衛星實現](../../satellites/membership/)** - 實際代碼
- **[OWASP 認證備忘單](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)** - 安全指南
- **[JWT 最佳實踐](https://tools.ietf.org/html/rfc8725)** - RFC 標準
- **[OAuth 2.0 安全指南](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)** - 安全考量

---

**撰寫日期**：2026-02-08
**版本**：1.0
