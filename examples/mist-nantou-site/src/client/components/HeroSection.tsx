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
      {/* Background Layer: Mist/Mountain Placeholder */}
      <motion.div 
        style={{ scale: bgScale }}
        className="absolute inset-0 z-0"
      >
        {/* Abstract Mountain Shapes using CSS Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-slate-300 opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-teal-900/20 to-transparent blur-3xl transform translate-y-1/4" />
        <div className="absolute bottom-0 right-0 w-2/3 h-1/2 bg-ink-black/5 blur-[100px] rounded-full mix-blend-multiply" />
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply bg-[url('https://grainy-gradients.vercel.ai/noise.svg')]" />
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
          <h1 className="text-[12vh] md:text-[18vh] font-display leading-none text-ink-black select-none vertical-rl">
            雲霧
          </h1>
          <h1 className="text-[12vh] md:text-[18vh] font-display leading-none text-ink-black/80 select-none vertical-rl mt-32">
            南投
          </h1>
        </motion.div>

        {/* Floating Stamp (Red Accent) */}
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 1, duration: 0.5, type: "spring" }}
          className="absolute top-[20%] right-[15%] w-16 h-16 border-2 border-cinnabar text-cinnabar flex items-center justify-center font-display text-xl rounded-sm opacity-80 mix-blend-multiply"
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
          <p className="font-body text-ink-black/70 text-sm md:text-base leading-relaxed tracking-widest">
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
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-ink-black/30 to-ink-black/30" />
          <span className="text-[10px] font-sans tracking-widest text-ink-black/40 vertical-rl">SCROLL</span>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;