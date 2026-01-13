import { motion } from 'framer-motion';
import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-ink-black text-paper-white relative selection:bg-paper-white selection:text-ink-black">
      {/* Hero */}
      <section className="h-screen w-full flex items-center justify-center relative overflow-hidden">
        {/* Background Video/Image Placeholder */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1512418490979-92798cec1380?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center grayscale" />
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center"
        >
          <h1 className="text-6xl md:text-8xl font-display mb-8">職人誌</h1>
          <p className="font-sans tracking-[0.5em] opacity-60 uppercase text-sm">The Artisans</p>
        </motion.div>
      </section>

      {/* Content Grid */}
      <section className="max-w-7xl mx-auto px-8 py-32 grid grid-cols-1 md:grid-cols-12 gap-16">
        
        {/* Left Column: Vertical Text */}
        <div className="md:col-span-4 relative h-[200vh]">
          <div className="sticky top-32">
            <h2 className="text-4xl font-display leading-relaxed writing-vertical-rl max-h-[80vh] ml-auto">
              一輩子，只為做好<br/>
              這一杯茶。
            </h2>
          </div>
        </div>

        {/* Right Column: Stories */}
        <div className="md:col-span-8 flex flex-col gap-32">
          {/* Story 1 */}
          <div className="flex flex-col gap-8">
            <div className="aspect-[4/3] w-full bg-stone-800 relative overflow-hidden group">
               <div className="absolute inset-0 bg-stone-700/50 group-hover:scale-105 transition-transform duration-700 ease-out" />
               <div className="absolute bottom-8 left-8 border border-white/20 px-4 py-2 font-display">製茶師 — 林阿公</div>
            </div>
            <p className="font-body text-lg leading-loose text-white/80">
              從十五歲開始採茶，林阿公的手指已經被茶汁染成了深褐色。他說，茶葉是有靈性的，你對它好，它就會回報你最好的香氣。每年的春茶採收季，他總是第一個到茶園，最後一個離開。
            </p>
          </div>

          {/* Story 2 */}
          <div className="flex flex-col gap-8">
            <div className="aspect-[4/3] w-full bg-stone-800 relative overflow-hidden group">
               <div className="absolute inset-0 bg-stone-600/50 group-hover:scale-105 transition-transform duration-700 ease-out" />
               <div className="absolute bottom-8 left-8 border border-white/20 px-4 py-2 font-display">焙茶師 — 張師傅</div>
            </div>
            <p className="font-body text-lg leading-loose text-white/80">
              「火候，是茶的靈魂。」張師傅專注於炭焙工藝三十年。他堅持使用龍眼木炭，連續四十八小時不眠不休地看顧爐火，只為逼出烏龍茶深層的熟果香。
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-32 bg-paper-white text-ink-black flex items-center justify-center relative overflow-hidden">
        <div className="max-w-2xl text-center relative z-10">
          <span className="text-cinnabar font-display text-2xl mb-8 block">初心</span>
          <p className="font-body text-xl md:text-2xl leading-loose">
            我們相信，現代農業不應是工業化的複製，<br/>
            而是人與土地的深情對話。<br/>
            在雲霧繚繞的南投山區，我們試圖找回<br/>
            那份逐漸遺失的，對自然的敬畏。
          </p>
        </div>
        {/* Decor */}
        <div className="absolute top-0 left-0 text-[30vw] font-display text-ink-black/5 leading-none -translate-y-1/2">對話</div>
      </section>
    </div>
  );
};

export default About;
