import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import CraftSection from '../components/CraftSection';
import HeroSection from '../components/HeroSection';
import ShopSection from '../components/ShopSection';

const VisitTeaser = () => {
  return (
    <section className="relative py-32 bg-fir-green text-paper-white overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.ai/noise.svg')]" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10 px-8">
        <span className="font-sans text-xs tracking-[0.5em] text-white/40 uppercase mb-8 block">Visit Us</span>
        <h2 className="text-5xl md:text-7xl font-display mb-12">山中無甲子<br/>寒盡不知年</h2>
        <p className="font-body text-lg text-white/70 leading-loose mb-16">
          我們邀請您親臨南投茶園，<br/>
          在雲霧繚繞中，品一杯最純粹的台灣茶。
        </p>
        
        <Link to="/visit" className="inline-flex items-center gap-4 px-12 py-5 border border-white/30 text-white font-sans tracking-[0.2em] hover:bg-white hover:text-fir-green transition-all duration-500 uppercase">
          <MapPin className="w-4 h-4" />
          <span>預約品茗</span>
        </Link>
      </div>
    </section>
  );
};

const Home = () => {
  return (
    <main className="bg-paper-white min-h-screen selection:bg-fir-green selection:text-paper-white cursor-none">
      {/* Section 1: The Origin */}
      <HeroSection />
      
      {/* Section 2: The Craft */}
      <CraftSection />
      
      {/* Section 3: The Shop */}
      <ShopSection />

      {/* Section 4: Visit Teaser (New) */}
      <VisitTeaser />

      {/* Footer */}
      <footer className="bg-ink-black py-24 px-8 text-paper-white/60 text-center border-t border-white/10">
        <p className="font-display text-3xl mb-12 text-paper-white">雲霧南投</p>
        
        {/* Site Map (New) */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-sm font-sans tracking-widest uppercase mb-16">
          <Link to="/" className="hover:text-white transition-colors">首頁</Link>
          <Link to="/about" className="hover:text-white transition-colors">職人誌</Link>
          <Link to="/visit" className="hover:text-white transition-colors">預約品茗</Link>
          <Link to="/#shop" className="hover:text-white transition-colors">線上商城</Link>
        </div>

        {/* Socials */}
        <div className="flex justify-center gap-8 text-xs font-sans tracking-widest uppercase mb-12 opacity-50">
          <a href="#" className="hover:text-white transition-colors">Instagram</a>
          <a href="#" className="hover:text-white transition-colors">Facebook</a>
          <a href="#" className="hover:text-white transition-colors">Line</a>
        </div>
        
        <p className="text-[10px] tracking-widest opacity-30">© 2024 MIST NANTOU. ALL RIGHTS RESERVED.</p>
      </footer>
    </main>
  );
};

export default Home;