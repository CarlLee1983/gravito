import { Head, Link } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import Layout from '../components/Layout'

interface ErrorProps {
  status: number
  message?: string
}

export default function ErrorPage({ status, message }: ErrorProps) {
  const title = status === 404 ? '404: Lost in Singularity' : `${status}: System Collapse`
  const description =
    status === 404
      ? "The coordinate you're looking for doesn't exist in this galaxy."
      : "Experimental gravity stabilizers have failed. We're working on it."
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: `particle-${index}`,
        x: Math.random() * 1000 - 500,
        y: Math.random() * 1000 - 500,
        opacity: Math.random(),
        drift: Math.random() * 50 - 25,
        duration: 10 + Math.random() * 20,
        left: Math.random() * 100,
        top: Math.random() * 100,
      })),
    []
  )

  return (
    <Layout>
      <Head title={title} />

      <div className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background Cosmic Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-singularity/10 blur-[120px] rounded-full" />
          <div
            className="absolute inset-0 opacity-[0.1]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Error Content */}
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-[12rem] md:text-[18rem] font-black italic tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 select-none">
              {status}
            </h1>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="-mt-8 md:-mt-12"
          >
            <h2 className="text-2xl md:text-4xl font-black italic tracking-tight text-white mb-6 uppercase">
              {message || description}
            </h2>

            <p className="text-gray-500 max-w-md mx-auto mb-10 font-medium">
              {status === 404
                ? "You've drifted too far from the gravitational core. Let's get you back to safety."
                : 'A singularity error has occurred in the core engine. Our engineers are investigating the distortion.'}
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-sm rounded-full transition-all hover:bg-singularity hover:text-white hover:scale-105 active:scale-95 group"
            >
              <span>Return to Core</span>
              <div className="w-1.5 h-1.5 rounded-full bg-black group-hover:bg-white transition-colors" />
            </Link>
          </motion.div>
        </div>

        {/* Floating Debris / Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                x: particle.x,
                y: particle.y,
                opacity: particle.opacity,
              }}
              animate={{
                y: [null, particle.drift],
                rotate: [0, 360],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
              }}
            />
          ))}
        </div>
      </div>
    </Layout>
  )
}
