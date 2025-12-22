import { usePage } from '@inertiajs/react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Book, Cpu, Github, Home as HomeIcon, Info, Menu, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTrans } from '../hooks/useTrans'
import Logo from './Logo'
import { StaticLink } from './StaticLink'

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
  const { locale } = usePage<PageProps>().props
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

    // First, strip any existing locale prefix (/en or /zh)
    if (path.startsWith('/en/') || path.startsWith('/en')) {
      path = path.replace(/^\/en/, '') || '/'
    } else if (path.startsWith('/zh/') || path.startsWith('/zh')) {
      path = path.replace(/^\/zh/, '') || '/'
    }

    // Now add the new locale prefix
    if (newLang === 'zh') {
      return path === '/' ? '/zh/' : `/zh${path}`
    }
    if (newLang === 'en') {
      return path === '/' ? '/en/' : `/en${path}`
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
                <StaticLink
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
                </StaticLink>
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
              <StaticLink
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
              </StaticLink>
              <StaticLink
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
              </StaticLink>
            </div>

            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden p-3 bg-white/5 rounded-xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all z-50 relative"
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

        {/* Mobile Menu Overlay (Command Center Style) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: '100vh' }}
              exit={{ opacity: 0, height: 0, transition: { delay: 0.3 } }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden fixed inset-0 z-40 bg-[#0A0A0B] flex flex-col overflow-hidden"
            >
              {/* Background HUD Elements */}
              <div className="absolute inset-0 bg-hex-grid opacity-[0.08] pointer-events-none" />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-singularity/10 rounded-full blur-[120px] pointer-events-none"
              />

              <div className="flex flex-col h-full pt-28 px-6 pb-8 relative z-10 overflow-y-auto">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="flex flex-col gap-8 flex-1"
                  variants={{
                    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
                    hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
                  }}
                >
                  {/* Section: Main Navigation */}
                  <div className="space-y-4">
                    <motion.h3
                      variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
                      className="text-xs font-mono text-gray-500 uppercase tracking-widest pl-1"
                    >
                      Navigation {'//'}
                    </motion.h3>
                    {[
                      {
                        label: trans('footer.home', 'Home'),
                        sub: 'Dashboard & Overview',
                        path: '/',
                        icon: HomeIcon,
                      },
                      {
                        label: trans('nav.docs', 'Docs'),
                        sub: 'Knowledge Base',
                        path: '/docs',
                        icon: Book,
                      },
                      {
                        label: trans('nav.about', 'About'),
                        sub: 'Mission & Vision',
                        path: '/about',
                        icon: Info,
                      },
                    ].map((item, _idx) => (
                      <motion.div
                        key={item.path}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 },
                        }}
                      >
                        <StaticLink
                          href={getLocalizedPath(item.path)}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${
                            isPathActive(item.path)
                              ? 'bg-white/10 border-white/20'
                              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                          }`}
                        >
                          <div
                            className={`p-3 rounded-xl ${isPathActive(item.path) ? 'bg-singularity text-black' : 'bg-black/40 text-gray-400 group-hover:text-white group-hover:bg-black/60'} transition-colors`}
                          >
                            <item.icon size={24} />
                          </div>
                          <div>
                            <div
                              className={`text-xl font-bold tracking-tight ${isPathActive(item.path) ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}
                            >
                              {item.label}
                            </div>
                            <div className="text-xs font-mono text-gray-500 group-hover:text-gray-400">
                              {item.sub}
                            </div>
                          </div>
                          <ArrowUpRight
                            className={`ml-auto text-gray-600 group-hover:text-white transition-colors ${isPathActive(item.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            size={16}
                          />
                        </StaticLink>
                      </motion.div>
                    ))}
                  </div>

                  {/* Section: System Status */}
                  <motion.div
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                    className="mt-4 p-5 rounded-2xl bg-black/40 border border-white/5"
                  >
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Cpu size={12} /> System Status
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-bold text-gray-300">Orbit Kernel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-sm font-bold text-gray-300">Inertia Bridge</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span className="text-sm font-bold text-gray-300">Bun Runtime</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span className="text-sm font-bold text-gray-300">Hono Edge</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Section: Community */}
                  <div className="mt-auto pt-6 border-t border-white/10">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
                      Community Link {'//'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <motion.a
                        href="https://github.com/gravito-framework/gravito"
                        target="_blank"
                        rel="noreferrer"
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-singularity/30 transition-all text-gray-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Github size={20} />
                        <span className="text-xs font-bold">GitHub</span>
                      </motion.a>
                      <motion.div
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed text-gray-500"
                      >
                        <Zap size={20} />
                        <span className="text-xs font-bold">Discord</span>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
