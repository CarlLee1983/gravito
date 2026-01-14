import { motion, useScroll } from 'framer-motion';
import { ArrowRight, Clock, Thermometer, Wind } from 'lucide-react';
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

const steps = [
  {
    id: '01',
    title: '採摘',
    en: 'Hand Picking',
    desc: '堅持人工手採，只取頂端最鮮嫩的一心二葉。清晨的露水未乾前不採，正午烈日當頭不採，唯有上午九點至十一點的陽光，能賦予茶葉最飽滿的生命力。',
    specs: { temp: '22-25°C', time: '09:00 AM', note: '一心二葉' },
    // Image: A person works in a lush green tea field (Verified)
    image: 'https://images.unsplash.com/photo-1743402810466-29a840f2c053?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: '02',
    title: '萎凋',
    en: 'Withering',
    desc: '將茶青平均攤灑於笳力上，讓陽光帶走部分水分。葉片因失水而變軟，細胞壁的通透性增加，潛藏的酶開始甦醒，散發出淡淡的青草香氣。',
    specs: { temp: 'Solar / Indoor', time: '2-4 Hours', note: '走水 15%' },
    // Image: Premium withering photo (Verified)
    image: 'https://plus.unsplash.com/premium_photo-1675011288741-f86047b7ef29?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: '03',
    title: '浪菁',
    en: 'Shaking',
    desc: '這是製茶師與茶葉的對話。透過雙手輕柔翻動，讓葉緣細胞摩擦破損，空氣進入葉片內部氧化，將原本的草氣轉化為迷人的花果香。',
    specs: { temp: 'Indoor 20°C', time: '8-12 Hours', note: '發酵關鍵' },
    // Image: Fresh leaves texture/Bamboo basket
    image: 'https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: '04',
    title: '殺青',
    en: 'Kill-Green',
    desc: '以三百度高溫瞬間破壞酵素活性，停止發酵過程。這決定了茶湯的底色與香氣的定格，是保留茶葉鮮活口感的關鍵時刻。',
    specs: { temp: '280-320°C', time: '5-8 Mins', note: '高溫固定' },
    // Image: Steam/Heat/Wok (Metaphor for high heat)
    image: 'https://images.unsplash.com/photo-1516919549054-e08258825f80?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: '05',
    title: '揉捻',
    en: 'Rolling',
    desc: '將茶葉放入揉捻機或手工團揉，破壞葉脈組織，讓茶汁附著於表面。這不僅塑造了茶葉緊結的外形，更決定了沖泡時滋味釋放的速度。',
    specs: { temp: 'Ambient', time: '20-40 Mins', note: '破壞細胞' },
    // Image: Texture of rolled/darker leaves or hands working
    image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: '06',
    title: '烘焙',
    en: 'Roasting',
    desc: '利用炭火或電焙籠的慢火烘烤，降低水分至 3% 以下。烘焙能修飾茶葉的苦澀，轉化為醇厚的熟香，賦予茶葉長時間存放的穩定性。',
    specs: { temp: '90-120°C', time: 'Multiple', note: '熟成轉化' },
    // Image: Charcoal Fire
    image: 'https://images.unsplash.com/photo-1517502474097-f9b30659dadb?q=80&w=1000&auto=format&fit=crop'
  }
];

const CraftStep = ({ step, index, isEven }: { step: typeof steps[0], index: number, isEven: boolean }) => {
  return (
    <div className={`flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-48 ${isEven ? 'md:flex-row-reverse' : ''}`}>
      {/* Visual */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8 }}
        className="relative w-full md:w-1/2 aspect-square max-w-md group"
      >
        <div 
          className="absolute inset-0 rounded-full opacity-40 blur-3xl transform scale-90 group-hover:scale-100 transition-transform duration-700" 
          style={{ backgroundImage: `url(${step.image})`, backgroundSize: 'cover' }}
        />
        <div className="relative w-full h-full rounded-full border border-ink-black/10 overflow-hidden flex items-center justify-center">
           <div 
             className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0"
             style={{ backgroundImage: `url(${step.image})` }}
           />
           <div className="absolute inset-0 bg-ink-black/10 mix-blend-multiply" />
           <span className="relative text-9xl opacity-30 font-display text-white z-10">{step.id}</span>
        </div>
      </motion.div>

      {/* Text & Specs */}
      <motion.div 
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full md:w-1/2 text-center md:text-left"
      >
        <div className="flex flex-col items-center md:items-start gap-4 mb-8">
          <div className="flex items-baseline gap-4">
            <h3 className="text-4xl md:text-6xl font-display text-ink-black">{step.title}</h3>
            <span className="text-sm font-sans tracking-widest text-cinnabar uppercase font-medium">{step.en}</span>
          </div>
          <div className="w-16 h-[1px] bg-ink-black/20" />
        </div>

        <p className="font-body text-ink-black/70 leading-loose tracking-wide text-lg mb-12 text-justify">
          {step.desc}
        </p>

        {/* Data Grid */}
        <div className="grid grid-cols-3 gap-4 border-t border-ink-black/10 pt-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center md:justify-start gap-2 text-ink-black/40">
              <Thermometer className="w-4 h-4" />
              <span className="text-xs font-sans uppercase tracking-widest">Temp</span>
            </div>
            <span className="font-display text-lg text-ink-black">{step.specs.temp}</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center md:justify-start gap-2 text-ink-black/40">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-sans uppercase tracking-widest">Time</span>
            </div>
            <span className="font-display text-lg text-ink-black">{step.specs.time}</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center md:justify-start gap-2 text-ink-black/40">
              <Wind className="w-4 h-4" />
              <span className="text-xs font-sans uppercase tracking-widest">Key</span>
            </div>
            <span className="font-display text-lg text-ink-black">{step.specs.note}</span>
          </div>
        </div>
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
    <section ref={ref} className="relative py-48 px-8 md:px-16 overflow-hidden bg-paper-white">
      {/* Flowing Line Background */}
      <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px h-full pointer-events-none">
        <svg className="h-full w-[200px] -translate-x-1/2 overflow-visible" preserveAspectRatio="none">
          <motion.path
            d="M 100 0 Q 150 200 100 400 T 100 800 T 100 1200 T 100 1600 T 100 2000 T 100 2400" 
            fill="none"
            stroke="#D1D5DB"
            strokeWidth="1"
            className="opacity-30"
          />
          <motion.path
            d="M 100 0 Q 150 200 100 400 T 100 800 T 100 1200 T 100 1600 T 100 2000 T 100 2400"
            fill="none"
            stroke="#1D3E35"
            strokeWidth="2"
            style={{ pathLength: scrollYProgress }}
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-48">
          <h2 className="text-sm font-sans tracking-[0.5em] text-cinnabar mb-4">THE PROCESS</h2>
          <h2 className="text-5xl md:text-7xl font-display text-ink-black mb-8">六步工藝</h2>
          <p className="font-body text-xl text-ink-black/50 leading-loose">
            從茶園到茶杯，這是一場與時間和溫度的賽跑。<br/>
            每一個步驟，都是對職人手藝的極致考驗。
          </p>
        </div>

        {steps.map((step, i) => (
          <CraftStep key={step.id} step={step} index={i} isEven={i % 2 !== 0} />
        ))}

        {/* CTA to About Page */}
        <div className="flex justify-center mt-32">
          <Link to="/about" className="group flex items-center gap-4 px-12 py-6 border border-ink-black/20 rounded-full hover:bg-ink-black hover:text-paper-white transition-all duration-500">
            <span className="font-display text-xl tracking-widest">閱讀職人故事</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CraftSection;
