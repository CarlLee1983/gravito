import fs from 'node:fs/promises'
import path from 'node:path'
import pc from 'picocolors'

export type FortifyStack = 'html' | 'react' | 'vue'

interface FortifyInstallOptions {
    stack: FortifyStack
    force?: boolean
}

/**
 * Install Fortify authentication scaffolding
 */
export async function installFortify(options: FortifyInstallOptions): Promise<void> {
    const cwd = process.cwd()
    const { stack, force = false } = options

    console.log(pc.cyan('\n🔐 Installing @gravito/fortify authentication scaffolding...\n'))

    // 1. Generate config file
    await generateConfig(cwd, force)

    // 2. Generate migrations
    await generateMigrations(cwd, force)

    // 3. Generate views based on stack
    await generateViews(cwd, stack, force)

    // 4. Generate User model if not exists
    await generateUserModel(cwd, force)

    console.log(pc.green('\n✅ Fortify authentication installed successfully!\n'))
    console.log(pc.dim('Next steps:'))
    console.log(pc.dim('  1. Run `bun gravito db:migrate` to create tables'))
    console.log(pc.dim('  2. Add FortifyOrbit to your gravito.config.ts'))
    console.log(pc.dim('  3. Visit /login to test authentication\n'))
}

async function generateConfig(cwd: string, force: boolean): Promise<void> {
    const configPath = path.join(cwd, 'config', 'fortify.ts')

    if (!force && await fileExists(configPath)) {
        console.log(pc.yellow('  ⚠ config/fortify.ts already exists, skipping...'))
        return
    }

    await ensureDir(path.dirname(configPath))

    const content = `import { definefortifyConfig } from '@gravito/fortify'
import { User } from '../src/models/User'

export default definefortifyConfig({
  // User model factory
  userModel: () => User,

  // Feature toggles
  features: {
    registration: true,
    resetPasswords: true,
    emailVerification: false,
  },

  // Redirect paths
  redirects: {
    login: '/dashboard',
    logout: '/',
    register: '/dashboard',
  },

  // Use JSON responses for SPA mode
  jsonMode: false,

  // Route prefix (e.g., '/auth' for /auth/login)
  prefix: '',
})
`

    await fs.writeFile(configPath, content, 'utf-8')
    console.log(pc.green('  ✓ Created config/fortify.ts'))
}

async function generateMigrations(cwd: string, force: boolean): Promise<void> {
    const migrationsDir = path.join(cwd, 'src', 'database', 'migrations')
    await ensureDir(migrationsDir)

    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)

    // Users table migration
    const usersPath = path.join(migrationsDir, `${timestamp}_create_users_table.ts`)
    if (!force && await fileExists(usersPath)) {
        console.log(pc.yellow('  ⚠ Users migration already exists, skipping...'))
    } else {
        const usersContent = `import { Migration, Schema, Blueprint } from '@gravito/atlas'

export default class CreateUsersTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('users', (table: Blueprint) => {
      table.id()
      table.string('name')
      table.string('email').unique()
      table.timestamp('email_verified_at').nullable()
      table.string('password')
      table.string('remember_token', 100).nullable()
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('users')
  }
}
`
        await fs.writeFile(usersPath, usersContent, 'utf-8')
        console.log(pc.green(`  ✓ Created ${path.relative(cwd, usersPath)}`))
    }

    // Password reset tokens migration
    const timestamp2 = String(Number(timestamp) + 1).padStart(14, '0')
    const resetPath = path.join(migrationsDir, `${timestamp2}_create_password_reset_tokens_table.ts`)
    if (!force && await fileExists(resetPath)) {
        console.log(pc.yellow('  ⚠ Password reset tokens migration already exists, skipping...'))
    } else {
        const resetContent = `import { Migration, Schema, Blueprint } from '@gravito/atlas'

export default class CreatePasswordResetTokensTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('password_reset_tokens', (table: Blueprint) => {
      table.string('email').primary()
      table.string('token')
      table.timestamp('created_at').nullable()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('password_reset_tokens')
  }
}
`
        await fs.writeFile(resetPath, resetContent, 'utf-8')
        console.log(pc.green(`  ✓ Created ${path.relative(cwd, resetPath)}`))
    }
}

