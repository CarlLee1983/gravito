import { Head } from '@inertiajs/react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Box,
  Check,
  Code,
  Database,
  FileText,
  Github,
  Layout as LayoutIcon,
  type LucideIcon,
  Rocket,
  Server,
  Shield,
  Zap,
} from 'lucide-react'
import React, { useRef, useState } from 'react'
import Layout from '../components/Layout'
import { StaticLink } from '../components/StaticLink'

// Dynamic Import for WebGL component to avoid SSG/Hydration issues
const HeroGL = React.lazy(() =>
  import('../components/HeroGL').then((mod) => ({ default: mod.HeroGL }))
)

type Translation = Record<string, Record<string, string>>

// 強化版 Hero 組件（Star Shuttle Effect via WebGL）
const AdvancedHero = ({ t, locale }: { t: Translation; locale: string }) => {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 300], [1, 0])
  const heroRef = useRef<HTMLDivElement>(null)

  const _titleCharItems = (t.hero.title || 'GRAVITO').split('').map((char, index) => ({
    id: `hero-char-${index}-${char}`,
    index,
    char,
  }))

  // 避免 SSG/Hydration 不匹配，只在客戶端渲染 WebGL
  const [isClient, setIsClient] = useState(false)
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative h-[120vh] flex items-center justify-center overflow-hidden bg-void"
    >
      {/* 0. Gravitational Warp Grid */}
      <div className="space-grid-warp">
        <div className="grid-warp-inner" />
      </div>

      {/* Hero Background & Stars (WebGL) */}
      <motion.div style={{ opacity }} className="absolute inset-0 z-0">
        {isClient && (
          <React.Suspense fallback={null}>
            <HeroGL />
          </React.Suspense>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-void/20 via-transparent to-void" />
      </motion.div>

      {/* 1. 浮動文字層 */}
      <div className="relative z-30 flex flex-col items-center max-w-[90vw]">
        <div className="flex flex-wrap justify-center overflow-hidden pb-4 px-4 select-none">
          {(t.hero.title || 'GRAVITO').split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
              className="glitch-text text-6xl sm:text-8xl md:text-[11rem] font-black italic tracking-tighter text-white uppercase inline-block cursor-default"
              style={{
                textShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}
            >
              <span
                className={
                  i === 0 || i === 3
                    ? 'text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-400'
                    : 'text-white'
                }
              >
                {char}
              </span>
            </motion.span>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, letterSpacing: '1.5em' }}
          animate={{ opacity: 1, letterSpacing: '0.5em' }}
          transition={{ delay: 1, duration: 1.5 }}
          className="mt-8 flex flex-col items-center gap-4"
        >
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-singularity to-transparent" />
          <p className="text-cyan-200/80 uppercase text-xs md:text-sm font-bold text-center w-full tracking-[0.5em] drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
            {t.hero.tagline}
          </p>
        </motion.div>

        {/* 2. CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
          className="mt-12 flex flex-col md:flex-row gap-6 items-center"
        >
          <StaticLink
            href={`/${locale}/docs/guide/getting-started`}
            className="group relative px-8 py-4 bg-white text-void font-bold rounded-full overflow-hidden transition-all hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Rocket className="w-5 h-5 group-hover:animate-bounce" />
              {t.hero.startBtn}
            </span>
          </StaticLink>

          <a
            href="https://github.com/gravito-framework/gravito"
            target="_blank"
            rel="noopener noreferrer"
            className="group px-8 py-4 bg-void/40 backdrop-blur-xl border border-white/10 text-white font-bold rounded-full hover:bg-white/10 transition-all hover:border-white/30 flex items-center gap-2"
          >
            <Github className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            {t.hero.githubBtn}
          </a>
        </motion.div>
      </div>

      <div className="absolute bottom-0 w-full h-64 bg-hex-grid bg-gradient-to-t from-black to-transparent z-20 opacity-50" />
    </section>
  )
}

interface HomeProps {
  t: Translation
  locale: string
}

const GravitoLanding = ({ t, locale }: HomeProps) => {
  return (
    <Layout noPadding>
      <Head>
        <title>{t.site.title}</title>
        <meta name="description" content={t.site.description} />
        <meta name="keywords" content={t.site.keywords} />
      </Head>
      {/* Hero Section */}
      <AdvancedHero t={t} locale={locale} />

      {/* Tech Stack Section */}
      <StackSection t={t} />

      {/* Feature Section - Feature Cards */}
      <section className="relative py-32 px-6 z-30 overflow-hidden" id="features">
        {/* 背景裝飾 */}
        <div className="absolute inset-0 bg-hex-grid opacity-10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-singularity/5 rounded-full blur-[200px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Section 標題 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-xs font-mono tracking-[0.3em] text-singularity/60 uppercase mb-4 block">
              {t.features.sectionBadge}
            </span>
            <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter mb-6">
              {t.features.sectionTitle}{' '}
              <span className="text-singularity">{t.features.sectionTitleHighlight}</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.features.sectionDesc}</p>
          </motion.div>

          {/* Feature Cards Grid - Grouped Modules */}
          <div className="space-y-16 mb-20">
            {[
              {
                title: t.features.group_core,
                items: [
                  {
                    icon: Box,
                    title: t.features.kernel_title,
                    subtitle: t.features.kernel_subtitle,
                    description: t.features.kernel_desc,
                  },
                  {
                    icon: LayoutIcon,
                    title: t.features.inertia_title,
                    subtitle: t.features.inertia_subtitle,
                    description: t.features.inertia_desc,
                  },
                  {
                    icon: Code,
                    title: t.features.cli_title,
                    subtitle: t.features.cli_subtitle,
                    description: t.features.cli_desc,
                  },
                ],
              },
              {
                title: t.features.group_data,
                items: [
                  {
                    icon: Database,
                    title: t.features.atlas_title,
                    subtitle: t.features.atlas_subtitle,
                    description: t.features.atlas_desc,
                  },
                  {
                    icon: Zap,
                    title: t.features.seo_title,
                    subtitle: t.features.seo_subtitle,
                    description: t.features.seo_desc,
                  },
                ],
              },
              {
                title: t.features.group_ops,
                items: [
                  {
                    icon: Activity,
                    title: t.features.monitor_title,
                    subtitle: t.features.monitor_subtitle,
                    description: t.features.monitor_desc,
                  },
                  {
                    icon: Server,
                    title: t.features.stream_title,
                    subtitle: t.features.stream_subtitle,
                    description: t.features.stream_desc,
                  },
                  {
                    icon: Shield,
                    title: t.features.stasis_title,
                    subtitle: t.features.stasis_subtitle,
                    description: t.features.stasis_desc,
                  },
                  {
                    icon: FileText,
                    title: t.features.astral_title,
                    subtitle: t.features.astral_subtitle,
                    description: t.features.astral_desc,
                  },
                ],
              },
            ].map((group, groupIndex) => (
              <div key={group.title}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-[1px] bg-gradient-to-r from-singularity to-transparent" />
                  <h3 className="text-sm font-mono uppercase tracking-[0.3em] text-singularity/70">
                    {group.title}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.items.map((item, index) => (
                    <FeatureCard3D
                      key={item.title}
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      description={item.description}
                      delay={groupIndex * 0.2 + index * 0.1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center"
          >
            <StaticLink
              href={locale === 'zh' ? '/zh/docs' : '/docs'}
              className="inline-flex items-center gap-3 px-8 py-4 bg-singularity/10 border border-singularity/30 rounded-xl text-singularity font-semibold hover:bg-singularity/20 transition-all duration-300 group"
            >
              {t.features.getStarted}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </StaticLink>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection t={t} />

      {/* Benchmark Section */}
      <BenchmarkSection t={t} />

      {/* Quick Start / Ignition Console Section */}
      <QuickStartSection />
    </Layout>
  )
}
const TechIcon = ({ type }: { type: string }) => {
  if (type === 'bun') {
    return (
      <svg
        viewBox="0 0 80 70"
        className="w-12 h-12 transition-transform duration-500 group-hover:scale-110"
        role="img"
      >
        <title>Bun</title>
        <defs>
          <linearGradient id="bun_skin" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FBF0DF" />
            <stop offset="100%" stopColor="#F6DECE" />
          </linearGradient>
        </defs>
        {/* Shadow */}
        <path
          d="M71.09,20.74c-.16-.17-.33-.34-.5-.5s-.33-.34-.5-.5-.33-.34-.5-.5-.33-.34-.5-.5-.33-.34-.5-.5A26.46,26.46,0,0,1,75.5,35.7c0,16.57-16.82,30.05-37.5,30.05-11.58,0-21.94-4.23-28.83-10.86l.5.5.5.5.5.5.5.5.5.5.5.5.5.5C19.55,65.3,30.14,69.75,42,69.75c20.68,0,37.5-13.48,37.5-30C79.5,32.69,76.46,26,71.09,20.74Z"
          fill="#CCBEA7"
          opacity="0.3"
        />
        {/* Body */}
        <path
          d="M73,35.7c0,15.21-15.67,27.54-35,27.54S3,50.91,3,35.7C3,26.27,9,17.94,18.22,13S33.18,3,38,3s8.94,4.13,19.78,10C67,17.94,73,26.27,73,35.7Z"
          fill="url(#bun_skin)"
        />
        {/* Face details */}
        <path
          d="M45.05,43a8.93,8.93,0,0,1-2.92,4.71,6.81,6.81,0,0,1-4,1.88A6.84,6.84,0,0,1,34,47.71,8.93,8.93,0,0,1,31.12,43a.72.72,0,0,1,.8-.81H44.26A.72.72,0,0,1,45.05,43Z"
          fill="#b71422"
        />
        <path d="M53.22 40.18a5.85 3.44 0 1 0 0 0.1z" fill="#febbd0" opacity="0.6" />
        <path d="M22.95 40.18a5.85 3.44 0 1 0 0 0.1z" fill="#febbd0" opacity="0.6" />
        <circle cx="20.2" cy="36" r="2.5" fill="#333" />
        <circle cx="48.7" cy="36" r="2.5" fill="#333" />
      </svg>
    )
  }
  if (type === 'gravito') {
    return (
      <div className="relative w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full rounded-xl bg-gradient-to-tr from-singularity to-purple-600 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center relative z-10 overflow-hidden"
        >
          <div className="w-4 h-4 rounded-full bg-void shadow-inner" />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-white/20 blur-sm"
          />
        </motion.div>
        <div className="absolute inset-0 bg-singularity/20 blur-xl rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    )
  }
  if (type === 'ts') {
    return (
      <svg
        viewBox="0 0 512 512"
        className="w-12 h-12 transition-transform duration-500 group-hover:scale-110"
        role="img"
      >
        <title>TypeScript</title>
        <rect fill="#3178c6" height="512" rx="60" width="512" />
        <path
          clipRule="evenodd"
          d="m316.939 407.424v50.061c8.138 4.172 17.763 7.3 28.875 9.386s22.823 3.129 35.135 3.129c11.999 0 23.397-1.147 34.196-3.442 10.799-2.294 20.268-6.075 28.406-11.342 8.138-5.266 14.581-12.15 19.328-20.65s7.121-19.007 7.121-31.522c0-9.074-1.356-17.026-4.069-23.857s-6.625-12.906-11.738-18.225c-5.112-5.319-11.242-10.091-18.389-14.315s-15.207-8.213-24.18-11.967c-6.573-2.712-12.468-5.345-17.685-7.9-5.217-2.556-9.651-5.163-13.303-7.822-3.652-2.66-6.469-5.476-8.451-8.448-1.982-2.973-2.974-6.336-2.974-10.091 0-3.441.887-6.544 2.661-9.308s4.278-5.136 7.512-7.118c3.235-1.981 7.199-3.52 11.894-4.615 4.696-1.095 9.912-1.642 15.651-1.642 4.173 0 8.581.313 13.224.938 4.643.626 9.312 1.591 14.008 2.894 4.695 1.304 9.259 2.947 13.694 4.928 4.434 1.982 8.529 4.276 12.285 6.884v-46.776c-7.616-2.92-15.937-5.084-24.962-6.492s-19.381-2.112-31.066-2.112c-11.895 0-23.163 1.278-33.805 3.833s-20.006 6.544-28.093 11.967c-8.086 5.424-14.476 12.333-19.171 20.729-4.695 8.395-7.043 18.433-7.043 30.114 0 14.914 4.304 27.638 12.912 38.172 8.607 10.533 21.675 19.45 39.204 26.751 6.886 2.816 13.303 5.579 19.25 8.291s11.086 5.528 15.415 8.448c4.33 2.92 7.747 6.101 10.252 9.543 2.504 3.441 3.756 7.352 3.756 11.733 0 3.233-.783 6.231-2.348 8.995s-3.939 5.162-7.121 7.196-7.147 3.624-11.894 4.771c-4.748 1.148-10.303 1.721-16.668 1.721-10.851 0-21.597-1.903-32.24-5.71-10.642-3.806-20.502-9.516-29.579-17.13zm-84.159-123.342h64.22v-41.082h-179v41.082h63.906v182.918h50.874z"
          fill="#fff"
          fillRule="evenodd"
        />
      </svg>
    )
  }
  return null
}

const StackSection = ({ t }: { t: Translation }) => {
  const stack = [
    { type: 'bun', title: t.stack.bun_title, desc: t.stack.bun_desc, color: 'text-orange-400' },
    {
      type: 'gravito',
      title: t.stack.engine_title,
      desc: t.stack.engine_desc,
      color: 'text-cyan-500',
    },
    { type: 'ts', title: t.stack.ts_title, desc: t.stack.ts_desc, color: 'text-blue-400' },
  ]

  return (
    <section className="relative py-24 px-6 z-30 border-y border-white/5 bg-black/5 overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="w-full md:w-1/3">
          <h2 className="text-4xl font-black italic tracking-tighter mb-4">{t.stack.title}</h2>
          <p className="text-gray-400 font-medium">{t.stack.subtitle}</p>
        </div>
        <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {stack.map((item, index) => (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-white/10 transition-all hover:bg-white/[0.05]"
            >
              <div
                className={`mb-6 transition-all duration-500 transform group-hover:scale-110 ${item.color}`}
              >
                <TechIcon type={item.type} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 統計數據區塊 - Holographic Sensors
const StatsSection = ({ t }: { t: Translation }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const stats = [
    { value: '10x', label: t.stats.efficiency, icon: Zap, color: 'from-cyan-500' },
    { value: '0ms', label: t.stats.bottleneck, icon: Rocket, color: 'from-purple-500' },
    { value: '100%', label: t.stats.integrity, icon: Code, color: 'from-emerald-500' },
  ]

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Background Liquid Wave */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)] animate-pulse" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="group relative p-12 rounded-[3rem] bg-white/[0.01] border border-white/5 backdrop-blur-3xl text-center overflow-hidden"
            >
              {/* Sensor Ring Ornament */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <stat.icon
                className="text-white/20 group-hover:text-singularity mx-auto mb-8 transition-all duration-700 group-hover:scale-110"
                size={48}
              />

              <div className="relative">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={isInView ? { y: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                  className="text-7xl font-black text-white mb-4 tracking-tighter"
                >
                  {stat.value}
                </motion.div>
                {/* Number Glitch Overlay */}
                <div className="absolute inset-0 text-7xl font-black text-singularity/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 select-none">
                  {stat.value}
                </div>
              </div>

              <div className="text-gray-500 font-mono tracking-[0.3em] uppercase text-[10px] group-hover:text-gray-300 transition-colors">
                {stat.label}
              </div>

              {/* Decorative Sensor Bits */}
              <div className="mt-8 flex justify-center gap-2 opacity-20">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full bg-white animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 🚀 星際感啟動控制台 (Quick Start Section) - Reactor Ignition
const QuickStartSection = () => {
  const [copied, setCopied] = useState(false)
  const command = 'bun create gravito-app@latest ./'

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative py-48 px-6 overflow-hidden bg-void">
      {/* Hyper-tunnel Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vh] border-[1px] border-dashed border-singularity/30 rounded-full animate-[spin_60s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vh] border-[1px] border-dashed border-purple-500/20 rounded-full animate-[spin_40s_linear_reverse_infinite]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-6xl md:text-8xl font-black italic tracking-[calc(-0.05em)] text-white uppercase mb-6">
            Ignite the <span className="text-singularity">Core</span>
          </h2>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.5em]">
            System_Status: Awaiting_Input
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:max-w-5xl mx-auto"
        >
          {/* Reactor Chassis */}
          <div className="relative bg-black border border-white/10 rounded-[4rem] p-2 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]">
            <div className="bg-[#050507] border border-white/5 rounded-[3.8rem] overflow-hidden">
              {/* Header: Technical Telemetry */}
              <div className="flex items-center justify-between px-12 py-8 border-b border-white/5 bg-white/[0.01]">
                <div className="flex gap-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50 animate-pulse" />
                  <div className="w-3 h-3 rounded-full bg-singularity/20 border border-singularity/50" />
                </div>
                <div className="font-mono text-[9px] text-gray-600 tracking-widest uppercase">
                  Reactor_Model: G-2026 {/* Quantum_Encryption: ACTIVE */}
                </div>
              </div>

              {/* Main Interface */}
              <div className="p-12 md:p-20 flex flex-col md:flex-row gap-12 items-center">
                <div className="flex-1 w-full">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="px-3 py-1 rounded bg-singularity/10 border border-singularity/20 text-singularity text-[9px] font-black uppercase tracking-tighter">
                      Command_Input
                    </div>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  <div className="group/cmd relative p-8 bg-black/60 border border-white/5 rounded-3xl overflow-hidden transition-all hover:border-singularity/30">
                    <div className="flex items-center gap-6">
                      <span className="text-singularity/40 font-mono text-2xl font-black">
                        {'>'}
                      </span>
                      <code className="text-xl md:text-2xl font-mono text-white tracking-tight break-all selection:bg-singularity selection:text-black">
                        {command}
                      </code>
                    </div>
                    {/* Interior Scanline */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-1/2 animate-[scan-vertical_4s_linear_infinite] pointer-events-none" />
                  </div>
                </div>

                {/* The Magnetic Ignition Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopy}
                  className="relative w-40 h-40 shrink-0 group/btn"
                >
                  {/* Button Aura */}
                  <div className="absolute -inset-4 bg-singularity/20 blur-2xl rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700" />

                  <div className="relative w-full h-full rounded-full bg-white flex flex-col items-center justify-center gap-2 overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                    <div className="absolute inset-0 bg-black translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1]" />

                    <div className="relative z-10 flex flex-col items-center gap-2 transition-colors duration-500">
                      {copied ? (
                        <>
                          <Check className="text-singularity" size={40} />
                          <span className="text-[10px] font-black uppercase text-singularity">
                            Synchronized
                          </span>
                        </>
                      ) : (
                        <>
                          <Rocket className="text-black group-hover:text-white" size={40} />
                          <span className="text-[10px] font-black uppercase text-black group-hover:text-white">
                            Ignite
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Footer Panel */}
              <div className="px-12 py-10 border-t border-white/5 bg-black/40 grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { label: 'Uptime', val: '99.999%' },
                  { label: 'Core_Temp', val: '0.002 K' },
                  { label: 'Throughput', val: 'MAX_CAPACITY' },
                  { label: 'Authority', val: 'ROOT_GALAXY' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="text-[8px] font-black text-gray-700 uppercase tracking-[0.2em]">
                      {item.label}
                    </div>
                    <div className="text-xs font-mono text-gray-400 font-bold">{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
// Benchmark 性能測試區塊
const BenchmarkSection = ({ t }: { t: Translation }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const data = [
    { label: t.benchmarks.rps_title, gravito: 116.5, hono: 96.0, elysia: 66.8, unit: 'k' },
    {
      label: t.benchmarks.latency_title,
      gravito: 0.65,
      hono: 0.78,
      elysia: 0.77,
      unit: 'ms',
      inverse: true,
    },
    {
      label: t.benchmarks.startup_title,
      gravito: 8,
      hono: 45,
      elysia: 12,
      unit: 'ms',
      inverse: true,
    },
  ]

  return (
    <section className="relative py-32 px-6 z-30" id="benchmarks">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-xs font-mono tracking-[0.3em] text-singularity uppercase mb-4 block">
            {t.benchmarks.sectionBadge}
          </span>
          <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-6 uppercase">
            {t.benchmarks.sectionTitle}{' '}
            <span className="text-singularity">{t.benchmarks.sectionTitleHighlight}</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">{t.benchmarks.sectionDesc}</p>
        </motion.div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.map((item, i) => (
            <div
              key={item.label}
              className="flex flex-col gap-8 p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl group relative overflow-hidden"
            >
              {/* Background Technical Noise */}
              <div className="absolute top-4 right-8 font-mono text-[8px] text-white/5 uppercase select-none">
                TELEM_ID_{i} {/* STABLE_CORE */}
              </div>

              <h3 className="text-xl font-bold text-white/90 italic">{item.label}</h3>

              <div className="flex flex-col gap-6">
                {/* Gravito Bar - The 'Oscilloscope' Style */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-singularity">
                      Gravito Engine
                    </span>
                    <span className="font-mono text-2xl text-white font-black">
                      {item.gravito}
                      {item.unit}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-sm overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: item.inverse ? '5%' : '100%' } : {}}
                      transition={{ duration: 1.5, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-singularity relative"
                    >
                      {/* Speed Pulse */}
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      />
                    </motion.div>
                  </div>
                </div>

                {/* Others - Dimmed */}
                <div className="space-y-4 opacity-30 group-hover:opacity-50 transition-opacity">
                  {[
                    { name: 'Elysia', val: item.elysia, w: item.inverse ? '15%' : '90%' },
                    { name: 'Hono', val: item.hono, w: item.inverse ? '35%' : '80%' },
                  ].map((other) => (
                    <div key={other.name} className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono uppercase text-gray-400">
                        <span>{other.name}</span>
                        <span>
                          {other.val}
                          {item.unit}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={isInView ? { width: other.w } : {}}
                          transition={{ duration: 1, delay: i * 0.2 + 0.3 }}
                          className="h-full bg-gray-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Decorative Data */}
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
                <span className="text-[8px] font-mono text-gray-600">OFFSET: 0.002ms</span>
                <span className="text-[8px] font-mono text-gray-600">CPU_AFFINITY: CORE_0</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-6 border border-white/5 rounded-2xl bg-void/50 text-center">
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">
            {t.benchmarks.env_note}
          </p>
        </div>
      </div>
    </section>
  )
}

// 3D 懸停特色卡片組件
interface FeatureCard3DProps {
  title: string
  subtitle: string
  icon: LucideIcon
  description: string
  delay?: number
}

const FeatureCard3D: React.FC<FeatureCard3DProps> = ({
  title,
  subtitle,
  icon: Icon,
  description,
  delay = 0,
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="relative h-96 w-full rounded-[2.5rem] bg-white/[0.02] border border-white/5 p-8 backdrop-blur-xl cursor-pointer group overflow-hidden shadow-2xl hover:border-singularity/30 transition-colors duration-500"
    >
      {/* Dynamic Grid Background inside card */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-[radial-gradient(rgba(0,240,255,0.2)_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="flex flex-col h-full relative z-10">
        {/* Tech Icon with Glow */}
        <div className="mb-8 w-20 h-20 rounded-2xl bg-black/50 flex items-center justify-center border border-white/5 group-hover:border-singularity/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_60px_rgba(0,240,255,0.15)] transition-all duration-700">
          <Icon
            className="text-gray-500 group-hover:text-singularity transition-colors duration-500"
            size={36}
          />
          {/* X-Ray Ring */}
          <div className="absolute inset-0 rounded-2xl border border-singularity/0 group-hover:border-singularity/30 group-hover:scale-125 transition-all duration-700 pointer-events-none" />
        </div>

        <span className="text-[10px] font-black tracking-[0.3em] text-gray-500 group-hover:text-singularity mb-3 uppercase transition-colors">
          {subtitle}
        </span>
        <h3 className="text-3xl font-bold text-white mb-4 italic tracking-tighter transition-transform group-hover:translate-x-2">
          {title}
        </h3>
        <p className="text-gray-400 group-hover:text-gray-300 text-sm leading-relaxed transition-colors font-medium">
          {description}
        </p>

        {/* Technical Data Bits */}
        <div className="mt-auto flex justify-between items-end border-t border-white/5 pt-6 group-hover:border-singularity/20 transition-colors">
          <div className="text-[9px] font-mono text-white/20 group-hover:text-singularity/60 transition-colors">
            PROTOCOL_V1 {/* OPTIMIZED_STACK */}
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-singularity group-hover:text-black transition-all duration-500">
            <ArrowRight
              className="text-white/40 group-hover:text-black group-hover:translate-x-0.5 transition-all"
              size={16}
            />
          </div>
        </div>
      </div>

      {/* Edge Beam Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-singularity/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-singularity/50 to-transparent" />
      </div>
    </motion.div>
  )
}

export default GravitoLanding
