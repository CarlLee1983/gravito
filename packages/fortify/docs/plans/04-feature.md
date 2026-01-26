# Phase 4: 功能擴展計劃

> 優先級: P2 | 預估影響: 中

## 現況分析

### 已實現功能

| 功能 | 狀態 | 說明 |
|------|------|------|
| 用戶註冊 | ✅ | 完整流程 |
| 登入/登出 | ✅ | 含記住我功能 |
| 密碼重設 | ✅ | 郵件通知 |
| 電子郵件驗證 | ✅ | 簽署 URL |
| JSON/SPA 模式 | ✅ | API 回應 |
| Inertia 適配 | ✅ | React/Vue |

### 計劃新增功能

| 功能 | 優先級 | 說明 |
|------|--------|------|
| 雙因素認證 (2FA) | P2-A | TOTP/SMS |
| OAuth/社交登入 | P2-B | Google/GitHub/等 |
| 裝置管理 | P2-C | 活動會話管理 |
| 魔法連結登入 | P2-D | 無密碼登入 |
| API Token 認證 | P2-E | Sanctum 風格 |

## 優化方案

### 4.1 雙因素認證 (2FA)

**目標**: 支援 TOTP 和 SMS 雙因素認證

#### 配置介面

```typescript
interface TwoFactorConfig {
  enabled: boolean
  methods: {
    totp: {
      enabled: boolean
      issuer: string           // TOTP 發行者名稱
      digits: 6 | 8            // 驗證碼長度
      period: number           // 有效期 (秒)
    }
    sms: {
      enabled: boolean
      provider: 'twilio' | 'custom'
      codeLength: number
      expireMinutes: number
    }
    email: {
      enabled: boolean
      codeLength: number
      expireMinutes: number
    }
  }
  recoveryCodesCount: number   // 恢復碼數量 (預設: 8)
  enforceFor?: string[]        // 強制啟用的角色
}
```

#### 資料庫結構

```typescript
// migrations/create_two_factor_table.ts
export default {
  up: (knex) => {
    return knex.schema
      .alterTable('users', (table) => {
        table.string('two_factor_secret').nullable()
        table.text('two_factor_recovery_codes').nullable()
        table.timestamp('two_factor_confirmed_at').nullable()
        table.string('two_factor_method').nullable() // 'totp' | 'sms' | 'email'
      })
      .createTable('two_factor_challenges', (table) => {
        table.bigIncrements('id')
        table.bigInteger('user_id').notNullable().references('id').inTable('users')
        table.string('method', 10).notNullable()
        table.string('code', 10).nullable()  // 用於 SMS/Email
        table.timestamp('expires_at').notNullable()
        table.timestamp('verified_at').nullable()
        table.timestamp('created_at').defaultTo(knex.fn.now())
      })
  }
}
```

#### 控制器

