import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

const products = [
  {
    id: 1,
    name: '高山烏龍',
    en: 'High Mountain Oolong',
    price: 'NT$ 1,200',
    desc: '雲霧中的金色傳說，蘭花香氣與奶油質感的完美平衡。',
    image: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?q=80&w=1200&auto=format&fit=crop',
    theme: 'text-amber-900',
    bg: 'bg-amber-50',
    accent: 'text-amber-600'
  },
  {
    id: 2,
    name: '金萱',
    en: 'Jin Xuan',
    price: 'NT$ 980',
    desc: '獨特的天然奶香，如晨間露水般的清甜順滑。',
    image: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?q=80&w=1200&auto=format&fit=crop',
    theme: 'text-lime-900',
    bg: 'bg-lime-50',
    accent: 'text-lime-600'
  },
  {
    id: 3,
    name: '紅玉',
    en: 'Ruby Black',
    price: 'NT$ 1,500',
    desc: '台灣山茶的野性，薄荷與肉桂交織的收斂感。',
    image: 'https://images.unsplash.com/photo-1563911892437-1feda0179e1b?q=80&w=1200&auto=format&fit=crop',
    theme: 'text-rose-900',
    bg: 'bg-rose-50',
    accent: 'text-rose-700'
  },
  {
    id: 4,
    name: '四季春',
    en: 'Four Seasons',
    price: 'NT$ 850',
    desc: '生命力強韌的奔放香氣，梔子花香的直球對決。',
    image: 'https://images.unsplash.com/photo-1606312619070-d48b706521bf?q=80&w=1200&auto=format&fit=crop',
    theme: 'text-emerald-900',
    bg: 'bg-emerald-50',
    accent: 'text-emerald-600'
  }
];

const ProductStage = ({ product, index }: { product: typeof products[0], index: number }) => {
  const isEven = index % 2 === 0;
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const textY = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.1]);

  return (
    <Link to={`/product/${product.id}`} className="block group">
      <div ref={ref} className={`min-h-[90vh] flex flex-col md:flex-row items-center relative overflow-hidden ${isEven ? '' : 'md:flex-row-reverse'}`}>
        
        {/* Background Texture */}
        <div className={`absolute inset-0 ${product.bg} opacity-30 transition-colors duration-700`} />
        
        {/* Giant Calligraphy Background (Parallax) */}
        <motion.div 
          style={{ y: textY }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none w-full text-center"
        >
          <span className={`text-[25vw] font-display opacity-10 select-none ${product.theme} whitespace-nowrap`}>
            {product.name}
          </span>
        </motion.div>

        {/* Image Section */}
        <div className="w-full md:w-1/2 h-[50vh] md:h-full p-8 md:p-24 relative flex items-center justify-center z-10">
          <motion.div 
            style={{ scale: imageScale }}
            className="relative w-full aspect-[3/4] md:aspect-square max-w-lg shadow-2xl overflow-hidden"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
              style={{ backgroundImage: `url(${product.image})` }}
            />
            {/* Overlay Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500`} />
            
            {/* Floating Price Tag */}
            <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-md px-6 py-3 font-display text-2xl text-ink-black shadow-lg">
              {product.price}
            </div>
          </motion.div>
        </div>

        {/* Info Section */}
        <div className="w-full md:w-1/2 p-8 md:p-24 relative z-10 flex flex-col justify-center">
          <motion.div style={{ y }}>
            <span className={`font-sans tracking-[0.3em] uppercase text-sm mb-4 block ${product.accent}`}>
              Single Origin
            </span>
            <h2 className="text-6xl md:text-8xl font-display text-ink-black mb-6 group-hover:text-cinnabar transition-colors duration-500">
              {product.name}
            </h2>
            <p className="font-sans text-xs tracking-[0.2em] text-ink-black/40 uppercase mb-12">
              {product.en}
            </p>
            
            <p className="font-body text-xl text-ink-black/70 leading-loose max-w-md mb-12 text-justify">
              {product.desc}
            </p>

            <div className="flex items-center gap-4 text-ink-black group-hover:gap-8 transition-all duration-300">
              <span className="font-sans tracking-[0.2em] uppercase border-b border-ink-black pb-1">View Detail</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </motion.div>
        </div>
      </div>
    </Link>
  );
};

const ShopSection = () => {
  return (
    <section id="shop" className="relative bg-paper-white pt-32 pb-0">
      <div className="text-center mb-32 px-8">
        <h2 className="text-sm font-sans tracking-[0.5em] text-cinnabar mb-4">THE SAVOR</h2>
        <h2 className="text-5xl md:text-7xl font-display text-ink-black">韻味長廊</h2>
        <p className="font-body text-ink-black/40 mt-8 max-w-lg mx-auto leading-loose">
          每一款茶，都是一片風景。<br/>
          請放慢腳步，細細品味這份來自山林的饋贈。
        </p>
      </div>

      <div className="flex flex-col">
        {products.map((product, i) => (
          <ProductStage key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
};

export default ShopSection;
