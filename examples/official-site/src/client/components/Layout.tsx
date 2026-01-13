import { usePage } from '@inertiajs/react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Book, Github, Home as HomeIcon, Info, Menu, Rocket, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTrans } from '../hooks/useTrans'
import Logo from './Logo'
import { MagneticCursor } from './MagneticCursor'
import { getBasePath, StaticLink } from './StaticLink'

interface LayoutProps {
  children: React.ReactNode
  noPadding?: boolean
}

interface PageProps {
  [key: string]: unknown
  locale?: string
}

export default function Layout({ children, noPadding = false }: LayoutProps) {
  const { trans } = useTrans()
  const { props, url } = usePage<PageProps>()
  const { locale } = props
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const currentLang = locale || 'en'

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getLocalizedPath = (path: string) => {
    const prefix = currentLang === 'zh' ? '/zh' : '/en'
    if (path === '/') {
      return prefix
    }
    if (path.startsWith('/')) {
      return `${prefix}${path}`
    }
    return `${prefix}/${path}`
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
    let path = window.location.pathname
    const basePath = getBasePath()

    if (basePath && path.startsWith(basePath)) {
      path = path.slice(basePath.length)
    }

    if (path.startsWith('/en/') || path === '/en') {
      path = path.replace(/^\/en/, '') || '/'
    } else if (path.startsWith('/zh/') || path === '/zh') {
      path = path.replace(/^\/zh/, '') || '/'
    }

    if (newLang === 'zh') {
      return path === '/' ? '/zh' : `/zh${path}`
    }
    if (newLang === 'en') {
      return path === '/' ? '/en' : `/en${path}`
    }
    return path
  }

  return (
    <div className="min-h-screen bg-void text-white font-sans selection:bg-singularity/30 relative flex flex-col cursor-none-if-needed">
      {/* Custom Cursor */}
      <MagneticCursor />

      {/* Background Decor */}
      <div className="fixed inset-0 bg-hex-grid opacity-10 pointer-events-none z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-singularity/5 rounded-full blur-[200px] pointer-events-none z-0" />

      {/* Floating Navbar (Dynamic Island Style) */}
      <header
        className={`fixed left-1/2 -translate-x-1/2 z-50 w-full px-4 transition-all duration-500 ease-out ${
          isScrolled ? 'top-4 max-w-4xl' : 'top-6 max-w-6xl'
        }`}
      >
        <div className="relative flex items-center justify-between p-2 pl-6 pr-2 rounded-full border border-white/10 bg-void/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-500">
          <Logo isZh={currentLang === 'zh'} />

          <nav className="hidden md:flex items-center gap-1 mx-4">
            {[
              { label: trans('nav.features', 'Features'), path: '/features' },
              { label: trans('nav.docs', 'Docs'), path: '/docs' },
              { label: trans('nav.releases', 'Releases'), path: '/releases' },
              { label: trans('nav.about', 'About'), path: '/about' },
            ].map((item) => {
              const active = isPathActive(item.path)
              return (
                <StaticLink
                  key={item.path}
                  href={getLocalizedPath(item.path)}
                  className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:text-white ${
                    active ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white/10 rounded-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </StaticLink>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/gravito-framework/gravito"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Github size={20} />
            </a>

            <div className="flex items-center p-1 bg-white/5 rounded-full border border-white/5 relative overflow-hidden">
              <StaticLink
                href={switchLocale('en')}
                className={`relative z-10 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-colors duration-500 ${
                  currentLang === 'en' ? 'text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {currentLang === 'en' && (
                  <motion.div
                    layoutId="lang-active"
                    className="absolute inset-0 bg-white rounded-full shadow-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">EN</span>
              </StaticLink>
              <StaticLink
                href={switchLocale('zh')}
                className={`relative z-10 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-colors duration-500 ${
                  currentLang === 'zh' ? 'text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {currentLang === 'zh' && (
                  <motion.div
                    layoutId="lang-active"
                    className="absolute inset-0 bg-white rounded-full shadow-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">繁中</span>
              </StaticLink>
            </div>

            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <motion.div
                animate={isMobileMenuOpen ? 'open' : 'closed'}
                variants={{
                  open: { rotate: 90 },
                  closed: { rotate: 0 },
                }}
              >
                {isMobileMenuOpen ? (
                  <ArrowUpRight size={20} className="rotate-45" />
                ) : (
                  <Menu size={20} />
                )}
              </motion.div>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3, ease: 'backOut' }}
              className="absolute top-full left-0 right-0 mt-4 p-4 mx-4 rounded-3xl bg-[#0A0A0B]/95 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                {[
                  { label: trans('footer.home', 'Home'), path: '/', icon: HomeIcon },
                  { label: trans('nav.docs', 'Docs'), path: '/docs', icon: Book },
                  { label: trans('nav.features', 'Features'), path: '/features', icon: Zap },
                  { label: trans('nav.releases', 'Releases'), path: '/releases', icon: Rocket },
                ].map((item) => (
                  <StaticLink
                    key={item.path}
                    href={getLocalizedPath(item.path)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      isPathActive(item.path)
                        ? 'bg-singularity/10 text-singularity'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-bold">{item.label}</span>
                  </StaticLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className={`flex-1 relative z-10 ${noPadding ? 'pt-0' : 'pt-32'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={url}
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-void/80 backdrop-blur-md py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                <div className="w-3 h-3 rounded-full bg-void shadow-inner" />
              </div>
              <span className="text-white font-black text-xl tracking-tight">Gravito</span>
            </div>
            <p className="text-gray-400 max-w-sm leading-relaxed">
              {trans('footer.desc', 'The High-Performance Framework for Builders.')}
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 italic">
              {trans('footer.ecosystem', 'Ecosystem')}
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://lux.gravito.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 p-3 -mx-3 rounded-2xl transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/5"
                >
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center overflow-hidden border border-white/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <div className="w-1/2 h-1/2 rounded-full bg-void shadow-inner flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                      {trans('footer.lux', 'Luminosity')}
                    </span>
                    <span className="text-[10px] text-gray-600 group-hover:text-gray-500 font-mono uppercase tracking-widest mt-0.5">
                      Atomic Sitemap Engine
                    </span>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="https://atlas.gravito.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 p-3 -mx-3 rounded-2xl transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/5"
                >
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-400 flex items-center justify-center overflow-hidden border border-white/20 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <div className="w-1/2 h-1/2 rounded-full bg-void shadow-inner flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                      {trans('footer.atlas', 'Atlas')}
                    </span>
                    <span className="text-[10px] text-gray-600 group-hover:text-gray-500 font-mono uppercase tracking-widest mt-0.5">
                      High-Performance ORM
                    </span>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="https://zenith.gravito.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 p-3 -mx-3 rounded-2xl transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/5"
                >
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-400 flex items-center justify-center overflow-hidden border border-white/20 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <div className="w-1/2 h-1/2 rounded-full bg-void shadow-inner flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                      {trans('footer.zenith', 'Zenith')}
                    </span>
                    <span className="text-[10px] text-gray-600 group-hover:text-gray-500 font-mono uppercase tracking-widest mt-0.5">
                      Zero-Config Control Plane
                    </span>
                  </div>
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 italic">{trans('footer.legal', 'Legal')}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li>
                <StaticLink
                  href={getLocalizedPath('/privacy')}
                  className="hover:text-singularity transition-colors"
                >
                  {trans('footer.privacy', 'Privacy')}
                </StaticLink>
              </li>
              <li>
                <StaticLink
                  href={getLocalizedPath('/terms')}
                  className="hover:text-singularity transition-colors"
                >
                  {trans('footer.terms', 'Terms')}
                </StaticLink>
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
