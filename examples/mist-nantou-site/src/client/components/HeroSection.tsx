import { motion, useScroll, useTransform } from 'framer-motion';
import React, { useRef } from 'react';

const HeroSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const textY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section ref={containerRef} className="relative h-screen w-full overflow-hidden bg-paper-white">
      {/* Background Layer: Real Imagery */}
      <motion.div 
        style={{ scale: bgScale }}
        className="absolute inset-0 z-0"
      >
        {/* Mountain/Mist Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506459225022-777f43e81332?q=80&w=2000&auto=format&fit=crop')" }}
        />
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-paper-white/30 via-paper-white/10 to-paper-white/80" />
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-multiply bg-[url('https://grainy-gradients.vercel.ai/noise.svg')]" />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col justify-center items-center">
        
        {/* Vertical Title */}
        <motion.div 
          style={{ y: textY, opacity: textOpacity }}
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="flex flex-row-reverse gap-8 items-start"
        >
          <h1 className="text-[12vh] md:text-[18vh] font-display leading-none text-ink-black select-none vertical-rl drop-shadow-2xl">
            雲霧
          </h1>
          <h1 className="text-[12vh] md:text-[18vh] font-display leading-none text-ink-black/80 select-none vertical-rl mt-32 drop-shadow-xl">
            南投
          </h1>
        </motion.div>

        {/* Floating Stamp (Red Accent) */}
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 1, duration: 0.5, type: "spring" }}
          className="absolute top-[20%] right-[15%] w-16 h-16 border-2 border-cinnabar text-cinnabar flex items-center justify-center font-display text-xl rounded-sm opacity-80 mix-blend-multiply bg-paper-white/50 backdrop-blur-sm"
        >
          極品
        </motion.div>

        {/* Bottom Description */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-8 md:left-16 max-w-xs"
        >
          <p className="font-body text-ink-black/80 font-medium text-sm md:text-base leading-relaxed tracking-widest drop-shadow-md">
            海拔一千兩百公尺的堅持<br />
            雲霧繚繞間的職人手藝
          </p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute bottom-12 right-8 md:right-16 flex flex-col items-center gap-2"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-ink-black/50 to-ink-black/80" />
          <span className="text-[10px] font-sans tracking-widest text-ink-black/60 vertical-rl font-bold">SCROLL</span>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
