import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Scale } from 'lucide-react'
import type React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { useTrans } from '../hooks/useTrans'

export default function Terms() {
  const { trans } = useTrans()

  return (
    <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-void overflow-x-hidden font-sans">
      <Head>
        <title>{`${trans('terms.title')} - Gravito Zenith`}</title>
        <meta name="description" content="Terms of Service for Gravito Zenith. Reliable monitoring tools for modern infrastructure." />
      </Head>
      <Navbar />

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-[1000px] h-[600px] bg-zenith-stellar/5 rounded-full blur-[120px] -translate-y-1/2" />
          <div className="absolute inset-0 bg-grid-zenith opacity-10" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tighter mb-4 text-glow">
              {trans('terms.title')}
            </h1>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">
              {trans('terms.lastUpdated')}
            </p>
          </motion.div>

          <div className="space-y-12">
            <LegalSection
              icon={<Scale className="w-6 h-6 text-zenith-accent" />}
              title={trans('terms.section1.title')}
              content={trans('terms.section1.content')}
            />
            <LegalSection
              icon={<AlertTriangle className="w-6 h-6 text-yellow-500/80" />}
              title={trans('terms.section2.title')}
              content={trans('terms.section2.content')}
            />
            <LegalSection
              icon={<CheckCircle className="w-6 h-6 text-green-500/80" />}
              title={trans('terms.section3.title')}
              content={trans('terms.section3.content')}
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function LegalSection({
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
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="p-8 rounded-3xl zenith-glass border border-white/5 hover:border-white/10 transition-all"
    >
      <div className="flex items-start gap-6">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white/90">{title}</h2>
          <p className="text-gray-400 leading-relaxed font-light">{content}</p>
        </div>
      </div>
    </motion.div>
  )
}
