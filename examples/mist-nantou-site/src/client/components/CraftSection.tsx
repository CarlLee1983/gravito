import { motion, useScroll } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

const steps = [
  {
    id: '01',
    title: '萎凋',
    en: 'Wither',
    desc: '讓茶葉在陽光下呼吸，散發青草氣息，轉化為獨特的花果香。',
    color: 'from-green-300 to-green-500' // Fresh
  },
  {
    id: '02',
    title: '殺青',
    en: 'Kill-Green',
    desc: '高溫炒製，停止發酵，鎖住茶葉最鮮活的瞬間。',
    color: 'from-emerald-600 to-teal-800' // Heat/Darkening
  },
  {
    id: '03',
    title: '揉捻',
    en: 'Roll',
    desc: '破壞葉脈，讓茶汁附著於表面，塑造茶葉的捲曲姿態。',
    color: 'from-stone-700 to-ink-black' // Processed
  }
];

const CraftStep = ({ step, index, isEven }: { step: typeof steps[0], index: number, isEven: boolean }) => {
  return (
    <div className={`flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-32 ${isEven ? 'md:flex-row-reverse' : ''}`}>
      {/* Visual */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8 }}
        className="relative w-full md:w-1/2 aspect-square max-w-md"
      >
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} opacity-80 blur-2xl transform scale-90`} />
        <div className="relative w-full h-full rounded-full border border-ink-black/10 bg-paper-white/50 backdrop-blur-sm overflow-hidden flex items-center justify-center">
           <span className="text-9xl opacity-10 font-display">{step.id}</span>
        </div>
      </motion.div>

      {/* Text */}
      <motion.div 
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full md:w-1/2 text-center md:text-left"
      >
        <div className="flex items-baseline gap-4 mb-4 justify-center md:justify-start">
          <h3 className="text-4xl md:text-5xl font-display text-ink-black">{step.title}</h3>
          <span className="text-sm font-sans tracking-widest text-ink-black/40 uppercase">{step.en}</span>
        </div>
        <p className="font-body text-ink-black/70 leading-loose tracking-wide">
          {step.desc}
        </p>
      </motion.div>
    </div>
  );
};

const CraftSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"]
  });

  return (
    <section ref={ref} className="relative py-32 px-8 md:px-16 overflow-hidden bg-paper-white">
      {/* Flowing Line Background */}
      <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px h-full pointer-events-none">
        <svg className="h-full w-[200px] -translate-x-1/2 overflow-visible" preserveAspectRatio="none">
          <motion.path
            d="M 100 0 Q 150 200 100 400 T 100 800 T 100 1200" // Simplified curve
            fill="none"
            stroke="#D1D5DB"
            strokeWidth="1"
            className="opacity-30"
          />
          <motion.path
            d="M 100 0 Q 150 200 100 400 T 100 800 T 100 1200"
            fill="none"
            stroke="#1D3E35"
            strokeWidth="2"
            style={{ pathLength: scrollYProgress }}
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-32">
          <h2 className="text-sm font-sans tracking-[0.5em] text-cinnabar mb-4">THE CRAFT</h2>
          <h2 className="text-4xl font-display text-ink-black">製茶工藝</h2>
        </div>

        {steps.map((step, i) => (
          <CraftStep key={step.id} step={step} index={i} isEven={i % 2 !== 0} />
        ))}

        {/* CTA to About Page */}
        <div className="flex justify-center mt-24">
          <Link to="/about" className="group flex items-center gap-4 px-8 py-4 border border-ink-black/20 rounded-full hover:bg-ink-black hover:text-paper-white transition-all duration-500">
            <span className="font-display text-lg tracking-widest">閱讀職人故事</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CraftSection;