```typescript
// src/controllers/TwoFactorController.ts
class TwoFactorController extends BaseController {
  /**
   * 顯示 2FA 設定頁面
   */
  async setup(c: Context) {
    const user = await this.services.auth.user(c)
    const secret = this.services.twoFactor.generateSecret()

    // 暫存 secret 等待確認
    await this.services.session.set(c, 'two_factor_secret', secret)

    const qrCodeUrl = this.services.twoFactor.generateQRCodeUrl(
      user.email,
      secret
    )

    return this.render(c, 'two-factor/setup', {
      qrCode: qrCodeUrl,
      secret: secret.base32
    })
  }

  /**
   * 確認啟用 2FA
   */
  async confirm(c: Context) {
    const { code } = await c.req.parseBody()
    const user = await this.services.auth.user(c)
    const secret = await this.services.session.get(c, 'two_factor_secret')

    if (!this.services.twoFactor.verify(secret, code)) {
      return this.error(c, ErrorCodes.TFA_INVALID_CODE)
    }

    // 生成恢復碼
    const recoveryCodes = this.services.twoFactor.generateRecoveryCodes()

    await user.update({
      two_factor_secret: this.services.crypto.encrypt(secret),
      two_factor_recovery_codes: this.services.crypto.encrypt(
        JSON.stringify(recoveryCodes)
      ),
      two_factor_confirmed_at: new Date(),
      two_factor_method: 'totp'
    })

    await this.services.session.forget(c, 'two_factor_secret')
    await this.services.events.emit('auth:two-factor-enabled', { user })

    return this.render(c, 'two-factor/recovery-codes', {
      codes: recoveryCodes
    })
  }

  /**
   * 驗證 2FA 挑戰
   */
  async challenge(c: Context) {
    const { code, recovery } = await c.req.parseBody()
    const userId = await this.services.session.get(c, 'two_factor_user_id')

    if (!userId) {
      return this.error(c, ErrorCodes.TFA_SESSION_EXPIRED, 401)
    }

    const user = await this.config.userModel().find(userId)

    // 嘗試恢復碼
    if (recovery) {
      const valid = await this.services.twoFactor.verifyRecoveryCode(user, code)
      if (!valid) {
        return this.error(c, ErrorCodes.TFA_INVALID_RECOVERY_CODE)
      }
    } else {
      // 嘗試 TOTP
      const secret = this.services.crypto.decrypt(user.two_factor_secret)
      if (!this.services.twoFactor.verify(secret, code)) {
        return this.error(c, ErrorCodes.TFA_INVALID_CODE)
      }
    }

    // 完成登入
    await this.services.session.forget(c, 'two_factor_user_id')
    await this.services.auth.loginById(c, userId)
    await this.services.events.emit('auth:two-factor-verified', { user })

    return this.success(c, null, this.config.redirects.login)
  }

  /**
   * 禁用 2FA
   */
  async disable(c: Context) {
    const { password } = await c.req.parseBody()
    const user = await this.services.auth.user(c)

    // 驗證密碼
    if (!await this.services.hash.check(password, user.password)) {
      return this.error(c, ErrorCodes.AUTH_INVALID_PASSWORD)
    }

    await user.update({
      two_factor_secret: null,
      two_factor_recovery_codes: null,
      two_factor_confirmed_at: null,
      two_factor_method: null
    })

    await this.services.events.emit('auth:two-factor-disabled', { user })

    return this.success(c, null, '/settings/security')
  }
}
```

#### 服務

```typescript
// src/services/TwoFactorService.ts
import { authenticator } from 'otplib'

class TwoFactorService {
  constructor(private config: TwoFactorConfig) {
    authenticator.options = {
      digits: config.methods.totp.digits,
      step: config.methods.totp.period
    }
  }

  generateSecret(): string {
    return authenticator.generateSecret()
  }

  generateQRCodeUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, this.config.methods.totp.issuer, secret)
  }

  verify(secret: string, token: string): boolean {
    return authenticator.verify({ secret, token })
  }

  generateRecoveryCodes(count: number = 8): string[] {
    return Array.from({ length: count }, () =>
      crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
    )
  }

  async verifyRecoveryCode(user: User, code: string): Promise<boolean> {
    const codes: string[] = JSON.parse(
      this.crypto.decrypt(user.two_factor_recovery_codes)
    )

    const index = codes.indexOf(code.toUpperCase())
    if (index === -1) return false

    // 移除已使用的恢復碼
    codes.splice(index, 1)
    await user.update({
      two_factor_recovery_codes: this.crypto.encrypt(JSON.stringify(codes))
    })

    return true
  }
}
```

### 4.2 OAuth/社交登入

**目標**: 支援主流 OAuth 提供者

#### 配置介面

```typescript
interface OAuthConfig {
  providers: {
    [provider: string]: OAuthProviderConfig
  }
  defaultScopes?: string[]
  stateless: boolean
}

interface OAuthProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes?: string[]
  additionalParams?: Record<string, string>
}

// 預設支援的提供者
type BuiltInProvider = 'google' | 'github' | 'facebook' | 'twitter' | 'apple' | 'microsoft'
```

#### 控制器

