import { motion, useScroll, useTransform } from 'framer-motion';
import React, { useRef } from 'react';

const stats = [
  { label: '海拔高度', value: '1200', unit: 'm', desc: '雲霧帶的最佳高度' },
  { label: '年均濕度', value: '85', unit: '%', desc: '滋潤葉片的天然保濕' },
  { label: '土壤酸鹼', value: '4.5', unit: 'pH', desc: '紅土礫石層的微酸性' },
  { label: '樹齡平均', value: '25', unit: 'yrs', desc: '正值壯年的老茶樹' },
];

const timeline = [
  { year: '1984', title: '開墾', desc: '林阿公在南投深山種下第一株青心烏龍。那一年，還是手提肩挑的年代。' },
  { year: '1992', title: '獲獎', desc: '首次參加鹿谷鄉農會比賽茶，即獲得頭等獎殊榮，奠定製茶工藝基礎。' },
  { year: '2005', title: '轉型', desc: '堅持自然農法，停止使用化學除草劑，讓土地休養生息，茶園開始出現螢火蟲。' },
  { year: '2024', title: '新生', desc: '第三代返鄉接手，創立「雲霧南投」品牌，將傳統茶藝與現代美學結合。' },
];

const About = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div ref={containerRef} className="min-h-screen bg-ink-black text-paper-white relative selection:bg-paper-white selection:text-ink-black">
      {/* Hero */}
      <section className="h-screen w-full flex items-center justify-center relative overflow-hidden">
        <motion.div 
          style={{ y }}
          className="absolute inset-0 opacity-40 bg-cover bg-center grayscale"
          // Hero: Close up of weathered hands holding tea or soil
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1589362372727-44c33745098e?q=80&w=2000&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-black via-transparent to-black/50" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="relative z-10 text-center"
        >
          <h1 className="text-8xl md:text-[12rem] font-display mb-8 text-paper-white mix-blend-overlay opacity-90">職人誌</h1>
          <p className="font-sans tracking-[0.5em] opacity-60 uppercase text-sm border-t border-white/20 pt-8 inline-block">The Artisans & The Land</p>
        </motion.div>
      </section>

      {/* Philosophy */}
      <section className="py-48 px-8 max-w-4xl mx-auto text-center">
        <span className="text-cinnabar font-display text-3xl mb-12 block">初心</span>
        <p className="font-body text-2xl md:text-4xl leading-loose font-light text-white/90">
          我們相信，現代農業不應是工業化的複製，<br/>
          而是人與土地的深情對話。<br/>
          <span className="text-white/40">在雲霧繚繞的南投山區，我們試圖找回</span><br/>
          <span className="text-white/40">那份逐漸遺失的，對自然的敬畏。</span>
        </p>
      </section>

      {/* Ecology Grid */}
      <section className="py-32 border-y border-white/5 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="group cursor-default">
              <div className="text-white/40 text-sm font-sans tracking-widest mb-4 group-hover:text-cinnabar transition-colors">{stat.label}</div>
              <div className="text-6xl font-display mb-4 flex justify-center items-baseline gap-2">
                {stat.value}
                <span className="text-xl font-sans text-white/20">{stat.unit}</span>
              </div>
              <div className="text-white/60 font-body text-sm">{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Artisan Stories */}
      <section className="max-w-7xl mx-auto px-8 py-48 grid grid-cols-1 md:grid-cols-12 gap-16">
        <div className="md:col-span-4 relative h-screen">
          <div className="sticky top-32">
            <h2 className="text-5xl font-display leading-relaxed writing-vertical-rl max-h-[80vh] ml-auto text-white/90">
              一輩子，只為做好<br/>
              這一杯茶。
            </h2>
          </div>
        </div>

        <div className="md:col-span-8 flex flex-col gap-48">
          {/* Grandpa Lin - Picker */}
          <div className="flex flex-col gap-8 group">
            <div className="aspect-[16/9] w-full bg-stone-800 relative overflow-hidden">
               {/* Image: Worker in misty field */}
               <div 
                 className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-1000 ease-out opacity-80"
                 style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523996767426-62da472d822d?q=80&w=1000&auto=format&fit=crop')" }}
               />
               <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
               <div className="absolute bottom-8 left-8 border border-white/20 px-6 py-3 font-display text-xl bg-black/30 backdrop-blur-md">製茶師 — 林阿公</div>
            </div>
            <p className="font-body text-xl leading-loose text-white/70 max-w-2xl">
              從十五歲開始採茶，林阿公的手指已經被茶汁染成了深褐色。他說，茶葉是有靈性的，你對它好，它就會回報你最好的香氣。每年的春茶採收季，他總是第一個到茶園，最後一個離開，檢查每一片葉子的生長狀況。
            </p>
          </div>

          {/* Master Zhang - Roaster */}
          <div className="flex flex-col gap-8 group">
            <div className="aspect-[16/9] w-full bg-stone-800 relative overflow-hidden">
               {/* Image: Charcoal/Fire texture */}
               <div 
                 className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-1000 ease-out opacity-80"
                 style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543255006-d6395b6f1171?q=80&w=1000&auto=format&fit=crop')" }}
               />
               <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
               <div className="absolute bottom-8 left-8 border border-white/20 px-6 py-3 font-display text-xl bg-black/30 backdrop-blur-md">焙茶師 — 張師傅</div>
            </div>
            <p className="font-body text-xl leading-loose text-white/70 max-w-2xl">
              「火候，是茶的靈魂。」張師傅專注於炭焙工藝三十年。他堅持使用龍眼木炭，連續四十八小時不眠不休地看顧爐火，只為逼出烏龍茶深層的熟果香。那種專注的眼神，彷彿在與火焰對話。
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-48 bg-white/5 relative">
        <div className="max-w-4xl mx-auto px-8 relative">
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />
          
          <div className="text-center mb-32 relative z-10">
            <h2 className="text-4xl font-display">歲月流轉</h2>
          </div>

          <div className="flex flex-col gap-24">
            {timeline.map((event, i) => (
              <div key={event.year} className={`flex flex-col md:flex-row gap-8 md:gap-24 relative ${i % 2 === 0 ? '' : 'md:flex-row-reverse'}`}>
                <div className="w-full md:w-1/2 text-left md:text-right">
                  <span className="text-6xl font-display text-white/10 absolute -top-8 left-0 md:left-auto md:right-0 z-0 select-none">{event.year}</span>
                  <h3 className="text-3xl font-display text-cinnabar relative z-10 mb-4">{event.title}</h3>
                </div>
                
                {/* Dot */}
                <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-ink-black border-2 border-white/50 rounded-full -translate-x-1/2 mt-2 z-20" />

                <div className="w-full md:w-1/2 pl-16 md:pl-0">
                  <p className="font-body text-white/60 leading-loose">{event.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;