import { beforeAll, describe, expect, it } from 'bun:test'
import path from 'node:path'
import { DB, Schema } from '@gravito/atlas'
import { DevMailbox, MemoryTransport, OrbitSignal } from '@gravito/signal'
import { RegisterMember } from '../src/Application/UseCases/RegisterMember'
import { AtlasMemberRepository } from '../src/Infrastructure/Persistence/AtlasMemberRepository'

describe('Membership Email Integration', () => {
  const repo = new AtlasMemberRepository()
  const mailbox = new DevMailbox()
  const transport = new MemoryTransport(mailbox)

  // Mock Core with Signal
  const mockCore: any = {
    hasher: {
      make: async (_val: string) => `hashed_\${val}`,
      check: async (_plain: string, hash: string) => `hashed_\${plain}` === hash,
    },
    hooks: {
      actions: {} as Record<string, Function[]>,
      addAction(name: string, cb: Function) {
        this.actions[name] = this.actions[name] || []
        this.actions[name].push(cb)
      },
      async doAction(name: string, data: any) {
        if (this.actions[name]) {
          for (const cb of this.actions[name]) {
            await cb(data)
          }
        }
      },
    },
    container: {
      bindings: new Map(),
      singleton(key: string, cb: Function) {
        this.bindings.set(key, cb())
      },
      make(key: string) {
        if (key === 'i18n') {
          return { t: (k: string) => k }
        }
        return this.bindings.get(key)
      },
    },
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
    },
  }

  // Setup Signal
  const signal = new OrbitSignal({
    transport,
    from: { address: 'no-reply@gravito.dev', name: 'Gravito' },
    viewsDir: path.resolve(import.meta.dir, '../views'),
  })

  // Setup UseCase
  const registerUseCase = new RegisterMember(repo, mockCore)

  beforeAll(async () => {
    // 1. Database
    DB.addConnection('default', { driver: 'sqlite', database: ':memory:' })
    await Schema.create('members', (table) => {
      table.string('id').primary()
      table.string('name')
      table.string('email').unique()
      table.string('password_hash')
      table.string('status')
      table.text('roles')
      table.string('verification_token')
      table.timestamp('email_verified_at').nullable()
      table.string('password_reset_token').nullable()
      table.timestamp('password_reset_expires_at').nullable()
      table.string('current_session_id').nullable()
      table.string('remember_token').nullable()
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.text('metadata').nullable()
    })

    // 2. Register Hook (Manually since we are not booting the full provider)
    mockCore.hooks.addAction('membership:send-verification', async (data: any) => {
      await signal.send(
        new (await import('../src/Application/Mail/WelcomeMail')).WelcomeMail(
          data.email,
          data.token
        )
      )
    })
  })

  it('註冊後應觸發發送驗證郵件且包含美化樣式', async () => {
    const email = 'test@example.com'
    await registerUseCase.execute({
      name: 'Test User',
      email,
      passwordPlain: 'password',
    })

    const messages = mailbox.list()
    expect(messages.length).toBe(1)
    expect(messages[0].envelope.subject).toBe('membership.emails.welcome_subject')
    // 驗證是否包含 CSS 樣式標籤 (代表模板已渲染)
    expect(messages[0].html).toContain('<style>')
    expect(messages[0].html).toContain('Gravito App')
  })

  it('觸發忘記密碼應發送重設郵件', async () => {
    // 1. 註冊一個 Hook (模擬 ServiceProvider)
    mockCore.hooks.addAction('membership:send-reset-password', async (data: any) => {
      await signal.send(
        new (await import('../src/Application/Mail/ForgotPasswordMail')).ForgotPasswordMail(
          data.email,
          data.token
        )
      )
    })

    mailbox.clear()

    // 2. 模擬觸發 Hook
    await mockCore.hooks.doAction('membership:send-reset-password', {
      email: 'reset@example.com',
      token: 'secret-token',
    })

    const messages = mailbox.list()
    expect(messages.length).toBe(1)
    expect(messages[0].envelope.subject).toBe('membership.emails.reset_password_subject')
    expect(messages[0].html).toContain('secret-token')
    expect(messages[0].html).toContain('reset_password_button')
  })

  it('等級變更後應發送晉級通知郵件', async () => {
    mockCore.hooks.addAction('membership:level-changed', async (data: any) => {
      await signal.send(
        new (await import('../src/Application/Mail/MemberLevelChangedMail')).MemberLevelChangedMail(
          data.email,
          data.oldLevel,
          data.newLevel
        )
      )
    })

    mailbox.clear()

    await mockCore.hooks.doAction('membership:level-changed', {
      email: 'vip@example.com',
      oldLevel: 'Silver',
      newLevel: 'Gold',
    })

    const messages = mailbox.list()
    expect(messages.length).toBe(1)
    expect(messages[0].envelope.subject).toBe('membership.emails.level_changed_subject')
    expect(messages[0].html).toContain('Silver')
    expect(messages[0].html).toContain('Gold')
    expect(messages[0].html).toContain('level_changed_badge')
  })
})
