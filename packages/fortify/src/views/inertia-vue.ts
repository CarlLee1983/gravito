/**
 * Inertia Vue View Templates for Gravito Fortify
 * 
 * These are stub files that can be copied to your project.
 * Install with: bun gravito fortify:install --stack=vue
 */

export const LoginPage = `
<script setup lang="ts">
import { useForm, Head, Link } from '@inertiajs/vue3'

defineProps<{
  status?: string
  canResetPassword?: boolean
}>()

const form = useForm({
  email: '',
  password: '',
  remember: false,
})

const submit = () => {
  form.post('/login', {
    onFinish: () => form.reset('password'),
  })
}
</script>

<template>
  <Head title="Login" />

  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
    <div class="w-full max-w-md p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
      <h1 class="text-2xl font-bold text-white mb-2">Welcome Back</h1>
      <p class="text-gray-400 mb-8">Sign in to your account</p>

      <div v-if="status" class="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-400 text-sm">
        {{ status }}
      </div>

      <form @submit.prevent="submit">
        <div class="mb-4">
          <label for="email" class="block text-sm text-gray-400 mb-2">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
            required
          />
          <p v-if="form.errors.email" class="mt-1 text-red-400 text-sm">{{ form.errors.email }}</p>
        </div>

        <div class="mb-4">
          <label for="password" class="block text-sm text-gray-400 mb-2">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
            required
          />
          <p v-if="form.errors.password" class="mt-1 text-red-400 text-sm">{{ form.errors.password }}</p>
        </div>

        <div class="flex items-center justify-between mb-6">
          <label class="flex items-center gap-2 text-gray-400">
            <input v-model="form.remember" type="checkbox" class="rounded border-white/20" />
            <span class="text-sm">Remember me</span>
          </label>

          <Link v-if="canResetPassword" href="/forgot-password" class="text-sm text-emerald-400 hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          :disabled="form.processing"
          class="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition disabled:opacity-50"
        >
          {{ form.processing ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="mt-6 text-center text-gray-400 text-sm">
        Don't have an account?
        <Link href="/register" class="text-emerald-400 hover:underline">Create one</Link>
      </p>
    </div>
  </div>
</template>
`

export const RegisterPage = `
<script setup lang="ts">
import { useForm, Head, Link } from '@inertiajs/vue3'

const form = useForm({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const submit = () => {
  form.post('/register', {
    onFinish: () => form.reset('password', 'password_confirmation'),
  })
}
</script>

<template>
  <Head title="Register" />

  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
    <div class="w-full max-w-md p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
      <h1 class="text-2xl font-bold text-white mb-2">Create Account</h1>
      <p class="text-gray-400 mb-8">Join the Gravito community</p>

      <form @submit.prevent="submit">
        <div class="mb-4">
          <label for="name" class="block text-sm text-gray-400 mb-2">Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            class="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
            required
          />
          <p v-if="form.errors.name" class="mt-1 text-red-400 text-sm">{{ form.errors.name }}</p>
        </div>

        <div class="mb-4">
          <label for="email" class="block text-sm text-gray-400 mb-2">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
            required
          />
          <p v-if="form.errors.email" class="mt-1 text-red-400 text-sm">{{ form.errors.email }}</p>
        </div>

        <div class="mb-4">
          <label for="password" class="block text-sm text-gray-400 mb-2">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
            required
          />
          <p v-if="form.errors.password" class="mt-1 text-red-400 text-sm">{{ form.errors.password }}</p>
        </div>

        <div class="mb-6">
          <label for="password_confirmation" class="block text-sm text-gray-400 mb-2">Confirm Password</label>
          <input
            id="password_confirmation"
            v-model="form.password_confirmation"
            type="password"
            class="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="form.processing"
          class="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition disabled:opacity-50"
        >
          {{ form.processing ? 'Creating...' : 'Create Account' }}
        </button>
      </form>

      <p class="mt-6 text-center text-gray-400 text-sm">
        Already have an account?
        <Link href="/login" class="text-emerald-400 hover:underline">Sign in</Link>
      </p>
    </div>
  </div>
</template>
`

export const ForgotPasswordPage = `
<script setup lang="ts">
import { useForm, Head, Link } from '@inertiajs/vue3'

defineProps<{
  status?: string
}>()

const form = useForm({
  email: '',
})

const submit = () => {
  form.post('/forgot-password')
}
</script>

<template>
  <Head title="Forgot Password" />

  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
    <div class="w-full max-w-md p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
      <h1 class="text-2xl font-bold text-white mb-2">Forgot Password</h1>
      <p class="text-gray-400 mb-8">Enter your email and we'll send you a reset link.</p>

      <div v-if="status" class="mb-4 p-3 bg-emerald-500/20 border border-emerald-500 rounded-lg text-emerald-400 text-sm">
        {{ status }}
      </div>

      <form @submit.prevent="submit">
        <div class="mb-6">
          <label for="email" class="block text-sm text-gray-400 mb-2">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
            required
          />
          <p v-if="form.errors.email" class="mt-1 text-red-400 text-sm">{{ form.errors.email }}</p>
        </div>

        <button
          type="submit"
          :disabled="form.processing"
          class="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition disabled:opacity-50"
        >
          {{ form.processing ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </form>

      <p class="mt-6 text-center">
        <Link href="/login" class="text-emerald-400 hover:underline text-sm">Back to login</Link>
      </p>
    </div>
  </div>
</template>
`
