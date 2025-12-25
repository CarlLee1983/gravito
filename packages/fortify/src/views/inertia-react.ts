/**
 * Inertia React View Templates for Gravito Fortify
 * 
 * These are stub files that can be copied to your project.
 * Install with: bun gravito fortify:install --stack=react
 */

export const LoginPage = `
import { useForm, Head, Link } from '@inertiajs/react'
import { FormEvent } from 'react'

interface LoginProps {
  status?: string
  canResetPassword?: boolean
}

export default function Login({ status, canResetPassword = true }: LoginProps) {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    password: '',
    remember: false,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post('/login', {
      onFinish: () => reset('password'),
    })
  }

  return (
    <>
      <Head title="Login" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400 mb-8">Sign in to your account</p>

          {status && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-400 text-sm">
              {status}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                required
              />
              {errors.email && <p className="mt-1 text-red-400 text-sm">{errors.email}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm text-gray-400 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                required
              />
              {errors.password && <p className="mt-1 text-red-400 text-sm">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  checked={data.remember}
                  onChange={(e) => setData('remember', e.target.checked)}
                  className="rounded border-white/20"
                />
                <span className="text-sm">Remember me</span>
              </label>

              {canResetPassword && (
                <Link href="/forgot-password" className="text-sm text-emerald-400 hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition disabled:opacity-50"
            >
              {processing ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link href="/register" className="text-emerald-400 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
`

export const RegisterPage = `
import { useForm, Head, Link } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function Register() {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post('/register', {
      onFinish: () => reset('password', 'password_confirmation'),
    })
  }

  return (
    <>
      <Head title="Register" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400 mb-8">Join the Gravito community</p>

          <form onSubmit={submit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm text-gray-400 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                required
              />
              {errors.name && <p className="mt-1 text-red-400 text-sm">{errors.name}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                required
              />
              {errors.email && <p className="mt-1 text-red-400 text-sm">{errors.email}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm text-gray-400 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                required
              />
              {errors.password && <p className="mt-1 text-red-400 text-sm">{errors.password}</p>}
            </div>

            <div className="mb-6">
              <label htmlFor="password_confirmation" className="block text-sm text-gray-400 mb-2">
                Confirm Password
              </label>
              <input
                id="password_confirmation"
                type="password"
                value={data.password_confirmation}
                onChange={(e) => setData('password_confirmation', e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition disabled:opacity-50"
            >
              {processing ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
`

export const ForgotPasswordPage = `
import { useForm, Head, Link } from '@inertiajs/react'
import { FormEvent } from 'react'

interface ForgotPasswordProps {
  status?: string
}

export default function ForgotPassword({ status }: ForgotPasswordProps) {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post('/forgot-password')
  }

  return (
    <>
      <Head title="Forgot Password" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-2">Forgot Password</h1>
          <p className="text-gray-400 mb-8">
            Enter your email and we'll send you a reset link.
          </p>

          {status && (
            <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500 rounded-lg text-emerald-400 text-sm">
              {status}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                required
              />
              {errors.email && <p className="mt-1 text-red-400 text-sm">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition disabled:opacity-50"
            >
              {processing ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-6 text-center">
            <Link href="/login" className="text-emerald-400 hover:underline text-sm">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
`
