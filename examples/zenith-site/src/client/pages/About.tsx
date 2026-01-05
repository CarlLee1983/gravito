import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import {
  Code,
  Compass,
  Cpu,
  Layers,
  Rocket,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { useTrans } from '../hooks/useTrans'

export default function About() {
  const { trans, locale } = useTrans()

  return (
    <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-void overflow-x-hidden font-sans">
      <Head title={`${trans('about.title')} ${trans('about.titleHighlight')} - Gravito Zenith`} />

      <Navbar />

      {/* Hero Section - The Nebula Origin */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-zenith-stellar/10 rounded-full blur-[150px] opacity-50" />
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-zenith-pulse/5 rounded-full blur-[120px]" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8">
              {trans('about.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenith-400 to-zenith-accent">
                {trans('about.titleHighlight')}
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-12">
              {trans('about.whatIsDescription1')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Origin Story Section */}
      <section className="py-24 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zenith-stellar/10 border border-zenith-stellar/20 text-zenith-stellar text-xs font-mono">
                <Rocket className="w-3 h-3" /> THE ORIGIN
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-white">{trans('about.story.title')}</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                {trans('about.story.content')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square lg:aspect-video rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden flex items-center justify-center p-8 shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zenith-stellar/10 to-transparent" />
              <div className="relative z-10 grid grid-cols-2 gap-4 w-full">
                <div className="aspect-square rounded-2xl bg-black/40 border border-white/10 p-4 flex flex-col justify-between group hover:border-zenith-stellar/40 transition-colors">
                  <Layers className="text-zenith-stellar w-8 h-8" />
                  <span className="text-xs font-mono text-gray-500">Cross-Language</span>
                </div>
                <div className="aspect-square rounded-2xl bg-black/40 border border-white/10 p-4 flex flex-col justify-between group hover:border-zenith-accent/40 transition-colors">
                  <Cpu className="text-zenith-accent w-8 h-8" />
                  <span className="text-xs font-mono text-gray-500">GPP Protocol</span>
                </div>
                <div className="aspect-square rounded-2xl bg-black/40 border border-white/10 p-4 flex flex-col justify-between group hover:border-blue-400/40 transition-colors">
                  <ShieldCheck className="text-blue-400 w-8 h-8" />
                  <span className="text-xs font-mono text-gray-500">Zero Leak</span>
                </div>
                <div className="aspect-square rounded-2xl bg-black/40 border border-white/10 p-4 flex flex-col justify-between group hover:border-green-400/40 transition-colors">
                  <Zap className="text-green-400 w-8 h-8" />
                  <span className="text-xs font-mono text-gray-500">Real-time</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-white/[0.01] border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zenith-accent/10 border border-zenith-accent/20 text-zenith-accent text-xs font-mono mb-6">
              <Compass className="w-3 h-3" /> PHILOSOPHY
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-8">{trans('about.philosophy.title')}</h2>
            <p className="text-gray-400 text-lg max-w-4xl mx-auto leading-relaxed">
              {trans('about.philosophy.content')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <SpecCard
              title={trans('about.backend')}
              items={[
                { label: locale === 'zh-TW' ? '運行時' : 'Runtime', value: 'Bun / Node.js' },
                { label: 'Framework', value: '@gravito/photon' },
                { label: 'Data Engine', value: '@gravito/stream' }
              ]}
            />
            <SpecCard
              title={trans('about.frontend')}
              items={[
                { label: 'Standard', value: 'React 19 / Vite' },
                { label: 'Styling', value: 'TailwindCSS' },
                { label: 'State', value: 'TanStack Query' }
              ]}
            />
            <SpecCard
              title={trans('about.deployment')}
              items={[
                { label: 'Architecture', value: 'Stateless / Redis' },
                { label: 'Audit DB', value: 'SQLite / MySQL' },
                { label: 'Transport', value: 'GPP Protocol' }
              ]}
            />
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[800px] h-[400px] bg-zenith-stellar/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-white/[0.03] to-transparent rounded-3xl border border-white/10 p-12 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-zenith-stellar to-zenith-accent" />

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Code className="text-zenith-stellar" />
                {trans('about.roadmap.title')}
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                {trans('about.roadmap.content')}
              </p>

              <div className="flex flex-wrap gap-4">
                {['Hyper-Scaling', 'AI-Diagnostics', 'Cross-Cloud', 'Unified Control'].map(tag => (
                  <span key={tag} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function SpecCard({ title, items }: { title: string, items: { label: string, value: string }[] }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
    >
      <h3 className="text-xl font-bold mb-6 text-white/90">{title}</h3>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.label} className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-xs text-gray-500 uppercase font-mono tracking-widest">{item.label}</span>
            <span className="text-sm text-gray-200 font-bold">{item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
