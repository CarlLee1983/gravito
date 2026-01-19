import { motion, useScroll, useTransform } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useRef } from 'react'
import { ConstellationCanvas } from './ConstellationCanvas'

export const PhotonHero = ({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()

  const y1 = useTransform(scrollY, [0, 500], [0, 200])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  const t = {
    en: {
      headline_1: 'The Absolute',
      headline_2: 'Engine.',
      tagline: 'A high-performance web kernel for Bun.',
      sub_tagline: 'Built for raw speed, zero-copy safety, and sub-millisecond dispatch.',
      build_target: 'Build_Target',
      protocol: 'Protocol',
      cluster_mode: 'Cluster_Mode',
      badge: 'System_Alpha_Initialize',
      status_dispatch: 'CORE_DISPATCH_ENABLED',
      status_aot: 'AOT_OPTIMIZATION_ACTIVE',
      status_mem: 'MEM_SAFETY_VERIFIED',
    },
    'zh-TW': {
      headline_1: 'The Absolute',
      headline_2: 'Engine.',
      tagline: '專為 Bun 打造的高性能 Web 核心。',
      sub_tagline: '專注於極速、零拷貝安全性及亞毫秒級調度。',
      build_target: '構建目標',
      protocol: '協定',
      cluster_mode: '叢集模式',
      badge: '系統核心初始化',
      status_dispatch: '核心調度已啟用',
      status_aot: 'AOT_優化中',
      status_mem: '記憶體安全性已驗證',
    },
  }[lang]

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background Decorative Elements - Theme Aware */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <ConstellationCanvas />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-photon-gold/[0.03] rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-photon-gold/[0.02] rounded-full blur-[100px] mix-blend-screen animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-12 text-center">
        <motion.div style={{ y: y1, opacity }} className="space-y-8">
          {/* HUD Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-4 px-6 py-2 border border-photon-gold/20 bg-photon-gold/5 backdrop-blur-sm mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-photon-gold animate-pulse" />
            <span className="text-[10px] font-technical tracking-[0.5em] text-photon-gold uppercase">
              {t.badge} {/* v1.2.0 */}
            </span>
          </motion.div>

          {/* Main Headline */}
          <div className="relative">
            <motion.h1
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-8xl md:text-[12rem] font-black text-[var(--text-primary)] tracking-[-0.06em] leading-[0.85] uppercase transition-colors"
            >
              {t.headline_1} <br />
              <span className="text-photon-gold italic font-light opacity-90">{t.headline_2}</span>
            </motion.h1>

            {/* Sub-label HUD */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              transition={{ delay: 1 }}
              className="absolute -right-20 top-0 hidden lg:block"
            >
              <div className="text-right space-y-2">
                <div className="text-[8px] font-mono text-[var(--text-primary)]">
                  {t.status_dispatch}
                </div>
                <div className="text-[8px] font-mono text-[var(--text-primary)]">
                  {t.status_aot}
                </div>
                <div className="text-[8px] font-mono text-[var(--text-primary)]">
                  {t.status_mem}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="max-w-2xl mx-auto text-xl md:text-2xl text-[var(--text-secondary)] font-light leading-relaxed tracking-tight transition-colors"
          >
            {t.tagline}
            {t.sub_tagline}
          </motion.p>

          {/* Technical HUD Labels - REPOSITIONED BOTTOM */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="pt-16 flex flex-wrap justify-center gap-x-16 gap-y-8"
          >
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-technical text-zinc-600 tracking-[0.4em] uppercase mb-2">
                {t.build_target}
              </span>
              <span className="text-xs font-black text-[var(--text-primary)] tracking-widest uppercase transition-colors">
                Native_M3_ARM
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-technical text-zinc-600 tracking-[0.4em] uppercase mb-2">
                {t.protocol}
              </span>
              <span className="text-xs font-black text-[var(--text-primary)] tracking-widest uppercase transition-colors">
                HTTP_3_QUIC
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-technical text-zinc-600 tracking-[0.4em] uppercase mb-2">
                {t.cluster_mode}
              </span>
              <span className="text-xs font-black text-[var(--text-primary)] tracking-widest uppercase transition-colors">
                Balanced_AOT
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative HUD Elements */}
      <div className="absolute bottom-20 left-20 hidden xl:block opacity-10 pointer-events-none">
        <div className="flex items-center gap-6">
          <Zap className="text-photon-gold" size={40} strokeWidth={0.5} />
          <div className="space-y-1">
            <div className="w-32 h-1 bg-[var(--text-primary)]" />
            <div className="w-16 h-1 bg-photon-gold" />
          </div>
        </div>
      </div>
    </div>
  )
}
