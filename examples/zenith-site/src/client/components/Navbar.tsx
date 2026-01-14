import { usePage } from '@inertiajs/react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Github, Globe, LayoutDashboard } from 'lucide-react'
import React from 'react'
import { useTrans } from '../hooks/useTrans'
import { StaticLink } from './StaticLink'

export function Navbar() {
  const { trans, locale } = useTrans()
  const { version } = usePage().props as { version?: string }
  const { scrollY } = useScroll()

  const navWidth = useTransform(scrollY, [0, 100], ['100%', '90%'])
  const navTop = useTransform(scrollY, [0, 100], [0, 20])
  const navBg = useTransform(scrollY, [0, 100], ['rgba(5, 7, 10, 0.6)', 'rgba(10, 10, 20, 0.8)'])
  const navBorder = useTransform(
    scrollY,
    [0, 100],
    ['rgba(255, 255, 255, 0.05)', 'rgba(0, 240, 255, 0.2)']
  )

  return (
    <motion.nav
      style={{
        width: navWidth,
        top: navTop,
        backgroundColor: navBg,
        borderColor: navBorder,
      }}
      className="fixed left-1/2 -translate-x-1/2 z-50 border-b backdrop-blur-2xl rounded-none md:rounded-2xl transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <StaticLink
              href={locale === 'zh-TW' ? '/zh-TW' : '/'}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zenith-500 to-zenith-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter">ZENITH</span>
            </StaticLink>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black tracking-[0.2em] uppercase text-gray-400">
            <StaticLink
              href={locale === 'zh-TW' ? '/zh-TW/features' : '/features'}
              className={`transition-colors py-1 ${usePage().url.includes('features') ? 'text-zenith-accent border-b-2 border-zenith-accent' : 'hover:text-white'}`}
            >
              {trans('nav.features')}
            </StaticLink>
            <StaticLink
              href={locale === 'zh-TW' ? '/zh-TW/integrations' : '/integrations'}
              className={`transition-colors py-1 ${usePage().url.includes('integrations') ? 'text-zenith-accent border-b-2 border-zenith-accent' : 'hover:text-white'}`}
            >
              {trans('nav.integration')}
            </StaticLink>
            <StaticLink
              href={locale === 'zh-TW' ? '/zh-TW/about' : '/about'}
              className={`transition-colors py-1 ${usePage().url.includes('about') ? 'text-zenith-accent border-b-2 border-zenith-accent' : 'hover:text-white'}`}
            >
              {trans('nav.about')}
            </StaticLink>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button
                type="button"
                className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 text-gray-400 hover:text-white"
              >
                <Globe className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase">
                  {locale === 'zh-TW' ? '繁中' : 'EN'}
                </span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-32 bg-zenith-abyss border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden backdrop-blur-xl">
                <StaticLink
                  href={locale === 'zh-TW' ? '/' : '/zh-TW'}
                  className="block px-4 py-3 text-[10px] font-black uppercase hover:bg-zenith-accent/20 transition-colors text-left"
                >
                  {locale === 'zh-TW' ? 'English' : '繁體中文'}
                </StaticLink>
                <StaticLink
                  href={locale === 'zh-TW' ? '/about' : '/zh-TW/about'}
                  className="block px-4 py-3 text-[10px] font-black uppercase hover:bg-zenith-accent/20 transition-colors text-left border-t border-white/5"
                >
                  {locale === 'zh-TW' ? 'About (EN)' : '關於 (繁中)'}
                </StaticLink>
              </div>
            </div>
            <a
              href="https://github.com/gravito-framework/gravito"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <Github className="w-4 h-4" />
            </a>
            <div className="hidden md:block px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-[9px] text-zenith-accent">
              v{version || '1.0.0'}
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
