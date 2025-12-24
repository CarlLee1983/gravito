import { Head } from '@inertiajs/react'
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Box,
  Check,
  Code,
  Github,
  Image as ImageIcon,
  Languages,
  Layout as LayoutIcon,
  type LucideIcon,
  Rocket,
  ShieldAlert,
  Terminal,
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

// 強化版 Hero 組件（Star Shuttle Effect）
const AdvancedHero = ({ t, locale }: { t: Translation; locale: string }) => {
  const { scrollY } = useScroll()
  const _y1 = useTransform(scrollY, [0, 500], [0, 200])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])
  const _blur = useTransform(scrollY, [0, 300], [0, 10])

  // 生成靜態的星星數據，避免 re-render
  const stars = React.useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      angle: Math.random() * 360 * (Math.PI / 180), // 隨機角度 (弧度)
      distance: 800 + Math.random() * 1200, // 隨機飛行距離
      duration: 1 + Math.random() * 2, // 隨機飛行時間
      delay: Math.random() * 2, // 隨機延遲
      size: Math.random() < 0.2 ? 2 : 1, // 隨機大小
    }))
  }, [])

  const titleCharItems = (t.hero.title || 'GRAVITO').split('').map((char, index) => ({
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
    <section className="relative h-[120vh] flex items-center justify-center overflow-hidden bg-void">
      {/* 0. Hero Background (WebGL) */}
      <motion.div style={{ opacity }} className="absolute inset-0 z-0">
        {isClient && (
          <React.Suspense fallback={null}>
            <HeroGL />
          </React.Suspense>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-void/20 via-transparent to-void" />
      </motion.div>

      {/* 1. Star Shuttle Effect */}
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 z-10 perspective-[500px] overflow-hidden"
      >
        {stars.map((star) => (
          <motion.div
            key={star.id}
            initial={{
              x: 0,
              y: 0,
              z: 0,
              opacity: 0,
              scale: 0,
            }}
            animate={{
              x: Math.cos(star.angle) * star.distance,
              y: Math.sin(star.angle) * star.distance,
              z: 500, // 模擬向鏡頭衝來
              scale: [0.1, star.size], // 由小變大
              opacity: [0, 1, 0], // 進場顯現，接近邊緣消失
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: 'easeIn', // 加速感
            }}
            className="absolute top-1/2 left-1/2 bg-white rounded-full shadow-[0_0_4px_white]"
            style={{
              width: star.size,
              height: star.size * (star.size === 2 ? 8 : 4), // 較大的星星拉得更長，製造速度線感
              rotate: (star.angle * 180) / Math.PI + 90, // 根據角度旋轉，讓線條指向中心
            }}
          />
        ))}
      </motion.div>

      {/* 5. 浮動文字層 (Staggered Intro) */}
      <div className="relative z-30 flex flex-col items-center">
        <div className="flex flex-wrap justify-center overflow-hidden pb-2 px-4 gap-x-2 md:gap-x-0">
          {titleCharItems.map((item) => (
            <motion.span
              key={item.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.5 + item.index * 0.1,
                duration: 0.8,
                ease: [0.2, 0.65, 0.3, 0.9],
              }}
              className="text-5xl sm:text-6xl md:text-9xl font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(0,100,200,0.5)] inline-block"
            >
              {item.char}
            </motion.span>
          ))}
          <motion.span
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="text-5xl sm:text-6xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 ml-2 md:ml-4 pr-2 md:pr-12 inline-block select-none"
          >
            {t.hero.core}
          </motion.span>
        </div>
        <motion.p
          initial={{ opacity: 0, letterSpacing: '1.5em' }}
          animate={{ opacity: 1, letterSpacing: '0.5em' }}
          transition={{ delay: 2, duration: 1.5 }}
          className="mt-6 text-cyan-200/80 uppercase text-xs md:text-sm font-bold text-center w-full"
        >
          {t.hero.tagline}
        </motion.p>

        {/* 6. CTA Buttons */}
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
      {/* Hero Section - 強化版引力透鏡效果 */}
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

          {/* Feature Cards Grid - 6 Modules matrix (1.0 Focus) */}
          {/* Feature Cards Grid - 1.0 Release Modules (6 Core Modules) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            <FeatureCard3D
              icon={Box}
              title={t.features.kernel_title}
              subtitle={t.features.kernel_subtitle}
              description={t.features.kernel_desc}
              delay={0}
            />

            <FeatureCard3D
              icon={LayoutIcon}
              title={t.features.inertia_title}
              subtitle={t.features.inertia_subtitle}
              description={t.features.inertia_desc}
              delay={0.1}
            />

            <FeatureCard3D
              icon={Code}
              title={t.features.cli_title}
              subtitle={t.features.cli_subtitle}
              description={t.features.cli_desc}
              delay={0.2}
            />

            <FeatureCard3D
              icon={Zap}
              title={t.features.seo_title}
              subtitle={t.features.seo_subtitle}
              description={t.features.seo_desc}
              delay={0.3}
            />

            <FeatureCard3D
              icon={ImageIcon} // Optimized Image icon
              title={t.features.image_title}
              subtitle={t.features.image_subtitle}
              description={t.features.image_desc}
              delay={0.4}
            />

            <FeatureCard3D
              icon={Languages} // I18n Global icon
              title={t.features.i18n_title}
              subtitle={t.features.i18n_subtitle}
              description={t.features.i18n_desc}
              delay={0.5}
            />
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
          d="M71.09,20.74c-.16-.17-.33-.34-.5-.5s-.33-.34-.5-.5-.33-.34-.5-.5-.33-.34-.5-.5-.33-.34-.5-.5-.33-.34-.5-.5A26.46,26.46,0,0,1,75.5,35.7c0,16.57-16.82,30.05-37.5,30.05-11.58,0-21.94-4.23-28.83-10.86l.5.5.5.5.5.5.5.5.5.5.5.5.5.5C19.55,65.3,30.14,69.75,42,69.75c20.68,0,37.5-13.48,37.5-30C79.5,32.69,76.46,26,71.09,20.74Z"
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

// 統計數據區塊
const StatsSection = ({ t }: { t: Translation }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const stats = [
    { value: '10x', label: t.stats.efficiency, icon: Zap },
    { value: '0ms', label: t.stats.bottleneck, icon: Rocket },
    { value: '100%', label: t.stats.integrity, icon: Code },
  ]

  return (
    <section className="relative py-24 px-6 bg-gradient-to-b from-void via-panel/20 to-void">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center p-8 rounded-2xl bg-panel/30 border border-white/5 backdrop-blur-sm"
            >
              <stat.icon className="text-singularity mx-auto mb-4" size={40} />
              <motion.div
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.3, type: 'spring' }}
                className="text-5xl font-black text-white mb-2"
              >
                {stat.value}
              </motion.div>
              <div className="text-gray-400 font-mono tracking-wider uppercase text-sm">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 🚀 星際感啟動控制台 (Quick Start Section)
const QuickStartSection = () => {
  const [copied, setCopied] = useState(false)
  const command = 'bun create gravito-app@latest ./'

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative py-32 px-6 overflow-hidden bg-void">
      {/* 🚀 背景曲率網格 (Hyperspace Grid) */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-singularity/30 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,240,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
          perspective: '1000px',
          transform: 'rotateX(60deg) translateY(-200px) scale(2)',
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-singularity/10 border border-singularity/20 rounded-md text-xs font-black text-singularity uppercase tracking-[0.1em] mb-4"
          >
            <Activity size={10} className="animate-pulse" />
            <span>Deployment Ready</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase mb-4">
            Start Your <span className="text-singularity">Mission</span>
          </h2>
          <p className="text-gray-500 font-medium">Ignite your project with a single command.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative group lg:max-w-4xl mx-auto"
        >
          {/* 外層光暈裝飾 (Console Glow) */}
          <div className="absolute -inset-1 bg-gradient-to-r from-singularity/20 via-purple-500/20 to-singularity/20 rounded-[32px] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

          {/* 終端機容器 (The Console) */}
          <div className="relative bg-[#0a0a0c] border border-white/10 rounded-[30px] overflow-hidden backdrop-blur-3xl shadow-2xl">
            {/* 終端機頂部儀表盤 (Console Header) */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                <div className="w-2 h-2 rounded-full bg-singularity/50 shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
              </div>
              <div className="flex items-center gap-6 text-[11px] font-bold text-gray-400 tracking-[0.05em] uppercase">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={12} className="text-singularity/80" /> <span>Core_Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-purple-400/80" /> <span>Latency: 0.08ms</span>
                </div>
                <div className="hidden sm:block">
                  STATUS: <span className="text-singularity">Online</span>
                </div>
              </div>
            </div>

            {/* 控制台內容區 (Terminal Body) */}
            <div className="p-8 md:p-12 relative">
              {/* 掃描線效果 (Scanning line) */}
              <motion.div
                animate={{ top: ['0%', '100%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-[30%] bg-gradient-to-b from-transparent via-singularity/5 to-transparent z-10 pointer-events-none"
              />

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-20">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Terminal size={18} className="text-singularity" />
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                      Main Terminal Access
                    </span>
                  </div>

                  <div className="flex items-center gap-4 bg-black/40 border border-white/5 p-5 md:p-6 rounded-2xl group/cmd relative overflow-hidden">
                    <div className="absolute inset-0 bg-singularity/5 opacity-0 group-hover/cmd:opacity-100 transition-opacity" />
                    <span className="text-singularity font-black shrink-0 font-mono text-lg">
                      $
                    </span>
                    <code className="text-lg md:text-xl font-mono text-white tracking-tight break-all">
                      {command}
                    </code>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 flex flex-col items-center justify-center p-8 md:w-32 md:h-32 rounded-[24px] bg-white group/btn relative overflow-hidden transition-all active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                >
                  <div className="absolute inset-0 bg-black translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    {copied ? (
                      <>
                        <Check className="text-singularity" size={32} />
                        <span className="text-[10px] font-black uppercase text-singularity">
                          Success
                        </span>
                      </>
                    ) : (
                      <>
                        <Rocket
                          className="text-black group-hover:text-white transition-colors"
                          size={32}
                        />
                        <span className="text-[10px] font-black uppercase text-black group-hover:text-white transition-colors">
                          Ignite
                        </span>
                      </>
                    )}
                  </div>

                  {/* 按鈕內部的流光效果 */}
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" />
                </button>
              </div>

              {/* 底部裝飾資訊 (Analytics Microdata) */}
              <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Kernel', val: 'v1.0.4-LIFTOFF' },
                  { label: 'Engine', val: 'Singularity-V8' },
                  { label: 'Memory', val: 'Allocated: 64MB' },
                  { label: 'Security', val: 'Quantum_Shield' },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                      {stat.label}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400 font-bold">
                      {stat.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Corner Decors (Console Brackets) */}
          <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-singularity/30 rounded-tl-xl pointer-events-none" />
          <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-singularity/30 rounded-br-xl pointer-events-none" />
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
    { label: t.benchmarks.rps_title, gravito: 100, express: 15, nest: 25, unit: 'k' },
    {
      label: t.benchmarks.latency_title,
      gravito: 0.8,
      express: 12.5,
      nest: 24.2,
      unit: 'ms',
      inverse: true,
    },
    {
      label: t.benchmarks.startup_title,
      gravito: 8,
      express: 450,
      nest: 1200,
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
          <span className="text-xs font-mono tracking-[0.3em] text-cyan-500/60 uppercase mb-4 block">
            {t.benchmarks.sectionBadge}
          </span>
          <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter mb-6">
            {t.benchmarks.sectionTitle}{' '}
            <span className="text-cyan-500">{t.benchmarks.sectionTitleHighlight}</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.benchmarks.sectionDesc}</p>
        </motion.div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {data.map((item, i) => (
            <div
              key={item.label}
              className="flex flex-col gap-6 p-8 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md"
            >
              <h3 className="text-lg font-bold text-white/90">{item.label}</h3>
              <div className="flex flex-col gap-4">
                {/* Gravito Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-cyan-500/60">
                    <span>Gravito</span>
                    <span>
                      {item.gravito}
                      {item.unit}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: item.inverse ? '5%' : '100%' } : {}}
                      transition={{ duration: 1, delay: i * 0.2 }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                    />
                  </div>
                </div>

                {/* NestJS Bar */}
                <div className="space-y-1 opacity-50">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    <span>NestJS</span>
                    <span>
                      {item.nest}
                      {item.unit}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: item.inverse ? '40%' : '25%' } : {}}
                      transition={{ duration: 1, delay: i * 0.2 + 0.1 }}
                      className="h-full bg-gray-600"
                    />
                  </div>
                </div>

                {/* Express Bar */}
                <div className="space-y-1 opacity-30">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    <span>Express</span>
                    <span>
                      {item.express}
                      {item.unit}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: item.inverse ? '85%' : '15%' } : {}}
                      transition={{ duration: 1, delay: i * 0.2 + 0.2 }}
                      className="h-full bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          {t.benchmarks.env_note}
        </p>
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
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // 加上彈性數值，讓轉動更平滑
  const mouseX = useSpring(x, { stiffness: 150, damping: 20 })
  const mouseY = useSpring(y, { stiffness: 150, damping: 20 })

  // 計算旋轉角度：當滑鼠在邊緣時，旋轉約 15 度
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15])
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15])

  // 計算高光位置（轉換為百分比）
  const highlightXPercent = useTransform(mouseX, [-0.5, 0.5], [0, 100])
  const highlightYPercent = useTransform(mouseY, [-0.5, 0.5], [0, 100])

  // 使用 useMotionTemplate 組合高光背景
  const highlightBackground = useMotionTemplate`radial-gradient(circle at ${highlightXPercent}% ${highlightYPercent}%, rgba(255,255,255,0.05), transparent 70%)`

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseXPos = e.clientX - rect.left
    const mouseYPos = e.clientY - rect.top

    x.set(mouseXPos / width - 0.5)
    y.set(mouseYPos / height - 0.5)
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className="relative h-96 w-full rounded-2xl bg-panel/40 border border-white/10 p-8 backdrop-blur-md cursor-pointer group"
    >
      <div style={{ transform: 'translateZ(50px)' }} className="flex flex-col h-full relative z-10">
        {/* 圖標發光背景 */}
        <div className="mb-6 w-16 h-16 rounded-xl bg-black flex items-center justify-center border border-white/5 group-hover:border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.05)] group-hover:shadow-cyan-500/20 transition-all duration-500">
          <Icon className="text-cyan-400 group-hover:text-cyan-300 transition-colors" size={32} />
        </div>

        <span className="text-[13px] font-bold tracking-[0.1em] text-cyan-400 mb-2 uppercase">
          {subtitle}
        </span>
        <h3 className="text-2xl font-bold text-white mb-4 italic tracking-tight">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>

        {/* 底部裝飾線 */}
        <div className="mt-auto h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 group-hover:via-cyan-500/30 to-transparent transition-all duration-500" />
      </div>

      {/* 卡片高光（會跟著滑鼠跑的反射感） */}
      <motion.div
        style={{
          background: highlightBackground,
        }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
      />
    </motion.div>
  )
}

export default GravitoLanding
