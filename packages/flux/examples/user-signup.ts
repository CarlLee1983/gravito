/**
 * @fileoverview 使用者註冊工作流程
 *
 * 展示帳號驗證、密碼加密、寄送驗證信、追蹤分析。
 *
 * @example
 * ```bash
 * bun run examples/user-signup.ts
 * ```
 */

import { FluxEngine, createWorkflow, MemoryStorage } from '../src'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SignupInput {
    email: string
    password: string
    name: string
}

interface User {
    id: string
    email: string
    name: string
    createdAt: Date
}

// ─────────────────────────────────────────────────────────────
// Mock Services
// ─────────────────────────────────────────────────────────────

const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const bcrypt = {
    async hash(password: string, rounds: number): Promise<string> {
        console.log(`  🔐 Hashing password (${rounds} rounds)`)
        await new Promise((r) => setTimeout(r, 100))
        return `$2b$${rounds}$${Buffer.from(password).toString('base64').slice(0, 22)}`
    },
}

const db = {
    users: {
        async findByEmail(email: string): Promise<User | null> {
            console.log(`  🔍 Checking if ${email} exists`)
            return null // Simulate not found
        },
        async create(data: { email: string; password: string; name: string }): Promise<User> {
            console.log('  💾 Creating user in database')
            return {
                id: `user-${Date.now()}`,
                email: data.email,
                name: data.name,
                createdAt: new Date(),
            }
        },
    },
}

const generateVerificationToken = async (userId: string): Promise<string> => {
    return `verify-${userId}-${Date.now()}`
}

const email = {
    async send(to: string, template: string, data: unknown): Promise<void> {
        console.log(`  📧 Sending ${template} to ${to}`)
        console.log(`     Data:`, JSON.stringify(data))
    },
}

const analytics = {
    async track(event: string, properties: Record<string, unknown>): Promise<void> {
        console.log(`  📊 Tracking: ${event}`, properties)
    },
}

// ─────────────────────────────────────────────────────────────
// Workflow Definition
// ─────────────────────────────────────────────────────────────

const signupWorkflow = createWorkflow('user-signup')
    .input<SignupInput>()
    .step('validate', async (ctx) => {
        console.log('\n🔍 Step: validate')

        // Validate email format
        if (!isValidEmail(ctx.input.email)) {
            throw new Error('Email 格式無效')
        }

        // Check password strength
        if (ctx.input.password.length < 8) {
            throw new Error('密碼長度至少需要 8 個字元')
        }

        // Check if user exists
        const exists = await db.users.findByEmail(ctx.input.email)
        if (exists) {
            throw new Error('Email 已被使用')
        }

        ctx.data.validated = true
    })
    .step('hash', async (ctx) => {
        console.log('\n🔐 Step: hash')

        ctx.data.hashedPassword = await bcrypt.hash(ctx.input.password, 12)
    })
    .commit('create', async (ctx) => {
        console.log('\n💾 Step: create (commit)')

        ctx.data.user = await db.users.create({
            email: ctx.input.email,
            password: ctx.data.hashedPassword as string,
            name: ctx.input.name,
        })
    })
    .commit('sendVerification', async (ctx) => {
        console.log('\n📧 Step: sendVerification (commit)')

        const user = ctx.data.user as User
        const token = await generateVerificationToken(user.id)

        await email.send(ctx.input.email, 'verify-email', {
            name: ctx.input.name,
            token,
            link: `https://example.com/verify?token=${token}`,
        })
    })
    .commit('analytics', async (ctx) => {
        console.log('\n📊 Step: analytics (commit)')

        const user = ctx.data.user as User
        await analytics.track('user_signup', {
            userId: user.id,
            source: 'web',
            timestamp: new Date().toISOString(),
        })
    })

// ─────────────────────────────────────────────────────────────
// Execute
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════════')
    console.log('   👤 User Signup Workflow Example')
    console.log('═══════════════════════════════════════════════════════')

    const engine = new FluxEngine({
        storage: new MemoryStorage(),
    })

    const result = await engine.execute(signupWorkflow, {
        email: 'alice@example.com',
        password: 'securePassword123',
        name: 'Alice Chen',
    })

    console.log('\n═══════════════════════════════════════════════════════')
    console.log('   📊 Result')
    console.log('═══════════════════════════════════════════════════════')
    console.log('Status:', result.status)
    console.log('Duration:', result.duration, 'ms')

    if (result.status === 'completed') {
        const user = result.data.user as User
        console.log('User ID:', user.id)
        console.log('Email:', user.email)
    }
}

main().catch(console.error)
