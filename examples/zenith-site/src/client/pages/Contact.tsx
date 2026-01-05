import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { Github, Mail, MessageSquare } from 'lucide-react'
import React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { useTrans } from '../hooks/useTrans'

// Twitter/X Logo Component
function TwitterXIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function Contact() {
  const { trans } = useTrans()

  return (
    <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-void overflow-x-hidden font-sans">
      <Head title={`${trans('contact.title')} - Gravito Zenith`} />
      <Navbar />

      <section className="relative pt-32 pb-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-zenith-500/5 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-grid-zenith opacity-10" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-4 text-glow">
              {trans('contact.title')}
            </h1>
            <p className="text-xl text-zenith-400 font-light tracking-wide italic">
              {trans('contact.subtitle')}
            </p>
          </motion.div>

          {/* Info Section - Centered for Static Site */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-12"
          >
            <div className="max-w-2xl mx-auto">
              <p className="text-gray-300 text-lg leading-relaxed mb-12">
                {trans('contact.description')}
              </p>

              <div className="flex flex-col items-center gap-8">
                <a
                  href={`mailto:${trans('contact.email')}`}
                  className="inline-flex items-center gap-6 p-8 rounded-3xl zenith-glass-strong border border-zenith-accent/20 group hover:border-zenith-accent/40 hover:scale-[1.02] transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-zenith-accent/10 flex items-center justify-center text-zenith-accent group-hover:scale-110 transition-transform">
                    <Mail className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs text-gray-500 uppercase tracking-[0.2em] font-mono mb-1 block">
                      Direct Signal Channel
                    </span>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {trans('contact.email')}
                    </p>
                  </div>
                </a>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
                  <SocialLink
                    icon={<Github />}
                    label={trans('contact.socials.github')}
                    href="https://github.com/gravito-framework"
                  />
                  <SocialLink
                    icon={<TwitterXIcon />}
                    label={trans('contact.socials.twitter')}
                    href="https://x.com/Gravito_Core"
                  />
                  <SocialLink
                    icon={<MessageSquare />}
                    label={trans('contact.socials.discord')}
                    href="#"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function SocialLink({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 hover:y-[-4px] transition-all text-center group"
    >
      <div className="text-gray-400 group-hover:text-zenith-accent transition-colors">
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-8 h-8' })}
      </div>
      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold leading-tight">
        {label}
      </span>
    </a>
  )
}
