import { motion } from 'framer-motion'
import { StaticLink } from './StaticLink'

export default function Logo({ isZh = false }) {
  return (
    <StaticLink href={isZh ? '/zh' : '/'} className="flex items-center gap-3 group relative z-10">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-singularity to-purple-600 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center relative z-10 overflow-hidden"
        >
          <div className="w-4 h-4 rounded-full bg-void shadow-inner" />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-white/20 blur-sm"
          />
        </motion.div>
        {/* Logo Glow Ring */}
        <div className="absolute inset-0 bg-singularity/20 blur-xl rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="flex flex-col">
        <span className="text-white font-black text-xl tracking-tighter leading-none group-hover:text-singularity transition-colors">
          Gravito
        </span>
        <span className="text-[9px] font-bold tracking-[0.2em] text-gray-500 uppercase leading-tight">
          Gravito Engine
        </span>
      </div>
    </StaticLink>
  )
}
