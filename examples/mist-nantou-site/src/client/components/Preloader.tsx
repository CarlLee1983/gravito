import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const Preloader = () => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 2500) // 2.5s Intro
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }} // Fade out container
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent pointer-events-none"
    >
      {/* The Ink Curtain */}
      <motion.div
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 1.5, delay: 1.5, ease: [0.76, 0, 0.24, 1] }}
        style={{ originY: 0 }} // Shrink to top
        className="absolute inset-0 bg-ink-black z-0"
      />

      {/* The Text */}
      <div className="relative z-10 overflow-hidden">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="text-paper-white font-display text-6xl md:text-9xl tracking-widest vertical-rl"
        >
          雲霧
        </motion.div>
      </div>
    </motion.div>
  )
}

export default Preloader