async function generateViews(cwd: string, stack: FortifyStack, force: boolean): Promise<void> {
    if (stack === 'html') {
        console.log(pc.dim('  ℹ HTML stack uses built-in templates, no view files generated'))
        return
    }

    const pagesDir = path.join(cwd, 'src', 'pages', 'auth')
    await ensureDir(pagesDir)

    if (stack === 'react') {
        await generateReactViews(pagesDir, cwd, force)
    } else if (stack === 'vue') {
        await generateVueViews(pagesDir, cwd, force)
    }
}

async function generateReactViews(pagesDir: string, cwd: string, force: boolean): Promise<void> {
    const views = [
        { name: 'Login.tsx', content: getReactLoginPage() },
        { name: 'Register.tsx', content: getReactRegisterPage() },
        { name: 'ForgotPassword.tsx', content: getReactForgotPasswordPage() },
    ]

    for (const view of views) {
        const viewPath = path.join(pagesDir, view.name)
        if (!force && await fileExists(viewPath)) {
            console.log(pc.yellow(`  ⚠ ${view.name} already exists, skipping...`))
            continue
        }
        await fs.writeFile(viewPath, view.content, 'utf-8')
        console.log(pc.green(`  ✓ Created ${path.relative(cwd, viewPath)}`))
    }
}

async function generateVueViews(pagesDir: string, cwd: string, force: boolean): Promise<void> {
    const views = [
        { name: 'Login.vue', content: getVueLoginPage() },
        { name: 'Register.vue', content: getVueRegisterPage() },
        { name: 'ForgotPassword.vue', content: getVueForgotPasswordPage() },
    ]

    for (const view of views) {
        const viewPath = path.join(pagesDir, view.name)
        if (!force && await fileExists(viewPath)) {
            console.log(pc.yellow(`  ⚠ ${view.name} already exists, skipping...`))
            continue
        }
        await fs.writeFile(viewPath, view.content, 'utf-8')
        console.log(pc.green(`  ✓ Created ${path.relative(cwd, viewPath)}`))
    }
}

async function generateUserModel(cwd: string, force: boolean): Promise<void> {
    const modelPath = path.join(cwd, 'src', 'models', 'User.ts')

    if (!force && await fileExists(modelPath)) {
        console.log(pc.yellow('  ⚠ src/models/User.ts already exists, skipping...'))
        return
    }

    await ensureDir(path.dirname(modelPath))

    const content = `import { Model, column } from '@gravito/atlas'

export class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare password: string

  @column({ name: 'email_verified_at' })
  declare emailVerifiedAt: Date | null

  @column({ name: 'remember_token' })
  declare rememberToken: string | null

  @column({ name: 'created_at' })
  declare createdAt: Date

  @column({ name: 'updated_at' })
  declare updatedAt: Date

  // Hidden fields (not serialized)
  static hidden = ['password', 'rememberToken']
}
`

    await fs.writeFile(modelPath, content, 'utf-8')
    console.log(pc.green(`  ✓ Created ${path.relative(cwd, modelPath)}`))
}

// Helper functions
async function fileExists(filepath: string): Promise<boolean> {
    try {
        await fs.access(filepath)
        return true
    } catch {
        return false
    }
}

async function ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true })
}

// React view templates
function getReactLoginPage(): string {
    return `import { useForm, Head, Link } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function Login() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    remember: false,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post('/login')
  }

  return (
    <>
      <Head title="Login" />
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md p-8 bg-gray-800 rounded-2xl">
          <h1 className="text-2xl font-bold text-white mb-6">Sign In</h1>
          <form onSubmit={submit}>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
              />
            </div>
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-emerald-500 text-black font-semibold rounded-lg"
            >
              Sign In
            </button>
          </form>
          <p className="mt-4 text-center text-gray-400">
            <Link href="/forgot-password" className="text-emerald-400">Forgot password?</Link>
            {' · '}
            <Link href="/register" className="text-emerald-400">Create account</Link>
          </p>
        </div>
      </div>
    </>
  )
}
`
}

function getReactRegisterPage(): string {
    return `import { useForm, Head, Link } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function Register() {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post('/register')
  }

  return (
    <>
      <Head title="Register" />
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md p-8 bg-gray-800 rounded-2xl">
          <h1 className="text-2xl font-bold text-white mb-6">Create Account</h1>
          <form onSubmit={submit}>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Name</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Confirm Password</label>
              <input
                type="password"
                value={data.password_confirmation}
                onChange={(e) => setData('password_confirmation', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
              />
            </div>
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-emerald-500 text-black font-semibold rounded-lg"
            >
              Create Account
            </button>
          </form>
          <p className="mt-4 text-center text-gray-400">
            Already have an account? <Link href="/login" className="text-emerald-400">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  )
}
`
}

