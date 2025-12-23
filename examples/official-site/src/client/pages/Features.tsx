import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { Activity, Code, Cpu, Layers, Share2, Shield, Terminal, Zap } from 'lucide-react'
import React from 'react'
import Layout from '../components/Layout'

type Translation = Record<string, Record<string, string>>

const FeatureHero = ({ t }: { t: Translation }) => (
  <section className="relative py-32 px-6 overflow-hidden">
    <div className="absolute inset-0 bg-void">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-singularity/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute inset-0 bg-hex-grid opacity-20" />
    </div>

    <div className="max-w-4xl mx-auto relative z-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="mb-8 inline-block"
      >
        <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative group">
          <div className="absolute inset-0 bg-singularity/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <Cpu size={64} className="text-singularity relative z-10" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="text-6xl md:text-8xl font-black italic tracking-tighter text-white mb-6 uppercase"
      >
        {t.features_page.hero_title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="text-xl text-gray-400 font-medium max-w-2xl mx-auto"
      >
        {t.features_page.hero_subtitle}
      </motion.p>
    </div>
  </section>
)

const CoreDetailSection = ({ t }: { t: Translation }) => {
  const points = [
    {
      icon: Zap,
      title: t.features_page.adv1_title,
      desc: t.features_page.adv1_desc,
      color: 'bg-blue-500/20 text-blue-400',
    },
    {
      icon: Share2,
      title: t.features_page.adv2_title,
      desc: t.features_page.adv2_desc,
      color: 'bg-purple-500/20 text-purple-400',
    },
    {
      icon: Activity,
      title: t.features_page.adv3_title,
      desc: t.features_page.adv3_desc,
      color: 'bg-cyan-500/20 text-cyan-400',
    },
    {
      icon: Layers,
      title: t.features_page.adv4_title,
      desc: t.features_page.adv4_desc,
      color: 'bg-emerald-500/20 text-emerald-400',
    },
  ]

  return (
    <section className="relative py-24 px-6 bg-void z-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white mb-8 uppercase">
              {t.features_page.core_deep_dive_title}
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed font-light">
              {t.features_page.core_deep_dive_desc}
            </p>

            <div className="mt-12 p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-singularity to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-4 mb-6">
                <Terminal size={24} className="text-singularity" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  PlanetCore Runtime
                </span>
              </div>
              <div className="font-mono text-sm space-y-2 text-gray-300">
                <div className="flex gap-4">
                  <span className="text-singularity opacity-50">01</span>
                  <span>import {'{ PlanetCore }'} from 'gravito-core'</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-singularity opacity-50">02</span>
                  <span>const app = new PlanetCore()</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-singularity opacity-50">03</span>
                  <span>{'// Pre-compiled optimized jump path'}</span>
                </div>
                <div className="flex gap-4 font-bold text-white">
                  <span className="text-singularity opacity-50">04</span>
                  <span>app.boot().then(() =&gt; console.log('Ready'))</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-6">
            {points.map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="p-8 rounded-[24px] bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.05] group"
              >
                <div className="flex items-start gap-6">
                  <div
                    className={`p-4 rounded-xl ${point.color} group-hover:scale-110 transition-transform`}
                  >
                    <point.icon size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{point.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{point.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 性能視覺化展示 */}
        <div className="relative p-1 rounded-[40px] bg-gradient-to-tr from-white/10 via-transparent to-white/10">
          <div className="bg-[#050505] rounded-[38px] p-12 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-10 blur-2xl">
              <Zap size={300} className="text-singularity" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
              <div className="flex-1">
                <h3 className="text-3xl font-black italic tracking-tighter text-white mb-4 uppercase">
                  {t.features_page.perf_title}
                </h3>
                <p className="text-gray-500 max-w-md">{t.features_page.perf_desc}</p>
              </div>

              <div className="flex gap-6 w-full md:w-auto">
                <div className="flex-1 md:w-40 p-6 rounded-3xl bg-panel/40 border border-white/5 text-center">
                  <div className="text-4xl font-black text-singularity mb-1">
                    0.08<span className="text-xs ml-1">ms</span>
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    {t.features_page.perf_latency}
                  </div>
                </div>
                <div className="flex-1 md:w-40 p-6 rounded-3xl bg-panel/40 border border-white/5 text-center">
                  <div className="text-4xl font-black text-purple-400 mb-1">
                    1.2<span className="text-xs ml-1">ms</span>
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    {t.features_page.perf_boot}
                  </div>
                </div>
                <div className="flex-1 md:w-40 p-6 rounded-3xl bg-panel/40 border border-white/5 text-center">
                  <div className="text-4xl font-black text-white mb-1">
                    0<span className="text-xs ml-1">kb</span>
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    {t.features_page.perf_deps}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const TechChoicesSection = ({ t }: { t: Translation }) => {
  return (
    <section className="relative py-32 px-6 bg-void border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white mb-4 uppercase">
            {t.features_page.choices_title}
          </h2>
          <div className="w-24 h-1 bg-singularity mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Why Bun */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-10 rounded-[40px] bg-panel/20 border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-singularity/5 rounded-full blur-3xl group-hover:bg-singularity/10 transition-colors" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#FBF0DF] flex items-center justify-center p-3 shadow-xl">
                <img src="/static/image/bun.svg" alt="Bun Logo" className="w-full h-full" />
              </div>
              <h3 className="text-2xl font-bold text-white leading-tight">
                {t.features_page.bun_title}
              </h3>
            </div>
            <p className="text-gray-400 leading-relaxed font-light text-lg">
              {t.features_page.bun_desc}
            </p>
          </motion.div>

          {/* Why TS */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-10 rounded-[40px] bg-panel/20 border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#3178C6] flex items-center justify-center p-3 shadow-xl">
                <img src="/static/image/ts.svg" alt="TypeScript Logo" className="w-full h-full" />
              </div>
              <h3 className="text-2xl font-bold text-white leading-tight">
                {t.features_page.ts_title}
              </h3>
            </div>
            <p className="text-gray-400 leading-relaxed font-light text-lg">
              {t.features_page.ts_desc}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default function Features({ t, locale }: { t: Translation; locale: string }) {
  return (
    <Layout>
      <Head>
        <title>{`${t.nav.features} | ${t.site.title}`}</title>
      </Head>
      <FeatureHero t={t} />
      <CoreDetailSection t={t} />
      <TechChoicesSection t={t} />

      {/* 底部導引 */}
      <section className="py-32 px-6 text-center bg-void border-t border-white/5">
        <h2 className="text-3xl font-bold text-white mb-8">{t.features_page.ready_title}</h2>
        <a
          href={locale === 'zh' ? '/zh/docs' : '/docs'}
          className="px-10 py-4 bg-white text-black font-black italic rounded-full hover:scale-105 active:scale-95 transition-all inline-block"
        >
          {t.features.getStarted}
        </a>
      </section>
    </Layout>
  )
}
