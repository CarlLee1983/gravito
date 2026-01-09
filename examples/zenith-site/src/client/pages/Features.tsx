import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { Activity, Cpu, Database, Globe, HardDrive, Layers, Shield, Zap } from 'lucide-react'
import type React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { useTrans } from '../hooks/useTrans'

export default function Features() {
  const { trans, locale } = useTrans()

  return (
    <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-void overflow-x-hidden font-sans">
      <Head title={`${trans('nav.features')} - Gravito Zenith`} />
      <Navbar />

      {/* Immersive Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.08)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-grid-zenith opacity-20" />
          {/* Animated Glows */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-zenith-pulse/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-zenith-stellar/10 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zenith-accent/10 border border-zenith-accent/20 text-zenith-accent text-[10px] font-mono mb-8 tracking-[0.3em] uppercase">
              SYSTEM_SPEC_V1.4
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
              {trans('features_deep.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenith-400 via-zenith-accent to-zenith-stellar text-glow">
                {trans('features_deep.titleHighlight')}
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-light">
              {trans('features_deep.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Persistence Architecture Visualization */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12 mb-20">
            <div className="flex-1">
              <h2 className="text-4xl font-bold mb-6 tracking-tight">
                {trans('features_deep.persistence.title')}
              </h2>
              <p className="text-gray-300 text-lg font-light leading-relaxed">
                {trans('features_deep.persistence.description')}
              </p>
            </div>
            <div className="flex-none flex items-center gap-4 text-xs font-mono text-white/20">
              <div className="w-12 h-px bg-current" />
              DUAL_ENGINE_ACTIVE
              <div className="w-12 h-px bg-current" />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 relative">
            {/* Connecting Visual Line */}
            <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-px bg-gradient-to-r from-zenith-pulse/50 to-zenith-stellar/50 z-0" />

            <motion.div
              whileHover={{ y: -5, borderColor: 'rgba(0, 240, 255, 0.3)' }}
              className="p-10 rounded-[2.5rem] zenith-glass relative group overflow-hidden z-10"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-zenith-pulse/10 blur-[80px] rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className="w-16 h-16 rounded-2xl bg-zenith-pulse/10 flex items-center justify-center text-zenith-pulse mb-8 border border-zenith-pulse/20">
                <Layers size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">
                {trans('features_deep.persistence.redis.title')}
              </h3>
              <p className="text-gray-300 leading-relaxed font-light text-lg">
                {trans('features_deep.persistence.redis.content')}
              </p>
              <div className="mt-10 flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                    Mode
                  </span>
                  <span className="text-zenith-pulse font-bold">TRANSIENT</span>
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                    Latency
                  </span>
                  <span className="text-zenith-pulse font-bold">&lt; 0.5ms</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5, borderColor: 'rgba(168, 85, 247, 0.3)' }}
              className="p-10 rounded-[2.5rem] zenith-glass relative group overflow-hidden z-10"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-zenith-stellar/10 blur-[80px] rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className="w-16 h-16 rounded-2xl bg-zenith-stellar/10 flex items-center justify-center text-zenith-stellar mb-8 border border-zenith-stellar/20">
                <Database size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">
                {trans('features_deep.persistence.sql.title')}
              </h3>
              <p className="text-gray-300 leading-relaxed font-light text-lg">
                {trans('features_deep.persistence.sql.content')}
              </p>
              <div className="mt-10 flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                    Mode
                  </span>
                  <span className="text-zenith-stellar font-bold">PERSISTENT</span>
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                    Durability
                  </span>
                  <span className="text-zenith-stellar font-bold">100% ACID</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* GPP Protocol - Blueprint Style */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40 border-y border-white/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5 space-y-8">
              <div className="w-20 h-20 rounded-3xl bg-zenith-accent/10 flex items-center justify-center text-zenith-accent border border-zenith-accent/20">
                <Zap size={40} className="animate-pulse" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">
                {trans('features_deep.protocol.title')}
              </h2>
              <p className="text-gray-300 text-lg font-light leading-relaxed">
                {trans('features_deep.protocol.description')}
              </p>

              <div className="p-8 rounded-3xl bg-black/40 border border-white/10 zenith-glass font-mono">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] text-zenith-accent uppercase tracking-widest font-bold">
                    Protocol_Handshake
                  </span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-zenith-accent animate-ping" />
                    <div className="w-1 h-1 rounded-full bg-zenith-accent" />
                  </div>
                </div>
                <div className="space-y-3 text-[12px] text-gray-500">
                  <div className="flex justify-between">
                    <span>&gt; VERSION_REQUEST</span>
                    <span className="text-green-500">ACK_OK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>&gt; ENCRYPTION_INIT</span>
                    <span className="text-green-500">CIPHER_READY</span>
                  </div>
                  <div className="flex justify-between">
                    <span>&gt; STREAM_SYNC</span>
                    <span className="text-zenith-accent">LINKED_STABLE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
              <ProtocolFeature
                icon={<Zap className="w-6 h-6" />}
                title={trans('features_deep.protocol.feature1.title')}
                content={trans('features_deep.protocol.feature1.content')}
              />
              <ProtocolFeature
                icon={<Globe className="w-6 h-6" />}
                title={trans('features_deep.protocol.feature2.title')}
                content={trans('features_deep.protocol.feature2.content')}
              />
              <ProtocolFeature
                icon={<HardDrive className="w-6 h-6" />}
                title={trans('features_deep.protocol.feature3.title')}
                content={trans('features_deep.protocol.feature3.content')}
              />
              <ProtocolFeature
                icon={<Cpu className="w-6 h-6" />}
                title={locale === 'zh-TW' ? '超低開銷' : 'Ultra-Low Overhead'}
                content={
                  locale === 'zh-TW'
                    ? 'GPP 專為並發性能優化，確保監控本身不會成為系統的瓶頸。'
                    : 'GPP is optimized for concurrency, ensuring observability doesnt become a bottleneck.'
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Performance Metrics - High-Tech Dashboard */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="zenith-glass-strong rounded-[3rem] p-16 border border-white/10 relative overflow-hidden group">
            {/* Background HUD Scan */}
            <div className="absolute inset-0 bg-grid-zenith opacity-10" />
            <div className="absolute inset-x-0 h-px bg-zenith-accent/30 top-1/2 -translate-y-1/2 animate-scanline" />

            <div className="relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-sm font-mono tracking-[0.4em] uppercase text-white/30 mb-4">
                  System Performance Benchmarks
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-zenith-accent to-transparent mx-auto" />
              </div>

              <div className="grid md:grid-cols-3 gap-20">
                <MetricDisplay
                  value="< 0.1ms"
                  label={trans('features_deep.performance.latency')}
                  color="text-zenith-accent"
                  accent="bg-zenith-accent"
                />
                <MetricDisplay
                  value="50K+"
                  label={trans('features_deep.performance.throughput')}
                  color="text-green-400"
                  accent="bg-green-400"
                />
                <MetricDisplay
                  value="99.99%"
                  label={trans('features_deep.performance.reliability')}
                  color="text-zenith-stellar"
                  accent="bg-zenith-stellar"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function ProtocolFeature({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode
  title: string
  content: string
}) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      className="p-8 rounded-3xl zenith-glass group transition-all"
    >
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 mb-6 group-hover:text-zenith-accent group-hover:bg-zenith-accent/10 transition-all border border-white/5 group-hover:border-zenith-accent/20">
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-3 tracking-tight">{title}</h4>
      <p className="text-sm text-gray-300 leading-relaxed font-light">{content}</p>
    </motion.div>
  )
}

function MetricDisplay({
  value,
  label,
  color,
  accent,
}: {
  value: string
  label: string
  color: string
  accent: string
}) {
  return (
    <div className="text-center space-y-4">
      <div
        className={`text-5xl lg:text-7xl font-mono font-bold ${color} tracking-tighter text-glow mb-2`}
      >
        {value}
      </div>
      <div className="flex items-center justify-center gap-3">
        <div className={`w-1.5 h-1.5 rounded-full ${accent} animate-pulse`} />
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  )
}
