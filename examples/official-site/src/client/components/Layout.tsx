import { Link, usePage } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Github, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTrans } from '../hooks/useTrans'
import Logo from './Logo'

interface LayoutProps {
  children: React.ReactNode
  noPadding?: boolean
}

interface PageProps {
  locale?: string
}

export default function Layout({ children, noPadding = false }: LayoutProps) {
  const { trans } = useTrans()
  const { locale } = usePage<PageProps>().props
  const [isScrolled, setIsScrolled] = useState(false)

  const currentLang = locale || 'en'

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getLocalizedPath = (path: string) => {
    if (currentLang === 'zh') {
      if (path === '/') {
        return '/zh'
      }
      if (path.startsWith('/')) {
        return `/zh${path}`
      }
      return `/zh/${path}`
    }
    return path
  }

  const isPathActive = (path: string) => {
    const currentPath = window.location.pathname
    const localizedPath = getLocalizedPath(path)
    if (path === '/' && (currentPath === '/' || currentPath === '/zh')) {
      return true
    }
    return currentPath.startsWith(localizedPath)
  }

  const switchLocale = (newLang: string) => {
    const path = window.location.pathname
    if (newLang === 'zh') {
      if (path.startsWith('/zh')) {
        return path
      }
      if (path === '/') {
        return '/zh/'
      }
      return `/zh${path}`
    }
    if (newLang === 'en') {
      if (!path.startsWith('/zh')) {
        return path
      }
      const newPath = path.replace(/^\/zh/, '')
      return newPath || '/'
    }
    return path
  }

  return (
    <div className="min-h-screen bg-void text-white font-sans selection:bg-singularity/30 relative flex flex-col">
      {/* Background Decor */}
      <div className="fixed inset-0 bg-hex-grid opacity-10 pointer-events-none z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-singularity/5 rounded-full blur-[200px] pointer-events-none z-0" />

      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-6 transition-all duration-700 ${isScrolled ? 'py-4' : 'py-8'}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          {/* Navbar Background Capsule */}
          <div
            className={`absolute inset-y-[-8px] inset-x-[-20px] rounded-[32px] transition-all duration-700 -z-10 ${
              isScrolled
                ? 'bg-void/60 backdrop-blur-2xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] opacity-100 scale-100'
                : 'bg-transparent opacity-0 scale-95'
            }`}
          />

          <Logo isZh={currentLang === 'zh'} />

          <nav className="hidden md:flex items-center gap-2 p-1.5 backdrop-blur-md bg-white/5 rounded-2xl border border-white/5 relative z-10">
            {[
              { label: trans('nav.docs', 'Docs'), path: '/docs' },
              { label: trans('nav.about', 'About'), path: '/about' },
            ].map((item) => {
              const active = isPathActive(item.path)
              return (
                <Link
                  key={item.path}
                  href={getLocalizedPath(item.path)}
                  className={`relative px-6 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all duration-300 group ${
                    active ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                  {!active && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-singularity/50 transition-all duration-300 group-hover:w-1/3" />
                  )}
                </Link>
              )
            })}

            <div className="w-[1px] h-6 bg-white/5 mx-2" />

            <a
              href="https://github.com/gravito-framework/gravito"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2 group/git"
            >
              <Github size={16} className="group-hover/git:rotate-12 transition-transform" />
              <span>GitHub</span>
              <ArrowUpRight
                size={12}
                className="opacity-0 group-hover/git:opacity-50 -translate-y-1 transition-all"
              />
            </a>
          </nav>

          <div className="flex items-center gap-4 relative z-10">
            <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/5 backdrop-blur-md relative overflow-hidden">
              <Link
                href={switchLocale('en')}
                className={`relative z-10 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-colors duration-500 ${
                  currentLang === 'en' ? 'text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {currentLang === 'en' && (
                  <motion.div
                    layoutId="lang-active"
                    className="absolute inset-0 bg-white rounded-lg shadow-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">EN</span>
              </Link>
              <Link
                href={switchLocale('zh')}
                className={`relative z-10 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-colors duration-500 ${
                  currentLang === 'zh' ? 'text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {currentLang === 'zh' && (
                  <motion.div
                    layoutId="lang-active"
                    className="absolute inset-0 bg-white rounded-lg shadow-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">繁中</span>
              </Link>
            </div>

            <button
              type="button"
              className="md:hidden p-3 bg-white/5 rounded-xl border border-white/5 text-gray-400"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 relative z-10 ${noPadding ? 'pt-0' : 'pt-32'}`}>{children}</main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-void/80 backdrop-blur-md py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600" />
              <span className="text-white font-black text-xl tracking-tight">Gravito</span>
            </div>
            <p className="text-gray-400 max-w-sm leading-relaxed">
              {trans('footer.desc', 'The High-Performance Framework for Artisans.')}
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 italic">{trans('footer.links', 'Links')}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li>
                <a
                  href={getLocalizedPath('/')}
                  className="hover:text-singularity transition-colors"
                >
                  {trans('footer.home', 'Home')}
                </a>
              </li>
              <li>
                <a
                  href={getLocalizedPath('/docs')}
                  className="hover:text-singularity transition-colors"
                >
                  {trans('nav.docs', 'Docs')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 italic">
              {trans('footer.connect', 'Connect')}
            </h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li>
                <a
                  href="https://github.com/gravito-framework/gravito"
                  className="hover:text-singularity transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <span className="hover:text-singularity transition-colors cursor-not-allowed opacity-50">
                  Discord (Coming)
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-xs font-mono text-gray-500 tracking-widest uppercase">
          &copy; {new Date().getFullYear()} {trans('footer.copyright', 'Gravito Framework')}
        </div>
      </footer>
    </div>
  )
}
