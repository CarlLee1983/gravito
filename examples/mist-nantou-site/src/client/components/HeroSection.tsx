import { motion, useScroll, useTransform } from 'framer-motion';
import React, { useRef } from 'react';

const HeroSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax: Text moves faster than bg
  const textY = useTransform(scrollYProgress, [0, 1], [0, 400]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative h-screen w-full overflow-hidden bg-ink-black">
      
      {/* Background: Cinematic Parallax */}
      <motion.div 
        style={{ y: bgY }}
        className="absolute inset-0 z-0"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506459225022-777f43e81332?q=80&w=2500&auto=format&fit=crop')" }}
        />
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-black via-transparent to-ink-black/50" />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 h-full w-full flex flex-col justify-center items-center">
        
        {/* Giant Typography: The Soul */}
        <motion.div 
          style={{ y: textY, opacity }}
          className="relative mix-blend-overlay"
        >
          <div className="flex flex-row-reverse gap-8 md:gap-16">
            <h1 
              className="text-[25vw] leading-none font-display text-paper-white select-none vertical-rl opacity-90"
              style={{ textShadow: "0 0 40px rgba(255,255,255,0.3)" }}
            >
              雲霧
            </h1>
            <h1 
              className="text-[25vw] leading-none font-display text-paper-white select-none vertical-rl mt-48 opacity-80"
              style={{ textShadow: "0 0 40px rgba(255,255,255,0.3)" }}
            >
              南投
            </h1>
          </div>
        </motion.div>

        {/* Floating Stamp (Red Accent) - Absolute Position to break grid */}
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 2.2, duration: 0.5, type: "spring" }}
          className="absolute top-[15%] right-[10%] w-24 h-24 border-2 border-cinnabar/80 text-cinnabar flex items-center justify-center font-display text-3xl rounded-sm mix-blend-screen"
        >
          <div className="border border-cinnabar/50 w-[90%] h-[90%] flex items-center justify-center">
            極品
          </div>
        </motion.div>

        {/* Bottom Description: The Anchor */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-12 left-8 md:left-16 max-w-md z-20 mix-blend-difference"
        >
          <div className="w-12 h-[1px] bg-paper-white mb-6" />
          <p className="font-body text-paper-white text-lg md:text-xl leading-loose tracking-widest font-light">
            海拔一千兩百公尺的堅持<br />
            雲霧繚繞間的職人手藝
          </p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute bottom-12 right-8 md:right-16 flex flex-col items-center gap-4 z-20 mix-blend-difference"
        >
          <span className="text-xs font-sans tracking-[0.3em] text-paper-white vertical-rl">SCROLL</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-paper-white to-transparent" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;