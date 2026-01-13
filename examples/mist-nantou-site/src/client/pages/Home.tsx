import React from 'react';
import CraftSection from '../components/CraftSection';
import HeroSection from '../components/HeroSection';
import ShopSection from '../components/ShopSection';

const Home = () => {
  return (
    <main className="bg-paper-white min-h-screen selection:bg-fir-green selection:text-paper-white cursor-none">
      {/* Section 1: The Origin */}
      <HeroSection />
      
      {/* Section 2: The Craft */}
      <CraftSection />
      
      {/* Section 3: The Shop */}
      <ShopSection />

      {/* Footer */}
      <footer className="bg-ink-black py-24 px-8 text-paper-white/60 text-center">
        <p className="font-display text-2xl mb-8 text-paper-white">雲霧南投</p>
        <div className="flex justify-center gap-8 text-xs font-sans tracking-widest uppercase mb-12">
          <a href="#" className="hover:text-white transition-colors">Instagram</a>
          <a href="#" className="hover:text-white transition-colors">Facebook</a>
          <a href="#" className="hover:text-white transition-colors">Line</a>
        </div>
        <p className="text-[10px] tracking-widest opacity-40">© 2024 MIST NANTOU. ALL RIGHTS RESERVED.</p>
      </footer>
    </main>
  );
};

export default Home;
