import { motion } from 'framer-motion'
import { Activity, AlertCircle, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../utils'

export function LoginPage() {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(password)

    if (!result.success) {
      setError(result.error || 'Authentication failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-indigo-600 rounded-3xl shadow-2xl shadow-primary/30 mb-6"
          >
            <Activity size={40} className="text-primary-foreground" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">GRAVITO</h1>
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">
            Flux Console
          </p>
        </div>

        {/* Login Card */}
        <div className="card-premium p-8 backdrop-blur-xl">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold mb-2">Welcome Back</h2>
            <p className="text-sm text-muted-foreground">
              Enter your password to access the console
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500"
              >
                <AlertCircle size={18} />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-bold text-muted-foreground uppercase tracking-widest"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter console password"
                  className={cn(
                    'w-full bg-muted/40 border border-border/50 rounded-xl py-4 pl-12 pr-12',
                    'text-sm font-medium placeholder:text-muted-foreground/40',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
                    'transition-all'
                  )}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest',
                'bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground',
                'shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40',
                'transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Access Console
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-muted-foreground/50">
          Protected by Gravito Security Layer
        </p>
      </motion.div>
    </div>
  )
}
