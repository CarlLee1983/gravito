import { motion } from 'framer-motion';
import React from 'react';

const products = [
  {
    id: 1,
    name: '高山烏龍',
    en: 'High Mountain Oolong',
    price: 'NT$ 1,200',
    color: 'shadow-amber-200/50', // Goldish
    bg: 'bg-amber-50'
  },
  {
    id: 2,
    name: '金萱',
    en: 'Jin Xuan',
    price: 'NT$ 980',
    color: 'shadow-lime-200/50', // Milky Green
    bg: 'bg-lime-50'
  },
  {
    id: 3,
    name: '紅玉',
    en: 'Ruby Black',
    price: 'NT$ 1,500',
    color: 'shadow-rose-200/50', // Amber/Red
    bg: 'bg-rose-50'
  },
  {
    id: 4,
    name: '四季春',
    en: 'Four Seasons',
    price: 'NT$ 850',
    color: 'shadow-emerald-200/50',
    bg: 'bg-emerald-50'
  }
];

const ProductCard = ({ product }: { product: typeof products[0] }) => {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="group relative cursor-pointer"
    >
      {/* Tea Soup Glow (Hover) */}
      <div className={`absolute inset-0 rounded-xl ${product.color} shadow-[0_0_100px_-20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      {/* Card Body */}
      <div className="relative z-10 bg-white/50 backdrop-blur-md border border-white/20 p-8 aspect-[3/4] flex flex-col items-center justify-between transition-colors duration-300 group-hover:bg-white/80">
        
        {/* Placeholder for 3D Packaging */}
        <div className={`w-32 h-48 ${product.bg} shadow-inner flex items-center justify-center relative transform transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3`}>
           <span className="text-ink-black/20 font-display writing-vertical-rl text-2xl tracking-widest">{product.name}</span>
        </div>

        <div className="text-center">
          <h3 className="font-display text-2xl text-ink-black mb-1">{product.name}</h3>
          <p className="font-sans text-xs tracking-widest text-ink-black/40 uppercase mb-3">{product.en}</p>
          <p className="font-sans text-cinnabar font-medium">{product.price}</p>
        </div>
      </div>
    </motion.div>
  );
};

const ShopSection = () => {
  return (
    <section className="relative py-32 px-8 bg-stone-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
          <div>
            <h2 className="text-sm font-sans tracking-[0.5em] text-cinnabar mb-4">THE SAVOR</h2>
            <h2 className="text-4xl md:text-6xl font-display text-ink-black">韻味商城</h2>
          </div>
          <p className="font-body text-ink-black/60 max-w-sm text-sm tracking-wide leading-loose">
            精選南投海拔一千公尺以上的純淨茶葉，
            <br />
            帶給您最純粹的回甘體驗。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShopSection;