```typescript
// src/controllers/OAuthController.ts
class OAuthController extends BaseController {
  /**
   * 重導向至 OAuth 提供者
   */
  async redirect(c: Context) {
    const provider = c.req.param('provider')
    const providerConfig = this.config.oauth.providers[provider]

    if (!providerConfig) {
      return this.error(c, ErrorCodes.OAUTH_UNKNOWN_PROVIDER, 404)
    }

    const state = crypto.randomUUID()
    await this.services.session.set(c, 'oauth_state', state)

    const authUrl = this.services.oauth.getAuthorizationUrl(provider, {
      state,
      scopes: providerConfig.scopes
    })

    return c.redirect(authUrl)
  }

  /**
   * 處理 OAuth 回調
   */
  async callback(c: Context) {
    const provider = c.req.param('provider')
    const { code, state } = c.req.query()

    // 驗證 state
    const savedState = await this.services.session.get(c, 'oauth_state')
    if (state !== savedState) {
      return this.error(c, ErrorCodes.OAUTH_INVALID_STATE, 401)
    }

    try {
      // 交換令牌
      const tokens = await this.services.oauth.exchangeCode(provider, code)

      // 取得用戶資訊
      const oauthUser = await this.services.oauth.getUser(provider, tokens)

      // 查找或建立用戶
      let user = await this.findUserByOAuth(provider, oauthUser.id)

      if (!user) {
        // 檢查是否有相同 email 的用戶
        user = await this.config.userModel()
          .where('email', oauthUser.email)
          .first()

        if (user) {
          // 連結現有帳戶
          await this.linkOAuthAccount(user, provider, oauthUser)
        } else {
          // 建立新用戶
          user = await this.createUserFromOAuth(provider, oauthUser)
        }
      }

      await this.services.auth.login(c, user)
      await this.services.events.emit('auth:oauth-login', {
        user,
        provider,
        oauthUser
      })

      return this.success(c, null, this.config.redirects.login)

    } catch (error) {
      await this.services.events.emit('auth:oauth-failed', {
        provider,
        error
      })
      return this.error(c, ErrorCodes.OAUTH_AUTHENTICATION_FAILED)
    }
  }

  private async createUserFromOAuth(
    provider: string,
    oauthUser: OAuthUser
  ): Promise<User> {
    const user = await this.config.userModel().create({
      name: oauthUser.name,
      email: oauthUser.email,
      avatar: oauthUser.avatar,
      email_verified_at: oauthUser.emailVerified ? new Date() : null
    })

    await OAuthIdentity.create({
      user_id: user.id,
      provider,
      provider_id: oauthUser.id,
      access_token: oauthUser.accessToken,
      refresh_token: oauthUser.refreshToken,
      expires_at: oauthUser.expiresAt
    })

    return user
  }
}
```

#### 資料庫結構

```typescript
// migrations/create_oauth_identities_table.ts
export default {
  up: (knex) => knex.schema.createTable('oauth_identities', (table) => {
    table.bigIncrements('id')
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('provider', 50).notNullable()
    table.string('provider_id').notNullable()
    table.text('access_token').nullable()
    table.text('refresh_token').nullable()
    table.timestamp('expires_at').nullable()
    table.json('metadata').nullable()
    table.timestamps(true, true)

    table.unique(['provider', 'provider_id'])
    table.index(['user_id', 'provider'])
  }),

  down: (knex) => knex.schema.dropTable('oauth_identities')
}
```

### 4.3 裝置管理

**目標**: 讓用戶管理活動會話和裝置

#### 資料庫結構

```typescript
// migrations/create_user_devices_table.ts
export default {
  up: (knex) => knex.schema.createTable('user_devices', (table) => {
    table.bigIncrements('id')
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('session_id').notNullable().unique()
    table.string('device_name').nullable()
    table.string('device_type', 20).nullable() // desktop, mobile, tablet
    table.string('browser', 50).nullable()
    table.string('platform', 50).nullable()
    table.string('ip_address', 45).notNullable()
    table.text('user_agent').nullable()
    table.boolean('is_current').defaultTo(false)
    table.timestamp('last_active_at').defaultTo(knex.fn.now())
    table.timestamp('created_at').defaultTo(knex.fn.now())

    table.index(['user_id', 'last_active_at'])
  }),

  down: (knex) => knex.schema.dropTable('user_devices')
}
```

