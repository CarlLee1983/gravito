import { Head, Link } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { ArrowRight, Cpu, Globe, Orbit, Repeat, Shield, Sparkles, Zap } from 'lucide-react'
import Layout from '../components/Layout'
import { useTrans } from '../hooks/useTrans'

export default function About() {
  const { trans } = useTrans()
  const heroEase: [number, number, number, number] = [0.16, 1, 0.3, 1]
  const gridCells = Array.from({ length: 36 }, (_, index) => ({ id: `grid-${index}` }))
  const energyDust = Array.from({ length: 4 }, (_, index) => ({ id: `dust-${index}`, index }))
  const driftFragments = Array.from({ length: 6 }, (_, index) => ({
    id: `fragment-${index}`,
    index,
  }))
  const pulseRings = Array.from({ length: 2 }, (_, index) => ({ id: `ring-${index}`, index }))
  const flowPackets = Array.from({ length: 5 }, (_, index) => ({ id: `packet-${index}`, index }))
  const driverNodes = Array.from({ length: 3 }, (_, index) => ({ id: `driver-${index}`, index }))
  const aiLines = Array.from({ length: 8 }, (_, index) => ({ id: `ai-line-${index}`, index }))

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: heroEase },
    },
  }

  const pillars = [
    {
      id: 'speed',
      icon: <Zap className="text-singularity" />,
      title: trans('about.pillar1_title', 'Unrivaled Speed'),
      desc: trans(
        'about.pillar1_desc',
        'By harnessing Bun and Hono, we eliminate the bloat of traditional Node.js stacks.'
      ),
    },
    {
      id: 'zen',
      icon: <Shield className="text-purple-500" />,
      title: trans('about.pillar2_title', 'Developer Zen'),
      desc: trans(
        'about.pillar2_desc',
        'Clean, Laravel-inspired syntax that makes backend development a joy, not a chore.'
      ),
    },
    {
      id: 'ai',
      icon: <Sparkles className="text-blue-400" />,
      title: trans('about.pillar3_title', 'AI Ready'),
      desc: trans(
        'about.pillar3_desc',
        'Designed with clean, structured code and CLI tools that are easily understood by AI agents.'
      ),
    },
  ]

  const teamHighlights = [
    { id: 'distributed', icon: <Globe size={18} />, text: 'Distributed Kernel Architecture' },
    { id: 'zero', icon: <Orbit size={18} />, text: 'Zero-Overhead Micro-Framework' },
    { id: 'ai', icon: <Zap size={18} />, text: 'Built for the Age of AI' },
  ]

  const architectureCards = [
    {
      id: 'kernel',
      title: trans('about.kernelTitle', 'PlanetCore (The Micro-Kernel)'),
      desc: trans(
        'about.kernelDesc',
        'An ultra-minimalist core that handles only the most critical lifecycles and I/O coordination.'
      ),
      icon: <div className="w-2 h-2 rounded-full bg-singularity" />,
    },
    {
      id: 'orbit',
      title: trans('about.orbitTitle', 'Functional Orbits'),
      desc: trans(
        'about.orbitDesc',
        'Features like Routing, Inertia, SEO, and Mail exist as "Orbits" that revolve around the core.'
      ),
      icon: <div className="w-2 h-2 bg-purple-500 rounded-sm" />,
    },
    {
      id: 'scale',
      title: trans('about.scaleTitle', 'Infinite Scalability'),
      desc: trans(
        'about.scaleDesc',
        'From a single-file API to a global enterprise system, the architecture adapts dynamically.'
      ),
      icon: <div className="w-3 h-[1px] bg-white/40 rotate-45" />,
    },
  ]

  const painPoints = [
    {
      id: 'pain-1',
      title: trans('about.pain1Title'),
      desc: trans('about.pain1Desc'),
      color: 'from-blue-500/10',
    },
    {
      id: 'pain-2',
      title: trans('about.pain2Title'),
      desc: trans('about.pain2Desc'),
      color: 'from-purple-500/10',
    },
    {
      id: 'pain-3',
      title: trans('about.pain3Title'),
      desc: trans('about.pain3Desc'),
      color: 'from-singularity/10',
    },
    {
      id: 'pain-4',
      title: trans('about.pain4Title'),
      desc: trans('about.pain4Desc'),
      color: 'from-emerald-500/10',
    },
  ]

  const dnaComparisons = [
    {
      id: 'frontend-first',
      label: 'The Frontend-First Gaps',
      title: 'Node/Bun Ecosystem',
      desc: trans('about.dnaNodeGaps'),
      status: 'Architecture Lite',
      color: 'text-orange-400',
    },
    {
      id: 'legacy',
      label: 'The Legacy Heavyweights',
      title: 'Traditional MVC',
      desc: trans('about.dnaLaravelGaps'),
      status: 'High Friction',
      color: 'text-red-400',
    },
    {
      id: 'gravito',
      label: 'The Future Singularity',
      title: 'Gravito Core',
      desc: trans('about.dnaGravitoAdv'),
      status: 'Enterprise Native',
      color: 'text-singularity',
      highlight: true,
    },
  ]

  const driverTags = ['Redis', 'Amazon SQS', 'RabbitMQ', 'Apache Kafka', 'BullMQ', 'Beanstalkd']

  const aiFeatures = [
    {
      id: 'patterns',
      title: trans('about.aiFeature1Title', 'Predictable Patterns'),
      desc: trans(
        'about.aiFeature1Desc',
        'Strict MVC and Service Layer patterns ensure AI agents understand and generate logic with precision.'
      ),
      icon: <Cpu size={24} className="text-singularity" />,
    },
    {
      id: 'cli',
      title: trans('about.aiFeature2Title', 'CLI-Driven Development'),
      desc: trans(
        'about.aiFeature2Desc',
        'Structured CLI outputs and scaffolding allow AI assistants to perform complex operations.'
      ),
      icon: <Shield size={24} className="text-purple-400" />,
    },
    {
      id: 'types',
      title: trans('about.aiFeature3Title', 'Zero-Ambiguity Types'),
      desc: trans(
        'about.aiFeature3Desc',
        'First-class TypeScript support eliminates AI "hallucinations" through clear code contracts.'
      ),
      icon: <Sparkles size={24} className="text-blue-400" />,
    },
  ]

  return (
    <Layout>
      <Head>
        <title>{`${trans('nav.about')} | ${trans('site.title')}`}</title>
        <meta name="description" content={trans('site.description')} />
        <meta name="keywords" content={trans('site.keywords')} />
      </Head>

      <div className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-singularity/10 via-transparent to-transparent blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Hero Section */}
          <section className="text-center mb-32">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-singularity text-[10px] font-black uppercase tracking-[0.3em] mb-8"
            >
              <Orbit size={12} className="animate-spin-slow" />
              <span>{trans('about.missionTitle', 'Our Mission')}</span>
            </motion.div>

            <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter text-white mb-4 leading-none">
              {trans('about.heroTitle', 'THE GRAVITATIONAL')}
              <br />
              <span className="inline-block pr-8 text-transparent bg-clip-text bg-gradient-to-r from-singularity via-purple-500 to-singularity bg-[length:200%_auto] animate-gradient-x">
                {trans('about.heroSubtitle', 'PULL OF INNOVATION')}
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed italic">
              "
              {trans(
                'about.missionDesc',
                "To provide a framework that respects the developer's time and the machine's resources."
              )}
              "
            </p>
          </section>

          {/* Pillars Section */}
          <section className="mb-40">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black italic tracking-tight text-white uppercase">
                {trans('about.pillarsTitle', 'The Singularity Pillars')}
              </h2>
              <div className="w-24 h-1 bg-singularity mx-auto mt-4 rounded-full" />
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {pillars.map((pillar) => (
                <motion.div
                  key={pillar.id}
                  variants={itemVariants}
                  className="group p-8 rounded-[32px] bg-white/[0.03] border border-white/5 backdrop-blur-xl relative overflow-hidden transition-all hover:bg-white/[0.05] hover:border-white/10"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-singularity/10 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 group-hover:bg-white/10 transition-all">
                    {pillar.icon}
                  </div>
                  <h3 className="text-xl font-black italic text-white mb-4 uppercase tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed font-medium">{pillar.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Vision / Team Section */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-singularity/20 to-purple-600/20 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="aspect-square rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-3xl p-12 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="grid grid-cols-6 h-full w-full">
                    {gridCells.map((cell) => (
                      <div key={cell.id} className="border-[0.5px] border-white/20" />
                    ))}
                  </div>
                </div>
                <Cpu
                  size={160}
                  className="text-white/10 group-hover:text-singularity/30 transition-all duration-700 group-hover:scale-110"
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-singularity/20 blur-3xl" />
              </div>
            </div>

            <div>
              <h2 className="text-5xl font-black italic tracking-tighter text-white mb-8 leading-tight">
                {trans('about.teamTitle', 'The Architects')}
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed font-medium mb-8">
                {trans(
                  'about.teamDesc',
                  'Gravito is built by craftsmen who believe that "good enough" is the enemy of the "exceptional".'
                )}
              </p>

              <div className="space-y-6">
                {teamHighlights.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 text-white/60 font-black italic uppercase tracking-widest text-xs"
                  >
                    <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-singularity">
                      {item.icon}
                    </span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <section className="mb-40 pt-20 border-t border-white/5">
            <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-20">
              <div className="max-w-2xl">
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="text-singularity font-black italic uppercase tracking-widest text-xs mb-4 block"
                >
                  {trans('about.architectureSubtitle', 'Micro-Kernel & Orbit System')}
                </motion.span>
                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none">
                  {trans('about.architectureTitle', 'The Celestial Architecture')}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Architecture Diagram (Visual) */}
              <div className="lg:col-span-12 xl:col-span-5 relative">
                <div className="aspect-square rounded-[40px] bg-void border border-white/10 relative overflow-hidden group">
                  {/* Orbital Rings */}
                  {/* Orbital Rings - Fixed to Absolute for true centering */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Outer Orbit: Unstable energy trail */}
                    <motion.div
                      animate={{
                        rotate: 360,
                        scale: [1, 1.05, 1],
                        opacity: [0.1, 0.2, 0.1],
                      }}
                      transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                      className="absolute w-[90%] h-[90%] border-[2px] border-white/10 rounded-full border-t-transparent border-l-transparent blur-[1px]"
                    />
                    {/* Middle Orbit: Chaotic particle ring */}
                    <motion.div
                      animate={{
                        rotate: -360,
                        skewX: [0, 5, 0],
                      }}
                      transition={{
                        rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
                        skewX: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
                      }}
                      className="absolute w-[70%] h-[70%] border border-dashed border-white/5 rounded-full"
                    >
                      {/* Floating Energy Dust on the ring */}
                      {energyDust.map((dust) => (
                        <motion.div
                          key={dust.id}
                          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
                          transition={{ duration: 3 + dust.index, repeat: Infinity }}
                          className="absolute w-1 h-1 bg-singularity rounded-full blur-sm"
                          style={{
                            top: `${50 + 40 * Math.cos(dust.index * 1.5)}%`,
                            left: `${50 + 40 * Math.sin(dust.index * 1.5)}%`,
                          }}
                        />
                      ))}
                    </motion.div>

                    {/* Inner Orbit: High-speed fluid ring */}
                    <motion.div
                      animate={{
                        rotate: 360,
                      }}
                      transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                      className="absolute w-[50%] h-[50%] border-2 border-white/5 rounded-full opacity-30 group-hover:border-singularity/20 transition-colors"
                      style={{
                        maskImage: 'conic-gradient(from 0deg, black, transparent)',
                        WebkitMaskImage: 'conic-gradient(from 0deg, black, transparent)',
                      }}
                    />

                    {/* Subtle Glow interaction for the entire field */}
                    <div className="absolute inset-0 bg-radial-at-center from-singularity/[0.03] to-transparent pointer-events-none" />

                    {/* The Core (PlanetCore Singularity) - Now with Organic Floating */}
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                        rotate: [0, 5, 0],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="relative z-20 flex items-center justify-center"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-32 h-32 rounded-full bg-void border border-white/10 flex items-center justify-center relative overflow-hidden group/core"
                      >
                        {/* Spinning Energy Nucleus */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                          className="absolute inset-0 bg-gradient-to-tr from-singularity/40 via-purple-600/30 to-transparent group-hover/core:opacity-80 transition-opacity"
                        />

                        {/* Chaos Nucleus - Replacing the sharp white point with misty energy */}
                        <div className="relative z-10 w-20 h-20 flex items-center justify-center">
                          {/* Central Singularity Nebula */}
                          <motion.div
                            animate={{
                              scale: [1, 1.4, 1],
                              opacity: [0.3, 0.6, 0.3],
                              rotate: [0, 360],
                            }}
                            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 bg-gradient-to-tr from-singularity/60 via-white/40 to-purple-600/60 blur-2xl rounded-full"
                          />

                          {/* Chaotic Drift Fragments */}
                          {driftFragments.map((fragment) => (
                            <motion.div
                              key={fragment.id}
                              animate={{
                                rotate: [0, 360],
                                x: [0, fragment.index % 2 === 0 ? 10 : -10, 0],
                                y: [0, fragment.index % 3 === 0 ? -10 : 10, 0],
                                scale: [1, 1.5, 1],
                                opacity: [0.2, 0.5, 0.2],
                              }}
                              transition={{
                                duration: 5 + fragment.index,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                              className="absolute w-1.5 h-1.5 bg-white blur-[1.5px] rounded-full"
                              style={{
                                left: `${25 + fragment.index * 12}%`,
                                top: `${30 + (fragment.index % 2) * 20}%`,
                              }}
                            />
                          ))}

                          {/* The Unstable Core Light */}
                          <motion.div
                            animate={{
                              scale: [1, 0.85, 1.15, 1],
                              opacity: [0.6, 1, 0.7, 0.6],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              times: [0, 0.4, 0.6, 1],
                            }}
                            className="w-5 h-5 bg-white/80 rounded-full blur-[3px] shadow-[0_0_30px_rgba(255,255,255,0.6)] relative z-20"
                          />
                        </div>

                        {/* Fluid Pulse Rings */}
                        {pulseRings.map((ring) => (
                          <motion.div
                            key={ring.id}
                            animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                            transition={{ duration: 3, repeat: Infinity, delay: ring.index * 1.5 }}
                            className="absolute inset-0 border border-singularity/40 rounded-full"
                          />
                        ))}
                      </motion.div>

                      {/* Deep Space Gravity Well */}
                      <div className="absolute -inset-16 bg-singularity/10 blur-[60px] -z-10 animate-pulse" />
                    </motion.div>

                    {/* Orbiting Orbits - Satellites */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute w-full h-full"
                    >
                      <div className="absolute top-[7.5%] left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl bg-panel border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-md">
                        <Globe size={18} className="text-singularity/60" />
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                      className="absolute w-[65%] h-[65%]"
                    >
                      <div className="absolute top-0 right-0 w-8 h-8 rounded-lg bg-panel border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-md">
                        <Zap size={14} className="text-purple-400" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Grid Overlay */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-hex-grid" />
                </div>
              </div>

              {/* Architecture Info Cards */}
              <div className="lg:col-span-12 xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                {architectureCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {card.icon}
                      <h4 className="text-sm font-black italic text-white uppercase tracking-wider">
                        {card.title}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">{card.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Pain-Point Driven Section */}
          <section className="mb-40 pt-20 border-t border-white/5">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-singularity font-black italic uppercase tracking-widest text-xs mb-4 block"
              >
                {trans('about.painSubtitle', 'Solving Enterprise Bottlenecks')}
              </motion.span>
              <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white uppercase leading-[0.85] mb-6">
                {trans('about.painTitle', 'Pain-Point Driven Evolution')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {painPoints.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className={`p-10 rounded-[40px] bg-gradient-to-br ${item.color} to-transparent border border-white/5 hover:border-white/10 transition-all flex flex-col h-full group`}
                >
                  <h4 className="text-xl font-black italic text-white uppercase tracking-tight mb-8 leading-tight h-16 group-hover:text-singularity transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                  <div className="mt-auto pt-8">
                    <div className="w-8 h-[1px] bg-white/10 group-hover:w-full transition-all duration-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Enterprise DNA Section */}
          <section className="mb-40 pt-20 border-t border-white/5">
            <div className="max-w-4xl mb-24">
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="text-singularity font-black italic uppercase tracking-widest text-xs mb-4 block"
              >
                {trans('about.dnaSubtitle', 'Beyond the Scripting Paradox')}
              </motion.span>
              <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white uppercase leading-[0.85] mb-8">
                {trans('about.dnaTitle', 'Native Enterprise Systems')}
              </h2>
            </div>

            {/* The Architecture Gap Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24 relative">
              {dnaComparisons.map((box, index) => (
                <motion.div
                  key={box.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-10 rounded-[40px] border ${box.highlight ? 'bg-white/[0.03] border-singularity/30 shadow-[0_0_50px_rgba(20,241,149,0.1)]' : 'bg-white/[0.01] border-white/5'} relative overflow-hidden group`}
                >
                  <div className="mb-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-2">
                      {box.label}
                    </span>
                    <h3 className="text-2xl font-black italic text-white uppercase tracking-tight">
                      {box.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10">
                    {box.desc}
                  </p>
                  <div
                    className={`mt-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest ${box.color}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full bg-current ${box.highlight ? 'animate-pulse' : ''}`}
                    />
                    {box.status}
                  </div>
                  {box.highlight && (
                    <div className="absolute top-0 right-0 p-8">
                      <Zap
                        size={20}
                        className="text-singularity opacity-20 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* System Depth Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Feature 1: Microservices */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="group relative p-12 rounded-[48px] bg-void border border-white/5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-singularity/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <h4 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-6 relative z-10 transition-colors group-hover:text-singularity">
                  {trans('about.featDecouplingTitle')}
                </h4>
                <p className="text-gray-500 font-medium leading-relaxed relative z-10">
                  {trans('about.featDecouplingDesc')}
                </p>
                <div className="mt-12 flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Shield size={20} className="text-white/40" />
                  </div>
                  <div className="h-px w-12 bg-white/10" />
                  <div className="w-12 h-12 rounded-2xl bg-singularity/10 border border-singularity/20 flex items-center justify-center">
                    <Globe size={20} className="text-singularity" />
                  </div>
                </div>
              </motion.div>

              {/* Feature 2: Plugins with Dual-Mode Visualization */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="group relative p-12 rounded-[48px] bg-void border border-white/5 overflow-hidden flex flex-col"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <h4 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-6 relative z-10 transition-colors group-hover:text-purple-400">
                  {trans('about.featPluginsTitle')}
                </h4>
                <p className="text-gray-500 font-medium leading-relaxed relative z-10 mb-10">
                  {trans('about.featPluginsDesc')}
                </p>

                {/* Plugin Mode Visualization Grid */}
                <div className="grid grid-cols-2 gap-4 relative z-10 mt-auto">
                  <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-all group/mode">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover/mode:scale-110 transition-transform">
                      <Zap size={14} className="text-purple-400" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-tighter block mb-1">
                      Instant Metamorphosis
                    </span>
                    <span className="text-[10px] text-gray-600 block leading-tight">
                      Zero-Config Service Transformation
                    </span>
                  </div>
                  <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all group/mode">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover/mode:scale-110 transition-transform">
                      <Shield size={14} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-tighter block mb-1">
                      Recursive Overrides
                    </span>
                    <span className="text-[10px] text-gray-600 block leading-tight">
                      Layered Logic & UI Evolution
                    </span>
                  </div>
                </div>

                <div className="mt-10 flex gap-2 relative z-10">
                  <div className="px-5 py-2 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Mini-Gravito Entities
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Universal Orbit Queue - Omni Driver Section */}
          <section className="mb-40 pt-20 border-t border-white/5 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="text-singularity font-black italic uppercase tracking-widest text-xs mb-4 block"
                >
                  Omni-Channel Infrastructure
                </motion.span>
                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none mb-8">
                  {trans('about.queueTitle', 'Universal Orbit Queue')}
                </h2>
                <p className="text-lg text-gray-400 font-medium leading-relaxed max-w-xl mb-12">
                  {trans('about.queueDesc')}
                </p>

                {/* Driver Tags/Marquee */}
                <div className="flex flex-wrap gap-3">
                  {driverTags.map((driver, index) => (
                    <motion.div
                      key={driver}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white uppercase tracking-widest hover:bg-singularity/10 hover:border-singularity/30 transition-all cursor-default"
                    >
                      {driver}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Universal Bridge Visual */}
              <div className="relative h-[400px] flex items-center justify-center">
                <div className="absolute inset-0 bg-radial-at-center from-singularity/5 to-transparent blur-3xl rounded-full" />

                {/* Horizontal Pipeline */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent relative">
                  {/* Flowing Packets */}
                  {flowPackets.map((packet) => (
                    <motion.div
                      key={packet.id}
                      animate={{
                        x: ['-10%', '110%'],
                        opacity: [0, 1, 1, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: packet.index * 0.6,
                        ease: 'linear',
                      }}
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-singularity rounded-full shadow-[0_0_15px_#14f195] blur-[1px]"
                    />
                  ))}
                </div>

                {/* Central Hub Node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-32 h-32 rounded-[32px] bg-void border border-singularity/40 flex items-center justify-center relative shadow-[0_0_40px_rgba(20,241,149,0.1)]"
                  >
                    <div className="absolute inset-0 bg-singularity/5 blur-xl rounded-[32px]" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-2 border border-dashed border-white/10 rounded-[24px]"
                    />
                    <Repeat size={40} className="text-singularity relative z-10" />
                  </motion.div>
                </div>

                {/* Driver Nodes (Orbiting icons) */}
                <div className="absolute inset-0">
                  {driverNodes.map((node) => (
                    <motion.div
                      key={node.id}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 15 + node.index * 5,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="absolute inset-0"
                    >
                      <div
                        className="absolute w-10 h-10 rounded-xl bg-panel border border-white/10 flex items-center justify-center backdrop-blur-md"
                        style={{
                          top: `${20 + node.index * 20}%`,
                          left: node.index % 2 === 0 ? '10%' : '85%',
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* AI-First Contract Section */}
          <section className="mb-40 pt-20 border-t border-white/5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="text-singularity font-black italic uppercase tracking-widest text-xs mb-4 block"
                >
                  {trans('about.aiSubtitle', 'Designed for Human-AI Synergy')}
                </motion.span>
                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none mb-12">
                  {trans('about.aiTitle', 'The AI-First Contract')}
                </h2>

                <div className="space-y-8">
                  {aiFeatures.map((feature, index) => (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-6 items-start group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="text-lg font-black italic text-white uppercase tracking-tight mb-2">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                          {feature.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Visual Interaction (AI Brain effect) */}
              <div className="relative aspect-square">
                <div className="absolute inset-0 bg-gradient-to-tr from-singularity/20 via-purple-500/10 to-transparent blur-3xl rounded-full" />
                <div className="w-full h-full rounded-[40px] border border-white/5 bg-panel/20 backdrop-blur-3xl p-1 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-hex-grid opacity-20" />

                  {/* Pulsing Core */}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-40 h-40 bg-singularity/20 rounded-full blur-3xl absolute -inset-10"
                    />
                    <Cpu size={80} className="text-white opacity-20" />
                  </div>

                  {aiLines.map((line) => (
                    <motion.div
                      key={line.id}
                      animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        opacity: [0, 0.5, 0],
                      }}
                      transition={{
                        duration: 4 + line.index,
                        repeat: Infinity,
                        delay: line.index * 0.5,
                      }}
                      className="absolute w-px h-16 bg-gradient-to-t from-transparent via-singularity/40 to-transparent"
                      style={{
                        left: `${15 + line.index * 10}%`,
                        top: `${20 + (line.index % 3) * 20}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Final Call to Action */}
          <section className="mb-40 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-singularity/10 via-purple-500/5 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative p-16 md:p-24 rounded-[64px] border border-white/10 bg-void overflow-hidden text-center">
              <div className="absolute inset-0 bg-hex-grid opacity-10" />
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="relative z-10"
              >
                <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase mb-6">
                  {trans('about.ctaTitle')}
                </h2>
                <p className="text-xl text-gray-500 font-medium mb-12 max-w-2xl mx-auto">
                  {trans('about.ctaSubtitle')}
                </p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/docs"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-singularity text-black font-black italic uppercase tracking-widest text-sm rounded-full shadow-[0_0_30px_rgba(20,241,149,0.3)] hover:shadow-[0_0_50px_rgba(20,241,149,0.5)] transition-all"
                  >
                    {trans('about.ctaButton')}
                    <ArrowRight size={20} />
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}
