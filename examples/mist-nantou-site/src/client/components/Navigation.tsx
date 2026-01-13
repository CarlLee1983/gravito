import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: '首頁', en: 'Home' },
  { path: '/about', label: '職人誌', en: 'Artisans' },
  { path: '/visit', label: '預約品茗', en: 'Visit' },
  { path: '/#shop', label: '韻味商城', en: 'Shop' },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close menu when route changes
  React.useEffect(() => {
    setIsOpen(false);
  }, [location]);

  return (
    <>
      {/* Fixed Header */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] p-8 flex justify-between items-center transition-colors duration-500 ${isOpen ? 'text-ink-black' : 'text-ink-black mix-blend-difference'}`}>
        <Link to="/" className="text-xs font-sans tracking-widest uppercase opacity-70 hover:opacity-100 transition-opacity">
          MIST NANTOU EST. 1984
        </Link>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="group relative w-12 h-12 flex items-center justify-center cursor-pointer"
        >
          <div className="relative w-8 h-5 flex flex-col justify-between items-end">
            <motion.span 
              animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 9 : 0 }}
              className="w-full h-[1px] bg-current origin-center transition-transform duration-300" 
            />
            <motion.span 
              animate={{ opacity: isOpen ? 0 : 1 }}
              className="w-2/3 h-[1px] bg-current transition-opacity duration-300 group-hover:w-full" 
            />
            <motion.span 
              animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? -9 : 0 }}
              className="w-full h-[1px] bg-current origin-center transition-transform duration-300" 
            />
          </div>
        </button>
      </nav>

      {/* Folding Fan Overlay Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ originX: 1 }}
            className="fixed inset-0 z-[90] bg-paper-white flex items-center justify-center overflow-hidden"
          >
            {/* Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.ai/noise.svg')]" />
            
            {/* Background Decor: Giant Ink Character */}
            <div className="absolute -left-24 top-1/2 -translate-y-1/2 text-[40vh] font-display text-ink-black/5 select-none pointer-events-none">
              茶
            </div>

            <div className="relative z-10 flex flex-col gap-8 w-full max-w-md px-8">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ delay: 0.3 + (i * 0.1), duration: 0.5 }}
                >
                  <Link 
                    to={item.path} 
                    className="group flex items-baseline justify-between border-b border-ink-black/10 pb-4 hover:border-cinnabar/50 transition-colors"
                  >
                    <span className="text-4xl font-display text-ink-black group-hover:text-cinnabar transition-colors duration-300">
                      {item.label}
                    </span>
                    <span className="text-sm font-sans tracking-widest text-ink-black/40 group-hover:text-cinnabar/60 transition-colors">
                      {item.en}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
