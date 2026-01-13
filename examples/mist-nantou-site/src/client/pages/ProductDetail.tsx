import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Droplets, Thermometer } from 'lucide-react';
import React from 'react';
import { Link, useParams } from 'react-router-dom';

const products = {
  1: {
    name: '高山烏龍',
    en: 'High Mountain Oolong',
    price: 'NT$ 1,200',
    desc: '來自海拔 2000 公尺的原始林區，雲霧繚繞孕育出的厚實果膠質感。',
    notes: '蘭花香 • 奶油感 • 甘甜',
    image: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?q=80&w=1000&auto=format&fit=crop',
    theme: 'text-amber-200'
  },
  2: {
    name: '金萱',
    en: 'Jin Xuan',
    price: 'NT$ 980',
    desc: '獨特的天然奶香與桂花氣息，口感滑順，是入門台灣茶的最佳選擇。',
    notes: '奶香 • 桂花 • 清爽',
    image: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?q=80&w=1000&auto=format&fit=crop',
    theme: 'text-lime-200'
  },
  3: {
    name: '紅玉',
    en: 'Ruby Black',
    price: 'NT$ 1,500',
    desc: '台灣野生山茶與緬甸大葉種的完美結合，帶有薄荷與肉桂的獨特收斂性。',
    notes: '薄荷 • 肉桂 • 麥芽',
    image: 'https://images.unsplash.com/photo-1563911892437-1feda0179e1b?q=80&w=1000&auto=format&fit=crop',
    theme: 'text-rose-200'
  },
  4: {
    name: '四季春',
    en: 'Four Seasons',
    price: 'NT$ 850',
    desc: '生命力強韌的品種，香氣高揚奔放，帶有明顯的梔子花香。',
    notes: '梔子花 • 鮮爽 • 高揚',
    image: 'https://images.unsplash.com/photo-1606312619070-d48b706521bf?q=80&w=1000&auto=format&fit=crop',
    theme: 'text-emerald-200'
  }
};

const ProductDetail = () => {
  const { id } = useParams();
  const product = products[id as unknown as keyof typeof products] || products[1];

  return (
    <div className="min-h-screen bg-ink-black text-paper-white relative selection:bg-paper-white selection:text-ink-black">
      {/* Back Button */}
      <Link to="/" className="fixed top-8 left-8 z-50 p-4 rounded-full border border-white/10 bg-black/20 backdrop-blur-md hover:bg-white hover:text-ink-black transition-colors cursor-pointer text-white">
        <ArrowLeft className="w-6 h-6" />
      </Link>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Visual Side (Left - Larger) */}
        <div className="w-full lg:w-[60%] h-[60vh] lg:h-screen relative overflow-hidden">
          <motion.div 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${product.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-ink-black" />
          
          {/* Giant Background Text */}
          <div className="absolute bottom-0 left-0 p-12 lg:p-24 opacity-20 pointer-events-none select-none">
             <h1 className="text-[15vw] leading-none font-display text-white writing-vertical-rl">{product.name.substring(0, 2)}</h1>
          </div>
        </div>

        {/* Info Side (Right - Compact) */}
        <div className="w-full lg:w-[40%] p-8 lg:p-24 flex flex-col justify-center bg-ink-black border-l border-white/5 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className={`font-sans text-xs tracking-[0.3em] uppercase block mb-6 ${product.theme}`}>Single Origin</span>
            <h1 className="font-display text-5xl lg:text-6xl text-white mb-2">{product.name}</h1>
            <p className="font-sans text-sm tracking-widest uppercase mb-12 text-white/40">{product.en}</p>

            <div className="w-12 h-[1px] bg-white/20 mb-12" />

            <div className="prose prose-invert mb-12">
              <p className="font-body text-white/80 text-lg leading-loose text-justify font-light">
                {product.desc}
              </p>
            </div>

            {/* Tasting Notes */}
            <div className="mb-16">
              <div className="flex gap-3 flex-wrap">
                {product.notes.split(' • ').map((note, i) => (
                  <span key={i} className={`px-4 py-2 border border-white/10 rounded-full font-body text-sm ${product.theme} bg-white/5`}>
                    {note}
                  </span>
                ))}
              </div>
            </div>

            {/* Brewing Guide */}
            <div className="grid grid-cols-3 gap-4 mb-16 border-t border-b border-white/10 py-8">
              <div className="flex flex-col items-center gap-3">
                <Thermometer className="w-5 h-5 text-white/40" />
                <span className="font-display text-xl text-white">95°C</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Droplets className="w-5 h-5 text-white/40" />
                <span className="font-display text-xl text-white">5g</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Clock className="w-5 h-5 text-white/40" />
                <span className="font-display text-xl text-white">45s</span>
              </div>
            </div>

            {/* Action */}
            <div className="flex items-center justify-between gap-8">
              <div className={`font-display text-4xl ${product.theme}`}>{product.price}</div>
              <button className="flex-1 py-5 bg-white text-ink-black font-sans tracking-[0.2em] hover:bg-fir-green hover:text-white transition-colors duration-500 text-sm uppercase">
                Add to Collection
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
