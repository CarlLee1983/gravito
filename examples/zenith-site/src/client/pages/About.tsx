import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { Code, Compass, Rocket } from 'lucide-react'
import React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { useTrans } from '../hooks/useTrans'

export default function About() {
  const { trans, locale } = useTrans()

  return (
    <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-void overflow-x-hidden font-sans">
      <Head>
        <title>{`${trans('about.title')} ${trans('about.titleHighlight')} - Gravito Zenith`}</title>
        <meta name="description" content={trans('about.whatIsDescription1')} />
      </Head>
      <Navbar />

      {/* Immersive Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Multi-layered Background Visuals */}
        <div className="absolute inset-0 z-0">
          {/* Nebula Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[1000px] bg-zenith-500/10 rounded-full blur-[180px] opacity-60 animate-pulse" />
          <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-zenith-pulse/5 rounded-full blur-[140px]" />

          {/* Mesh Grid & Static Noise */}
          <div className="absolute inset-0 bg-grid-zenith opacity-20" />
          <div
            className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}
          />

          {/* HUD Scanline */}
          <div className="absolute inset-x-0 h-[500px] bg-gradient-to-b from-transparent via-zenith-accent/5 to-transparent opacity-20 animate-scanline pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zenith-accent/10 border border-zenith-accent/20 text-zenith-accent text-xs font-mono mb-8 tracking-[0.2em] uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zenith-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zenith-accent"></span>
              </span>
              MISSION_DIRECTIVE: OBSERVABILITY
            </div>
            <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter mb-8 leading-tight">
              {trans('about.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenith-400 via-zenith-accent to-zenith-stellar text-glow">
                {trans('about.titleHighlight')}
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
              {trans('about.whatIsDescription1')}
            </p>
          </motion.div>
        </div>

        {/* Bottom HUD Detail */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-20 text-[10px] font-mono text-white/20 tracking-widest uppercase pointer-events-none">
          <div className="flex flex-col gap-1">
            <span>ALT_REF: CELESTIAL_PEAK</span>
            <div className="w-32 h-px bg-current" />
          </div>
          <div className="flex flex-col gap-1 text-center">
            <span>STABLE_RECON: 100%</span>
            <div className="w-32 h-px bg-current" />
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span>OS_INT: ZENITH_CORE</span>
            <div className="w-32 h-px bg-current" />
          </div>
        </div>
      </section>

      {/* Narrative Sections with Depth */}
      <div className="relative z-10 space-y-32 py-32">
        <AboutSection
          tag="THE_STORY"
          title={trans('about.story.title')}
          content={trans('about.story.content')}
          icon={<Rocket className="w-6 h-6" />}
          reverse={false}
        />

        <AboutSection
          tag="THE_PHILOSOPHY"
          title={trans('about.philosophy.title')}
          content={trans('about.philosophy.content')}
          icon={<Compass className="w-6 h-6" />}
          reverse={true}
        />

        <AboutSection
          tag="THE_BLUEPRINT"
          title={trans('about.roadmap.title')}
          content={trans('about.roadmap.content')}
          icon={<Code className="w-6 h-6" />}
          reverse={false}
        />
      </div>

      {/* Technical Specification Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.01] border-y border-white/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-3 gap-8">
            <SpecCard
              title={trans('about.backend')}
              items={[
                { label: locale === 'zh-TW' ? '運行時' : 'Runtime', value: 'Bun / Node.js' },
                { label: 'Framework', value: '@gravito/photon' },
                { label: 'Data Engine', value: '@gravito/stream' },
              ]}
            />
            <SpecCard
              title={trans('about.frontend')}
              items={[
                { label: 'Engine', value: 'React / Vite' },
                { label: 'Protocol', value: 'Inertia.js' },
                { label: 'Styling', value: 'Tailwind CSS' },
              ]}
            />
            <SpecCard
              title={trans('about.deployment')}
              items={[
                { label: 'Native', value: 'Docker / K8s' },
                { label: 'Strategy', value: 'Zero-Config' },
                { label: 'CI/CD', value: 'GitHub Actions' },
              ]}
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function AboutSection({
  tag,
  title,
  content,
  icon,
  reverse,
}: {
  tag: string
  title: string
  content: string
  icon: React.ReactNode
  reverse?: boolean
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-20`}
      >
        <motion.div
          initial={{ opacity: 0, x: reverse ? 40 : -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex-1 space-y-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zenith-accent/10 flex items-center justify-center text-zenith-accent zenith-glass">
              {icon}
            </div>
            <span className="text-xs font-mono text-white/30 tracking-[0.3em] uppercase">
              {tag}
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight">{title}</h2>
          <p className="text-gray-300 text-lg leading-relaxed font-light">{content}</p>
        </motion.div>
        <div className="flex-1 w-full flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative w-full aspect-square max-w-md"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-zenith-accent/20 to-transparent rounded-full blur-[80px]" />
            <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_20s_linear_infinite] opacity-20" />
            <div className="absolute inset-10 border border-zenith-accent/20 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-3xl zenith-glass-strong flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-700">
                {React.cloneElement(icon as React.ReactElement<any>, {
                  className: 'w-24 h-24 text-zenith-accent opacity-50',
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function SpecCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-8 rounded-3xl zenith-glass hover:border-zenith-accent/30 transition-all"
    >
      <h3 className="text-xl font-bold mb-6 text-white/90">{title}</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex justify-between items-center pb-2 border-b border-white/5"
          >
            <span className="text-xs text-gray-500 uppercase font-mono tracking-widest">
              {item.label}
            </span>
            <span className="text-sm text-gray-200 font-bold">{item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