#### 控制器

```typescript
// src/controllers/DeviceController.ts
class DeviceController extends BaseController {
  /**
   * 列出所有裝置
   */
  async index(c: Context) {
    const user = await this.services.auth.user(c)
    const currentSessionId = await this.services.session.getId(c)

    const devices = await UserDevice.where('user_id', user.id)
      .orderBy('last_active_at', 'desc')
      .get()

    const devicesWithCurrent = devices.map(device => ({
      ...device.toJSON(),
      isCurrent: device.session_id === currentSessionId
    }))

    if (this.config.jsonMode) {
      return c.json({ devices: devicesWithCurrent })
    }

    return this.render(c, 'devices/index', { devices: devicesWithCurrent })
  }

  /**
   * 登出特定裝置
   */
  async destroy(c: Context) {
    const deviceId = c.req.param('id')
    const user = await this.services.auth.user(c)

    const device = await UserDevice.where('id', deviceId)
      .where('user_id', user.id)
      .first()

    if (!device) {
      return this.error(c, ErrorCodes.DEVICE_NOT_FOUND, 404)
    }

    // 銷毀會話
    await this.services.session.destroy(device.session_id)
    await device.delete()

    await this.services.events.emit('auth:device-revoked', {
      user,
      device
    })

    return this.success(c)
  }

  /**
   * 登出所有其他裝置
   */
  async destroyOthers(c: Context) {
    const user = await this.services.auth.user(c)
    const currentSessionId = await this.services.session.getId(c)

    const devices = await UserDevice.where('user_id', user.id)
      .where('session_id', '!=', currentSessionId)
      .get()

    for (const device of devices) {
      await this.services.session.destroy(device.session_id)
      await device.delete()
    }

    await this.services.events.emit('auth:all-devices-revoked', {
      user,
      count: devices.length
    })

    return this.success(c)
  }
}
```

### 4.4 魔法連結登入

**目標**: 支援無密碼登入

```typescript
// src/controllers/MagicLinkController.ts
class MagicLinkController extends BaseController {
  /**
   * 發送魔法連結
   */
  async send(c: Context) {
    const { email } = await c.req.parseBody()

    const user = await this.config.userModel()
      .where('email', email)
      .first()

    if (!user) {
      // 不洩漏用戶是否存在
      return this.success(c, { message: '如果帳戶存在，您將收到登入連結' })
    }

    const token = await this.services.tokens.create({
      userId: user.id,
      type: 'magic_link',
      expiresIn: '15m'
    })

    const loginUrl = this.generateMagicLinkUrl(token)

    await this.services.mail.send(
      new MagicLinkMail(user.email, loginUrl)
    )

    await this.services.events.emit('auth:magic-link-sent', { user })

    return this.success(c, { message: '登入連結已發送至您的電子郵件' })
  }

  /**
   * 驗證魔法連結
   */
  async verify(c: Context) {
    const { token } = c.req.param()

    const tokenData = await this.services.tokens.verify(token, 'magic_link')

    if (!tokenData) {
      return this.error(c, ErrorCodes.MAGIC_LINK_INVALID)
    }

    const user = await this.config.userModel().find(tokenData.userId)

    await this.services.tokens.revoke(token)
    await this.services.auth.login(c, user)

    await this.services.events.emit('auth:magic-link-login', { user })

    return this.success(c, null, this.config.redirects.login)
  }
}
```

### 4.5 API Token 認證

**目標**: 支援 Sanctum 風格的 API Token

