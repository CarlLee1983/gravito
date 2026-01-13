import { Head, usePage } from '@inertiajs/react'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Cpu,
  Database,
  ListTree,
  Search,
  Server,
  ShieldCheck,
} from 'lucide-react'
import React from 'react'
import { BentoGrid, BentoGridItem } from '../components/BentoGrid'
import { Footer } from '../components/Footer'
import { LogTicker } from '../components/LogTicker'
import { Magnetic } from '../components/Magnetic'
import { Navbar } from '../components/Navbar'
import { StaticLink } from '../components/StaticLink'
import { useTrans } from '../hooks/useTrans'

interface HomeProps {
  [key: string]: unknown
  t?: Record<string, unknown>
  locale?: string
  version?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

export default function Home() {
  const { trans, locale } = useTrans()
  const _props = usePage<HomeProps>().props
  const { scrollYProgress } = useScroll()

  const bgGradient = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [
      'radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.05) 0%, transparent 50%)',
      'radial-gradient(circle at 0% 50%, rgba(155, 81, 224, 0.05) 0%, transparent 50%)',
      'radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
    ]
  )

  const getLink = (path: string) => {
    if (locale === 'en') {
      return path
    }
    return `/${locale}${path}`
  }

  return (
    <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-900 overflow-x-hidden font-sans bg-grid-pattern relative">
      <Head>
        <title>{`${trans('hero.title')} ${trans('hero.titleHighlight')} - Gravito Zenith`}</title>
        <meta name="description" content={trans('hero.description')} />
      </Head>
      <Navbar />
      <LogTicker />

      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: bgGradient }}
      />

      {/* Hero Section */}
      <section className="relative min-h-[110vh] flex items-center justify-center overflow-hidden pt-20 pb-20">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 transition-transform duration-1000 group-hover:scale-110"
            style={{ backgroundImage: 'url("/images/hero_bg.png")' }}
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-zenith-accent/10 rounded-full blur-[150px] -translate-y-1/2 animate-pulse-slow" />
          <div className="absolute inset-0 bg-gradient-to-b from-zenith-void via-transparent to-zenith-void" />
          <div className="absolute inset-0 bg-gradient-to-r from-zenith-void via-transparent to-zenith-void" />

          {/* Animated Scanning Line */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zenith-accent/5 to-transparent h-1 w-full animate-scan" />

          <div className="absolute inset-0">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={`star-${i + 1}`}
                className="absolute w-px h-px bg-zenith-accent shadow-[0_0_8px_cyan]"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [1, 2, 1],
                }}
                transition={{
                  duration: 3 + Math.random() * 5,
                  repeat: Infinity,
                  delay: Math.random() * 10,
                }}
              />
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mt-12">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-zenith-surface border border-zenith-accent/20 text-zenith-accent text-[10px] font-black tracking-[0.2em] uppercase mb-10 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zenith-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-zenith-accent"></span>
                  </span>
                  {trans('hero.status')}
                </div>
                <h1 className="text-6xl lg:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
                  {trans('hero.title')} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zenith-accent to-zenith-pulse drop-shadow-[0_0_30px_rgba(0,240,255,0.3)]">
                    {trans('hero.titleHighlight')}
                  </span>
                </h1>
                <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                  {trans('hero.description')}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                  <Magnetic>
                    <StaticLink
                      href={getLink('/features')}
                      className="w-full sm:w-auto px-10 py-4 bg-white text-black hover:bg-zenith-accent transition-all font-black text-xs tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 group shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-zenith-accent/40"
                    >
                      {trans('hero.getStarted')}{' '}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </StaticLink>
                  </Magnetic>
                  <Magnetic>
                    <StaticLink
                      href={getLink('/integrations')}
                      className="w-full sm:w-auto px-10 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all font-black text-xs tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 backdrop-blur-md"
                    >
                      <BookOpen className="w-4 h-4" /> {trans('hero.documentation')}
                    </StaticLink>
                  </Magnetic>
                </div>
              </motion.div>
            </div>

            <div className="flex-1 w-full max-w-2xl lg:max-w-none relative z-10 group">
              <div className="absolute -inset-20 bg-zenith-accent/5 rounded-full blur-[120px] opacity-40 group-hover:bg-zenith-accent/10 transition-all duration-1000" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                className="relative rounded-[2.5rem] border border-white/10 bg-zenith-abyss/80 backdrop-blur-3xl p-8 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8),0_0_20px_rgba(0,240,255,0.05)] overflow-hidden transition-all duration-700 hover:border-zenith-accent/30"
              >
                {/* HUD Decoration */}
                <div
                  className="absolute top-0 right-0 w-80 h-80 bg-cover opacity-20 mix-blend-overlay pointer-events-none grayscale brightness-200"
                  style={{ backgroundImage: 'url("/images/hud_detail.png")' }}
                />

                <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-zenith-accent animate-pulse" />
                    <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                      System Core :: Zenith_Active
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded bg-white/5 border border-white/10 font-mono text-[9px] text-zenith-accent">
                    node_id: 0x42FA
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all">
                      <div className="flex justify-between items-end mb-4">
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">
                          Throughput
                        </div>
                        <div className="text-2xl font-mono font-black text-zenith-accent">
                          12.4K <span className="text-[10px] text-gray-600">req/s</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-zenith-pulse to-zenith-accent"
                          initial={{ width: '0%' }}
                          animate={{ width: '78%' }}
                          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">
                          Latency
                        </div>
                        <div className="text-xl font-mono font-bold text-white">4.2ms</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">
                          Success
                        </div>
                        <div className="text-xl font-mono font-bold text-green-400">99.9%</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">
                        Active Channels
                      </div>
                      <Activity className="w-3 h-3 text-zenith-accent" />
                    </div>
                    <div className="space-y-3">
                      {[
                        { name: 'broadcast.global', val: 82, color: 'bg-zenith-accent' },
                        { name: 'presence.auth', val: 45, color: 'bg-zenith-pulse' },
                        { name: 'stream.raw', val: 91, color: 'bg-purple-500' },
                      ].map((c) => (
                        <div key={c.name} className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-gray-400">
                            <span>{c.name}</span>
                            <span>{c.val}%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${c.color}`} style={{ width: `${c.val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Bento Features Grid */}
      <section className="py-32 relative overflow-hidden bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <div className="text-zenith-accent font-black text-[10px] tracking-[0.3em] uppercase mb-4">
                Features_Overview
              </div>
              <h2 className="text-5xl lg:text-6xl font-black mb-6 tracking-tighter leading-[0.9]">
                {trans('features.title')}
              </h2>
              <p className="text-gray-400 text-lg font-medium">{trans('features.subtitle')}</p>
            </div>
            <StaticLink
              href={getLink('/features')}
              className="text-xs font-black tracking-widest uppercase border-b-2 border-zenith-accent pb-1 text-white hover:text-zenith-accent transition-colors"
            >
              View Feature Matrix →
            </StaticLink>
          </div>

          <BentoGrid>
            <BentoGridItem
              title={trans('features.realtimeMonitoring.title')}
              description={trans('features.realtimeMonitoring.description')}
              header={<BentoSkeleton type="graph" />}
              icon={<Activity size={20} />}
              className="md:col-span-2"
            />
            <BentoGridItem
              title={trans('features.queueManagement.title')}
              description={trans('features.queueManagement.description')}
              header={<BentoSkeleton type="stats" />}
              icon={<Server size={20} />}
            />
            <BentoGridItem
              title={trans('features.jobAuditing.title')}
              description={trans('features.jobAuditing.description')}
              header={<BentoSkeleton type="search" />}
              icon={<Search size={20} />}
            />
            <BentoGridItem
              title={trans('features.dlqOperations.title')}
              description={trans('features.dlqOperations.description')}
              header={<BentoSkeleton type="nodes" />}
              icon={<Database size={20} />}
              className="md:col-span-2"
            />
          </BentoGrid>
        </div>
      </section>

      {/* UI Showcase Section - Enhanced with 3D feel */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6">
              {locale === 'zh-TW' ? '控制平面視覺展示' : 'Control Plane Visualization'}
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
              {locale === 'zh-TW'
                ? 'Zenith 提供全自動的隊列可視化，讓您的異步任務不再是黑盒。'
                : 'Zenith provides fully automated queue visualization, making your async tasks transparent.'}
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid lg:grid-cols-2 gap-12"
          >
            <motion.div variants={itemVariants}>
              <CardPerspective>
                <div className="bg-zenith-surface/60 rounded-3xl border border-white/5 p-10 backdrop-blur-3xl relative overflow-hidden h-full">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zenith-pulse to-transparent opacity-50" />
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-zenith-pulse/10 text-zenith-pulse shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <ListTree size={24} />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight">
                      {locale === 'zh-TW' ? '智能隊列管理' : 'Intelligent Queues'}
                    </h3>
                  </div>
                  <div className="space-y-4 bg-black/40 rounded-2xl p-8 border border-white/5">
                    {[
                      { name: 'emails.marketing', w: 421, f: 0, s: 'active' },
                      { name: 'images.optimize', w: 12, f: 8, s: 'warning' },
                    ].map((q) => (
                      <div
                        key={q.name}
                        className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/[0.05] transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className={`w-2 h-2 rounded-full ${q.s === 'active' ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'}`}
                            />
                            <span className="font-mono text-sm text-gray-200">{q.name}</span>
                          </div>
                          <div className="flex gap-6 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            <span>
                              Wait: <span className="text-zenith-accent">{q.w}</span>
                            </span>
                            <span>
                              Fail: <span className="text-red-400">{q.f}</span>
                            </span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-zenith-accent hover:border-zenith-accent transition-all cursor-pointer">
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardPerspective>
            </motion.div>

            <motion.div variants={itemVariants}>
              <CardPerspective>
                <div className="bg-zenith-surface/60 rounded-3xl border border-white/5 p-10 backdrop-blur-3xl relative overflow-hidden h-full">
                  <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50" />
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-green-400/10 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                      <Cpu size={24} />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight">
                      {locale === 'zh-TW' ? '節點健康監控' : 'Node Health'}
                    </h3>
                  </div>
                  <div className="space-y-6 bg-black/40 rounded-2xl p-8 border border-white/5">
                    <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center mb-6">
                        <div className="text-xs font-mono text-gray-300">ZENITH_NODE_01</div>
                        <span className="text-[10px] px-3 py-1 bg-green-400/10 text-green-400 rounded-full font-black uppercase border border-green-400/20">
                          Operational
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] text-gray-500 uppercase font-black">
                            CPU Load <span>45%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-zenith-accent" style={{ width: '45%' }} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] text-gray-500 uppercase font-black">
                            Memory <span>62%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400" style={{ width: '62%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardPerspective>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Code Snippet Section - IDE Style */}
      <section className="py-32 border-t border-white/5 relative overflow-hidden bg-black/20">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-zenith-accent/5 blur-[120px] rounded-full -translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-24">
            <div className="flex-1">
              <h2 className="text-5xl font-black mb-8 tracking-tighter leading-[0.9]">
                {trans('integration.title')}
              </h2>
              <p className="text-gray-400 mb-12 text-lg leading-relaxed font-medium">
                {trans('integration.description')}
              </p>

              <div className="grid sm:grid-cols-2 gap-y-6 gap-x-8">
                <ListItem text={trans('integration.features.autoDiscovery')} />
                <ListItem text={trans('integration.features.sqliteSupport')} />
                <ListItem text={trans('integration.features.workerHealth')} />
                <ListItem text={trans('integration.features.logArchiving')} />
                <ListItem text={trans('integration.features.batchActions')} />
                <ListItem text={trans('integration.features.hybridSearch')} />
              </div>
            </div>

            <div className="flex-1 w-full relative group">
              <div className="absolute -inset-4 bg-zenith-accent/20 blur-[60px] rounded-[3rem] opacity-0 group-hover:opacity-30 transition-all duration-1000" />
              <div className="relative bg-[#05050A] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                {/* IDE Header */}
                <div className="bg-white/[0.03] px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20" />
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
                    src/index.ts
                  </div>
                  <div className="w-10" />
                </div>
                <div className="p-10 font-mono text-sm md:text-base leading-loose overflow-x-auto">
                  <pre className="text-gray-300">
                    <code>
                      <div className="line">
                        <span className="text-purple-400">import</span> {'{'} Photon {'}'}{' '}
                        <span className="text-purple-400">from</span>{' '}
                        <span className="text-zenith-accent">'@gravito/photon'</span>
                      </div>
                      <div className="line">
                        <span className="text-purple-400">import</span> zenith{' '}
                        <span className="text-purple-400">from</span>{' '}
                        <span className="text-zenith-accent">'@gravito/zenith/server'</span>
                      </div>
                      <div className="line h-4"></div>
                      <div className="line">
                        <span className="text-gray-600">{'// Existing Photon application'}</span>
                      </div>
                      <div className="line">
                        <span className="text-blue-400">const</span> app ={' '}
                        <span className="text-purple-400">new</span> Photon()
                      </div>
                      <div className="line h-4"></div>
                      <div className="line">
                        <span className="text-gray-600">{'// Mount Zenith as an API route'}</span>
                      </div>
                      <div className="line">
                        app.route(<span className="text-green-400">"/admin/zenith"</span>, zenith)
                      </div>
                      <div className="line h-4"></div>
                      <div className="line text-zenith-accent font-bold">
                        <span className="text-gray-600 font-normal">
                          {'// Or run standalone: '}
                        </span>
                        bun zenith start
                      </div>
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function BentoSkeleton({ type }: { type: 'graph' | 'stats' | 'search' | 'nodes' }) {
  if (type === 'graph') {
    return (
      <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-2xl bg-gradient-to-br from-zenith-accent/10 to-transparent p-4 border border-white/5 overflow-hidden">
        <div className="flex flex-col gap-2 w-full h-full">
          <div className="flex items-end gap-1 flex-1">
            {[0.2, 0.5, 0.3, 0.8, 0.4, 0.9, 0.6].map((h, i) => (
              <motion.div
                key={`bar-${i + 1}`}
                className="flex-1 bg-zenith-accent/20 rounded-t-sm"
                initial={{ height: 0 }}
                animate={{ height: `${h * 100}%` }}
                transition={{
                  duration: 1,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              />
            ))}
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full" />
        </div>
      </div>
    )
  }
  if (type === 'stats') {
    return (
      <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-2xl bg-black/20 p-4 border border-white/5 justify-center items-center">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90">
            <title>Loading Progress</title>
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-white/5"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-zenith-accent"
              strokeDasharray="226"
              initial={{ strokeDashoffset: 226 }}
              animate={{ strokeDashoffset: 226 * 0.25 }}
              transition={{ duration: 2 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-zenith-accent">
            75%
          </div>
        </div>
      </div>
    )
  }
  if (type === 'search') {
    return (
      <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-2xl bg-black/40 p-4 border border-white/5 flex-col gap-3 overflow-hidden group">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
          <Search size={12} className="text-gray-500" />
          <div className="text-[10px] text-gray-500 font-mono">search: "failed_jobs"</div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={`search-item-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
              className="h-4 bg-white/[0.02] border-l-2 border-zenith-pulse rounded-r-sm flex items-center px-2"
            >
              <div className="w-full h-[2px] bg-white/5" />
            </motion.div>
          ))}
        </div>
      </div>
    )
  }
  if (type === 'nodes') {
    return (
      <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-2xl bg-gradient-to-br from-red-500/5 to-transparent p-4 border border-white/5 items-center justify-center relative overflow-hidden">
        <div className="grid grid-cols-4 gap-2 relative z-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <motion.div
              key={`node-${i}`}
              animate={{
                backgroundColor:
                  i === 3 || i === 6
                    ? ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0.1)']
                    : 'rgba(255, 255, 255, 0.03)',
                boxShadow:
                  i === 3 || i === 6 ? ['0 0 0px red', '0 0 10px red', '0 0 0px red'] : 'none',
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
              className="w-10 h-10 rounded-lg border border-white/5 flex items-center justify-center"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${i === 3 || i === 6 ? 'bg-red-500' : 'bg-white/10'}`}
              />
            </motion.div>
          ))}
        </div>
        {/* Connection Lines simulation */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full">
            <title>Node Connections</title>
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeDasharray="4 4" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeDasharray="4 4" />
          </svg>
        </div>
      </div>
    )
  }
  return <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-2xl bg-white/[0.03]" />
}

function CardPerspective({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [rotate, setRotate] = React.useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) {
      return
    }
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientY - rect.top) / rect.height
    const y = (e.clientX - rect.left) / rect.width
    setRotate({ x: (x - 0.5) * 10, y: (y - 0.5) * -10 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setRotate({ x: 0, y: 0 })}
      animate={{ rotateX: rotate.x, rotateY: rotate.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="perspective-1000 h-full"
    >
      {children}
    </motion.div>
  )
}

function ListItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 text-gray-400 group/list">
      <div className="w-6 h-6 rounded-full bg-zenith-accent/10 flex items-center justify-center text-zenith-accent group-hover/list:bg-zenith-accent group-hover/list:text-black transition-all">
        <ShieldCheck size={12} />
      </div>
      <span className="text-sm font-bold group-hover/list:text-white transition-colors">
        {text}
      </span>
    </div>
  )
}
