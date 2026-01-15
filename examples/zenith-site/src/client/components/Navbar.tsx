import { usePage } from '@inertiajs/react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { Github, Globe, LayoutDashboard, Menu, X } from 'lucide-react'
import React from 'react'
import { useTrans } from '../hooks/useTrans'
import { StaticLink } from './StaticLink'

export function Navbar() {
  const { trans, locale } = useTrans()
  const { url } = usePage()
  const { version } = usePage().props as { version?: string }
  const { scrollY } = useScroll()
  const [isOpen, setIsOpen] = React.useState(false)

  const navWidth = useTransform(scrollY, [0, 100], ['100%', '90%'])
  const navTop = useTransform(scrollY, [0, 100], [0, 20])
  const navBg = useTransform(scrollY, [0, 100], ['rgba(0, 0, 0, 0.6)', 'rgba(9, 9, 11, 0.8)'])
  const navBorder = useTransform(
    scrollY,
    [0, 100],
    ['rgba(255, 255, 255, 0.05)', 'rgba(0, 251, 255, 0.2)']
  )

  const links = [
    { label: trans('nav.features'), path: '/features' },
    { label: trans('nav.integration'), path: '/integrations' },
    { label: trans('nav.about'), path: '/about' },
  ]

  const getLink = (path: string) => {
    return locale === 'zh-TW' ? `/zh-TW${path}` : path
  }

  return (
    <>
      <motion.nav
        style={{
          width: navWidth,
          top: navTop,
          backgroundColor: navBg,
          borderColor: navBorder,
        }}
        className="fixed left-1/2 -translate-x-1/2 z-[100] border-b backdrop-blur-2xl rounded-none md:rounded-2xl transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <StaticLink
                href={locale === 'zh-TW' ? '/zh-TW' : '/'}
                className="flex items-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zenith-500 to-zenith-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,251,255,0.3)]">
                  <LayoutDashboard className="w-5 h-5 text-black" />
                </div>
                <span className="text-xl font-black tracking-tighter font-heading uppercase italic">
                  ZENITH
                </span>
              </StaticLink>
            </div>
            <div className="hidden md:flex items-center gap-8 text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500 font-body">
              {links.map((link) => (
                <StaticLink
                  key={link.path}
                  href={getLink(link.path)}
                  className={`transition-colors py-1 ${url.includes(link.path) ? 'text-zenith-accent border-b-2 border-zenith-accent' : 'hover:text-white'}`}
                >
                  {link.label}
                </StaticLink>
              ))}
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative group">
                <button
                  type="button"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 text-zinc-400 hover:text-white"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">
                    {locale === 'zh-TW' ? '繁中' : 'EN'}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-32 bg-zenith-abyss border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden backdrop-blur-xl">
                  <StaticLink
                    href={locale === 'zh-TW' ? '/' : '/zh-TW'}
                    className="block px-4 py-3 text-[10px] font-black uppercase hover:bg-zenith-accent/20 transition-colors text-left font-body"
                  >
                    {locale === 'zh-TW' ? 'English' : '繁體中文'}
                  </StaticLink>
                  <StaticLink
                    href={locale === 'zh-TW' ? '/about' : '/zh-TW/about'}
                    className="block px-4 py-3 text-[10px] font-black uppercase hover:bg-zenith-accent/20 transition-colors text-left border-t border-white/5 font-body"
                  >
                    {locale === 'zh-TW' ? 'About (EN)' : '關於 (繁中)'}
                  </StaticLink>
                </div>
              </div>
              <a
                href="https://github.com/gravito-framework/gravito"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <Github className="w-4 h-4" />
              </a>
              <div className="hidden lg:block px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-[9px] text-zenith-accent">
                v{version || '1.0.0'}
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 text-zinc-400 hover:text-white"
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-2xl md:hidden pt-24 px-6 flex flex-col items-center gap-8"
          >
            {links.map((link) => (
              <StaticLink
                key={link.path}
                href={getLink(link.path)}
                onClick={() => setIsOpen(false)}
                className="text-2xl font-black font-heading uppercase italic tracking-widest text-zinc-400 hover:text-zenith-accent transition-colors"
              >
                {link.label}
              </StaticLink>
            ))}
            <div className="w-full h-px bg-white/10 my-4" />
            <a
              href="https://github.com/gravito-framework/gravito"
              className="flex items-center gap-3 text-zinc-400 font-bold font-body"
            >
              <Github size={24} /> GitHub Repository
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