```typescript
// migrations/create_personal_access_tokens_table.ts
export default {
  up: (knex) => knex.schema.createTable('personal_access_tokens', (table) => {
    table.bigIncrements('id')
    table.string('tokenable_type', 100).notNullable()
    table.bigInteger('tokenable_id').notNullable()
    table.string('name').notNullable()
    table.string('token', 64).notNullable().unique()
    table.json('abilities').nullable()
    table.timestamp('last_used_at').nullable()
    table.timestamp('expires_at').nullable()
    table.timestamps(true, true)

    table.index(['tokenable_type', 'tokenable_id'])
  }),

  down: (knex) => knex.schema.dropTable('personal_access_tokens')
}

// src/services/TokenService.ts
class PersonalAccessTokenService {
  async createToken(
    user: User,
    name: string,
    abilities: string[] = ['*'],
    expiresAt?: Date
  ): Promise<{ token: string; accessToken: PersonalAccessToken }> {
    const plainToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = await this.hash(plainToken)

    const accessToken = await PersonalAccessToken.create({
      tokenable_type: 'User',
      tokenable_id: user.id,
      name,
      token: hashedToken,
      abilities: JSON.stringify(abilities),
      expires_at: expiresAt
    })

    return {
      token: `${accessToken.id}|${plainToken}`,
      accessToken
    }
  }

  async validateToken(bearerToken: string): Promise<{
    user: User
    token: PersonalAccessToken
  } | null> {
    const [id, plainToken] = bearerToken.split('|')

    const accessToken = await PersonalAccessToken.find(id)
    if (!accessToken) return null

    if (accessToken.expires_at && new Date() > accessToken.expires_at) {
      return null
    }

    const valid = await this.verifyHash(plainToken, accessToken.token)
    if (!valid) return null

    // 更新最後使用時間
    await accessToken.update({ last_used_at: new Date() })

    const user = await User.find(accessToken.tokenable_id)
    return { user, token: accessToken }
  }
}
```

## 新增路由

```typescript
// 2FA 路由
router.get('/two-factor/setup', twoFactorController.setup)
router.post('/two-factor/confirm', twoFactorController.confirm)
router.get('/two-factor/challenge', twoFactorController.showChallenge)
router.post('/two-factor/challenge', twoFactorController.challenge)
router.delete('/two-factor', twoFactorController.disable)

// OAuth 路由
router.get('/oauth/:provider', oauthController.redirect)
router.get('/oauth/:provider/callback', oauthController.callback)

// 裝置管理路由
router.get('/devices', deviceController.index)
router.delete('/devices/:id', deviceController.destroy)
router.delete('/devices', deviceController.destroyOthers)

// 魔法連結路由
router.get('/magic-link', magicLinkController.show)
router.post('/magic-link', magicLinkController.send)
router.get('/magic-link/:token', magicLinkController.verify)

// API Token 路由
router.get('/tokens', tokenController.index)
router.post('/tokens', tokenController.create)
router.delete('/tokens/:id', tokenController.destroy)
```

## 實施步驟

### Step 1: 雙因素認證
- [ ] 安裝 `otplib` 依賴
- [ ] 建立資料庫遷移
- [ ] 實作 `TwoFactorService`
- [ ] 實作 `TwoFactorController`
- [ ] 修改登入流程支援 2FA 挑戰
- [ ] 建立視圖模板

### Step 2: OAuth 整合
- [ ] 設計 OAuth 服務介面
- [ ] 實作 Google 提供者
- [ ] 實作 GitHub 提供者
- [ ] 實作 `OAuthController`
- [ ] 建立 OAuth 身份表

### Step 3: 裝置管理
- [ ] 建立 `user_devices` 表
- [ ] 實作裝置追蹤中介軟體
- [ ] 實作 `DeviceController`
- [ ] 建立管理視圖

### Step 4: 魔法連結
- [ ] 實作 Token 服務
- [ ] 實作 `MagicLinkController`
- [ ] 建立郵件模板
- [ ] 整合至登入頁面

### Step 5: API Token
- [ ] 建立 `personal_access_tokens` 表
- [ ] 實作 `PersonalAccessTokenService`
- [ ] 實作 API 認證中介軟體
- [ ] 實作 Token 管理 API

## 成功標準

- [ ] 2FA 支援 TOTP 方式
- [ ] OAuth 支援至少 Google 和 GitHub
- [ ] 用戶可管理所有登入裝置
- [ ] 魔法連結登入正常運作
- [ ] API Token 認證正常運作
- [ ] 所有新功能有完整測試
- [ ] 文件更新完成
