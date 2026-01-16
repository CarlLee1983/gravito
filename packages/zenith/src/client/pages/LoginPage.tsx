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
        <div className="text-center mb-8 font-heading">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-primary rounded-3xl shadow-[0_0_40px_rgba(0,240,255,0.2)] mb-8"
          >
            <Activity size={48} className="text-black" />
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter mb-2 text-white italic uppercase">
            ZENITH
          </h1>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] ml-1">
            Quantum Control Plane
          </p>
        </div>

        {/* Login Card */}
        <div className="card-premium p-10 backdrop-blur-2xl bg-zinc-900/40 border-white/5">
          <div className="text-center mb-10">
            <h2 className="text-xl font-black text-white uppercase tracking-tight font-heading">
              Secure Access
            </h2>
            <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest opacity-60">
              Biometric or Password verification required
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 font-heading">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500"
              >
                <AlertCircle size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">{error}</span>
              </motion.div>
            )}

            {/* Password Field */}
            <div className="space-y-3">
              <label
                htmlFor="password"
                className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1"
              >
                System Authentication
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                  size={18}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access code..."
                  className={cn(
                    'w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-12 font-mono',
                    'text-sm font-bold placeholder:text-white/10 tracking-widest',
                    'focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40',
                    'transition-all'
                  )}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
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
                'w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.3em]',
                'bg-primary text-black font-heading shadow-[0_0_30px_rgba(0,240,255,0.2)] hover:shadow-[0_0_40px_rgba(0,240,255,0.4)]',
                'transition-all duration-500 hover:scale-[1.02] active:scale-95',
                'disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100',
                'flex items-center justify-center gap-3'
              )}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  Connect <ArrowRight size={18} />
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
