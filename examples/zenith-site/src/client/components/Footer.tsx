import { LayoutDashboard } from 'lucide-react'
import { useTrans } from '../hooks/useTrans'
import { StaticLink } from './StaticLink'

export function Footer() {
  const { trans, locale } = useTrans()

  return (
    <footer className="border-t border-white/5 py-16 bg-zenith-void relative overflow-hidden">
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-zenith-500/10 rounded-full blur-[100px] translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-zenith-500/20 to-zenith-stellar/20 flex items-center justify-center border border-white/10">
              <LayoutDashboard className="w-6 h-6 text-zenith-accent" />
            </div>
            <div>
              <span className="font-bold text-white block tracking-widest text-lg">ZENITH</span>
              <span className="text-xs uppercase tracking-tighter opacity-50">Control Plane</span>
            </div>
          </div>
          <div className="flex gap-8 text-gray-400 text-sm font-medium">
            <StaticLink
              href={locale === 'zh-TW' ? '/zh-TW/privacy' : '/privacy'}
              className="hover:text-zenith-accent transition-colors"
            >
              {trans('footer.privacy')}
            </StaticLink>
            <StaticLink
              href={locale === 'zh-TW' ? '/zh-TW/terms' : '/terms'}
              className="hover:text-zenith-accent transition-colors"
            >
              {trans('footer.terms')}
            </StaticLink>
            <StaticLink
              href={locale === 'zh-TW' ? '/zh-TW/contact' : '/contact'}
              className="hover:text-zenith-accent transition-colors"
            >
              {trans('footer.contact')}
            </StaticLink>
          </div>
          <div className="text-gray-500 text-xs font-mono">{trans('footer.copyright')}</div>
        </div>
      </div>
    </footer>
  )
}
