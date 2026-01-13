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
    color: 'bg-amber-100',
    accent: 'text-amber-800'
  },
  2: {
    name: '金萱',
    en: 'Jin Xuan',
    price: 'NT$ 980',
    desc: '獨特的天然奶香與桂花氣息，口感滑順，是入門台灣茶的最佳選擇。',
    notes: '奶香 • 桂花 • 清爽',
    color: 'bg-lime-100',
    accent: 'text-lime-800'
  },
  3: {
    name: '紅玉',
    en: 'Ruby Black',
    price: 'NT$ 1,500',
    desc: '台灣野生山茶與緬甸大葉種的完美結合，帶有薄荷與肉桂的獨特收斂性。',
    notes: '薄荷 • 肉桂 • 麥芽',
    color: 'bg-rose-100',
    accent: 'text-rose-900'
  },
  4: {
    name: '四季春',
    en: 'Four Seasons',
    price: 'NT$ 850',
    desc: '生命力強韌的品種，香氣高揚奔放，帶有明顯的梔子花香。',
    notes: '梔子花 • 鮮爽 • 高揚',
    color: 'bg-emerald-100',
    accent: 'text-emerald-800'
  }
};

const ProductDetail = () => {
  const { id } = useParams();
  const product = products[id as unknown as keyof typeof products] || products[1];

  return (
    <div className="min-h-screen bg-paper-white relative selection:bg-fir-green selection:text-paper-white">
      {/* Back Button */}
      <Link to="/" className="fixed top-8 left-8 z-50 p-2 rounded-full border border-ink-black/10 hover:bg-ink-black hover:text-white transition-colors cursor-pointer mix-blend-difference text-ink-black">
        <ArrowLeft className="w-6 h-6" />
      </Link>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Visual Side (Left) */}
        <div className={`w-full lg:w-1/2 min-h-[50vh] lg:h-screen relative overflow-hidden ${product.color} flex items-center justify-center`}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative z-10 text-center"
          >
            <div className="writing-vertical-rl text-[20vw] lg:text-[12vw] font-display text-ink-black/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
              {product.name}
            </div>
            {/* Placeholder for Product Image */}
            <div className="w-64 h-80 bg-white/30 backdrop-blur-sm border border-white/40 shadow-2xl mx-auto relative transform rotate-[-5deg]">
               <span className="absolute bottom-4 right-4 writing-vertical-rl font-display text-2xl text-ink-black/60">{product.name}</span>
            </div>
          </motion.div>
          
          {/* Decorative Ink Blots */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[80px] rounded-full mix-blend-overlay" />
        </div>

        {/* Info Side (Right) */}
        <div className="w-full lg:w-1/2 p-8 lg:p-24 flex flex-col justify-center bg-paper-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="font-sans text-xs tracking-[0.3em] text-ink-black/40 uppercase block mb-4">Single Origin</span>
            <h1 className="font-display text-5xl lg:text-7xl text-ink-black mb-4">{product.name}</h1>
            <p className={`font-sans text-sm tracking-widest uppercase mb-12 ${product.accent}`}>{product.en}</p>

            <div className="prose prose-stone mb-12">
              <p className="font-body text-ink-black/70 text-lg leading-loose text-justify">
                {product.desc}
              </p>
            </div>

            {/* Tasting Notes */}
            <div className="mb-16">
              <h3 className="font-display text-xl text-ink-black mb-6">風味筆記</h3>
              <div className="flex gap-4">
                {product.notes.split(' • ').map((note, i) => (
                  <span key={i} className="px-4 py-2 border border-ink-black/10 rounded-full font-body text-sm text-ink-black/60">
                    {note}
                  </span>
                ))}
              </div>
            </div>

            {/* Brewing Guide */}
            <div className="grid grid-cols-3 gap-8 mb-16 border-t border-b border-ink-black/5 py-8">
              <div className="flex flex-col items-center gap-2">
                <Thermometer className="w-5 h-5 text-ink-black/40" />
                <span className="font-sans text-xs text-ink-black/40">TEMP</span>
                <span className="font-display text-lg">95°C</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Droplets className="w-5 h-5 text-ink-black/40" />
                <span className="font-sans text-xs text-ink-black/40">AMOUNT</span>
                <span className="font-display text-lg">5g</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Clock className="w-5 h-5 text-ink-black/40" />
                <span className="font-sans text-xs text-ink-black/40">TIME</span>
                <span className="font-display text-lg">45s</span>
              </div>
            </div>

            {/* Action */}
            <div className="flex items-center justify-between">
              <div className="font-display text-3xl text-cinnabar">{product.price}</div>
              <button className="px-12 py-4 bg-ink-black text-paper-white font-sans tracking-widest hover:bg-fir-green transition-colors duration-300">
                加入收藏
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
