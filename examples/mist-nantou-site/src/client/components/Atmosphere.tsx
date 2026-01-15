import { motion } from 'framer-motion'

const Atmosphere = () => {
  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden h-screen w-screen">
      {/* Fog Layer 1 (Slow, Large) */}
      <motion.div
        animate={{ x: ['-10%', '10%'] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-[0.4] mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Fog Layer 2 (Faster, Detail) */}
      <motion.div
        animate={{ x: ['5%', '-5%'], y: ['-5%', '5%'] }}
        transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        className="absolute top-0 left-0 w-full h-full opacity-[0.3] mix-blend-overlay"
      >
        {/* Procedural Noise mimicking mist grain */}
        <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.ai/noise.svg')] opacity-20 invert" />
      </motion.div>

      {/* Grain Texture (Film Look) */}
      <div className="fixed inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.ai/noise.svg')] pointer-events-none mix-blend-multiply" />
    </div>
  )
}

export default Atmosphere