function getReactForgotPasswordPage(): string {
    return `import { useForm, Head, Link } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function ForgotPassword() {
  const { data, setData, post, processing } = useForm({ email: '' })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post('/forgot-password')
  }

  return (
    <>
      <Head title="Forgot Password" />
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md p-8 bg-gray-800 rounded-2xl">
          <h1 className="text-2xl font-bold text-white mb-2">Forgot Password</h1>
          <p className="text-gray-400 mb-6">Enter your email to receive a reset link.</p>
          <form onSubmit={submit}>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
              />
            </div>
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-emerald-500 text-black font-semibold rounded-lg"
            >
              Send Reset Link
            </button>
          </form>
          <p className="mt-4 text-center">
            <Link href="/login" className="text-emerald-400">Back to login</Link>
          </p>
        </div>
      </div>
    </>
  )
}
`
}

// Vue view templates
function getVueLoginPage(): string {
    return `<script setup lang="ts">
import { useForm, Head, Link } from '@inertiajs/vue3'

const form = useForm({
  email: '',
  password: '',
  remember: false,
})

const submit = () => {
  form.post('/login')
}
</script>

<template>
  <Head title="Login" />
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="w-full max-w-md p-8 bg-gray-800 rounded-2xl">
      <h1 class="text-2xl font-bold text-white mb-6">Sign In</h1>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
          />
        </div>
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Password</label>
          <input
            v-model="form.password"
            type="password"
            class="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
          />
        </div>
        <button
          type="submit"
          :disabled="form.processing"
          class="w-full py-3 bg-emerald-500 text-black font-semibold rounded-lg"
        >
          Sign In
        </button>
      </form>
      <p class="mt-4 text-center text-gray-400">
        <Link href="/forgot-password" class="text-emerald-400">Forgot password?</Link>
        ·
        <Link href="/register" class="text-emerald-400">Create account</Link>
      </p>
    </div>
  </div>
</template>
`
}

function getVueRegisterPage(): string {
    return `<script setup lang="ts">
import { useForm, Head, Link } from '@inertiajs/vue3'

const form = useForm({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const submit = () => {
  form.post('/register')
}
</script>

<template>
  <Head title="Register" />
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="w-full max-w-md p-8 bg-gray-800 rounded-2xl">
      <h1 class="text-2xl font-bold text-white mb-6">Create Account</h1>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Name</label>
          <input v-model="form.name" type="text" class="w-full px-4 py-3 bg-gray-700 rounded-lg text-white" />
        </div>
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Email</label>
          <input v-model="form.email" type="email" class="w-full px-4 py-3 bg-gray-700 rounded-lg text-white" />
        </div>
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Password</label>
          <input v-model="form.password" type="password" class="w-full px-4 py-3 bg-gray-700 rounded-lg text-white" />
        </div>
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Confirm Password</label>
          <input v-model="form.password_confirmation" type="password" class="w-full px-4 py-3 bg-gray-700 rounded-lg text-white" />
        </div>
        <button type="submit" :disabled="form.processing" class="w-full py-3 bg-emerald-500 text-black font-semibold rounded-lg">
          Create Account
        </button>
      </form>
      <p class="mt-4 text-center text-gray-400">
        Already have an account? <Link href="/login" class="text-emerald-400">Sign in</Link>
      </p>
    </div>
  </div>
</template>
`
}

function getVueForgotPasswordPage(): string {
    return `<script setup lang="ts">
import { useForm, Head, Link } from '@inertiajs/vue3'

const form = useForm({ email: '' })

const submit = () => {
  form.post('/forgot-password')
}
</script>

<template>
  <Head title="Forgot Password" />
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="w-full max-w-md p-8 bg-gray-800 rounded-2xl">
      <h1 class="text-2xl font-bold text-white mb-2">Forgot Password</h1>
      <p class="text-gray-400 mb-6">Enter your email to receive a reset link.</p>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Email</label>
          <input v-model="form.email" type="email" class="w-full px-4 py-3 bg-gray-700 rounded-lg text-white" />
        </div>
        <button type="submit" :disabled="form.processing" class="w-full py-3 bg-emerald-500 text-black font-semibold rounded-lg">
          Send Reset Link
        </button>
      </form>
      <p class="mt-4 text-center">
        <Link href="/login" class="text-emerald-400">Back to login</Link>
      </p>
    </div>
  </div>
</template>
`
}
