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
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-photon-gold rounded-full blur-[160px] animate-pulse"
          style={{ mixBlendMode: 'var(--glow-blend)' as any, opacity: 'var(--hero-gradient-opacity)' as any }}
        />
        <div
          className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-photon-gold rounded-full blur-[120px]"
          style={{ mixBlendMode: 'var(--glow-blend)' as any, opacity: 'calc(var(--hero-gradient-opacity) * 0.6)' as any }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-bg-primary via-transparent to-transparent z-10" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 text-center">
        <motion.div style={{ y: y1, opacity }} className="space-y-8 md:space-y-12">
          {/* HUD Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-4 px-6 md:px-8 py-2 md:py-3 border border-photon-gold/20 bg-photon-gold/5 backdrop-blur-xl mb-8 md:mb-12 rounded-full shadow-[0_0_20px_rgba(255,184,0,0.1)] group hover:border-photon-gold/40 transition-colors"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-photon-gold animate-pulse shadow-[0_0_10px_rgba(255,184,0,1)]" />
            <span className="text-[10px] md:text-[11px] font-technical tracking-[0.4em] md:tracking-[0.6em] text-photon-gold uppercase font-black">
              {t.badge} {/* v1.2.0 */}
            </span>
          </motion.div>

          {/* Main Headline */}
          <div className="relative">
            <motion.h1
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-7xl md:text-9xl lg:text-[12rem] xl:text-[14rem] font-black text-p-txt tracking-[-0.08em] leading-[0.9] md:leading-[0.8] uppercase transition-colors"
            >
              {t.headline_1} <br />
              <span className="text-photon-gold italic font-light opacity-90 relative">
                {t.headline_2}
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1, delay: 1 }}
                  className="absolute bottom-2 md:bottom-4 left-0 h-4 bg-photon-gold/10 -z-10 blur-xl"
                />
              </span>
            </motion.h1>

            {/* Sub-label HUD */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 0.3, x: 0 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="absolute -right-32 top-0 hidden xl:block"
            >
              <div className="text-right space-y-3 font-technical">
                <div className="text-[9px] uppercase tracking-widest text-p-txt border-r-2 border-photon-gold pr-4">
                  {t.status_dispatch}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-p-txt border-r-2 border-photon-gold/40 pr-4">
                  {t.status_aot}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-p-txt border-r-2 border-photon-gold/20 pr-4">
                  {t.status_mem}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="max-w-3xl mx-auto space-y-4 md:space-y-6"
          >
            <p className="text-xl sm:text-2xl md:text-3xl text-s-txt font-light leading-relaxed tracking-tight transition-colors">
              {t.tagline}
            </p>
            <p className="text-xs md:text-base text-m-txt font-technical tracking-[0.1em] md:tracking-[0.2em] uppercase opacity-60">
              {t.sub_tagline}
            </p>
          </motion.div>

          {/* Technical HUD Labels - REPOSITIONED BOTTOM */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="pt-16 md:pt-24 flex flex-wrap justify-center gap-x-8 sm:gap-x-16 md:gap-x-24 gap-y-8 md:gap-y-12"
          >
            {[
              { label: t.build_target, value: 'Native_M3_ARM' },
              { label: t.protocol, value: 'HTTP_3_QUIC' },
              { label: t.cluster_mode, value: 'Balanced_AOT' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center group">
                <span className="text-[8px] md:text-[9px] font-technical text-m-txt tracking-[0.3em] md:tracking-[0.5em] uppercase mb-2 md:mb-3 group-hover:text-photon-gold transition-colors">
                  {item.label}
                </span>
                <span className="text-xs md:text-sm font-black text-p-txt tracking-[0.1em] md:tracking-[0.2em] uppercase transition-all group-hover:tracking-[0.3em]">
                  {item.value}
                </span>
                <div className="w-0 h-px bg-photon-gold/40 mt-2 group-hover:w-full transition-all duration-500" />
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative HUD Elements */}
      <div className="absolute bottom-20 left-20 hidden xl:block opacity-20 pointer-events-none">
        <div className="flex items-center gap-8">
          <div className="relative">
            <Zap className="text-photon-gold animate-pulse" size={48} strokeWidth={0.5} />
            <div className="absolute inset-0 bg-photon-gold blur-xl opacity-20 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="w-48 h-1 bg-p-txt/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-1/2 h-full bg-photon-gold shadow-[0_0_10px_rgba(255,184,0,1)]"
              />
            </div>
            <div className="w-24 h-1 bg-photon-gold/40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
