import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Droplets, Thermometer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

const products = {
  1: {
    name: '高山烏龍',
    en: 'High Mountain Oolong',
    price: 'NT$ 1,200',
    desc: '來自海拔 2000 公尺的原始林區，雲霧繚繞孕育出的厚實果膠質感。茶湯金黃透亮，入口即化的奶油質感，伴隨著優雅的蘭花香氣，久泡不澀，回甘強烈。',
    notes: '蘭花香 • 奶油感 • 甘甜',
    image:
      'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?q=80&w=1000&auto=format&fit=crop',
    theme: 'text-amber-200',
    profile: { sweetness: 90, aroma: 85, body: 70, aftertaste: 95 },
  },
  2: {
    name: '金萱',
    en: 'Jin Xuan',
    price: 'NT$ 980',
    desc: '獨特的天然奶香與桂花氣息，口感滑順，是入門台灣茶的最佳選擇。透過輕發酵工藝，保留了茶葉最鮮活的特質，茶湯呈現明亮的蜜綠色。',
    notes: '奶香 • 桂花 • 清爽',
    image:
      'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?q=80&w=1000&auto=format&fit=crop',
    theme: 'text-lime-200',
    profile: { sweetness: 85, aroma: 90, body: 60, aftertaste: 80 },
  },
  3: {
    name: '紅玉',
    en: 'Ruby Black',
    price: 'NT$ 1,500',
    desc: '台灣野生山茶與緬甸大葉種的完美結合，帶有薄荷與肉桂的獨特收斂性。全發酵製程賦予了它紅寶石般的色澤，是世界紅茶中極為獨特的存在。',
    notes: '薄荷 • 肉桂 • 麥芽',
    image:
      'https://images.unsplash.com/photo-1563911892437-1feda0179e1b?q=80&w=1000&auto=format&fit=crop',
    theme: 'text-rose-200',
    profile: { sweetness: 80, aroma: 95, body: 90, aftertaste: 85 },
  },
  4: {
    name: '四季春',
    en: 'Four Seasons',
    price: 'NT$ 850',
    desc: '生命力強韌的品種，香氣高揚奔放，帶有明顯的梔子花香。它的香氣直接而熱情，就像南投的陽光一樣，讓人一喝就難以忘懷。',
    notes: '梔子花 • 鮮爽 • 高揚',
    image:
      'https://images.unsplash.com/photo-1606312619070-d48b706521bf?q=80&w=1000&auto=format&fit=crop',
    theme: 'text-emerald-200',
    profile: { sweetness: 75, aroma: 100, body: 50, aftertaste: 70 },
  },
}

const ProfileBar = ({ label, value, theme }: { label: string; value: number; theme: string }) => (
  <div className="flex items-center gap-4 mb-4">
    <span className="text-xs font-sans w-20 text-white/60 tracking-widest">{label}</span>
    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className={`h-full ${theme.replace('text-', 'bg-')}`}
      />
    </div>
  </div>
)

const ProductDetail = () => {
  const { id } = useParams()
  const product = products[id as unknown as keyof typeof products] || products[1]

  return (
    <div className="min-h-screen bg-ink-black text-paper-white relative selection:bg-paper-white selection:text-ink-black">
      {/* Back Button */}
      <Link
        to="/shop"
        className="fixed top-8 left-8 z-50 p-4 rounded-full border border-white/10 bg-black/20 backdrop-blur-md hover:bg-white hover:text-ink-black transition-colors cursor-pointer text-white group"
      >
        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
      </Link>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Visual Side (Left - Larger) */}
        <div className="w-full lg:w-[55%] h-[60vh] lg:h-screen relative overflow-hidden">
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
            <h1 className="text-[15vw] leading-none font-display text-white writing-vertical-rl">
              {product.name.substring(0, 2)}
            </h1>
          </div>
        </div>

        {/* Info Side (Right - Compact) */}
        <div className="w-full lg:w-[45%] h-auto lg:h-screen overflow-y-auto p-8 lg:p-24 bg-ink-black border-l border-white/5 relative z-10 no-scrollbar">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-xl mx-auto pt-12"
          >
            <span
              className={`font-sans text-xs tracking-[0.3em] uppercase block mb-6 ${product.theme}`}
            >
              Single Origin
            </span>
            <h1 className="font-display text-5xl lg:text-7xl text-white mb-2">{product.name}</h1>
            <p className="font-sans text-sm tracking-widest uppercase mb-12 text-white/40">
              {product.en}
            </p>

            <div className="w-12 h-[1px] bg-white/20 mb-12" />

            <div className="prose prose-invert mb-16">
              <p className="font-body text-white/80 text-xl leading-loose text-justify font-light">
                {product.desc}
              </p>
            </div>

            {/* Flavor Profile */}
            <div className="mb-16 bg-white/5 p-8 rounded-lg border border-white/5">
              <h3 className="font-display text-xl text-white mb-6">風味輪廓</h3>
              <ProfileBar
                label="SWEETNESS"
                value={product.profile.sweetness}
                theme={product.theme}
              />
              <ProfileBar label="AROMA" value={product.profile.aroma} theme={product.theme} />
              <ProfileBar label="BODY" value={product.profile.body} theme={product.theme} />
              <ProfileBar
                label="AFTERTASTE"
                value={product.profile.aftertaste}
                theme={product.theme}
              />
            </div>

            {/* Brewing Ritual */}
            <div className="mb-16">
              <h3 className="font-display text-xl text-white mb-8">沖泡儀式</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Gongfu Style */}
                <div className="p-6 border border-white/10 rounded hover:bg-white/5 transition-colors">
                  <span className="text-xs font-sans tracking-widest text-white/40 block mb-4">
                    GONGFU STYLE
                  </span>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <Thermometer className="w-4 h-4 text-white/60" />
                      <span className="font-display text-lg">95°C</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Droplets className="w-4 h-4 text-white/60" />
                      <span className="font-display text-lg">5g / 120ml</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-white/60" />
                      <span className="font-display text-lg">45s + 10s</span>
                    </div>
                  </div>
                </div>

                {/* Mug Style */}
                <div className="p-6 border border-white/10 rounded hover:bg-white/5 transition-colors">
                  <span className="text-xs font-sans tracking-widest text-white/40 block mb-4">
                    MUG BREW
                  </span>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <Thermometer className="w-4 h-4 text-white/60" />
                      <span className="font-display text-lg">90°C</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Droplets className="w-4 h-4 text-white/60" />
                      <span className="font-display text-lg">3g / 350ml</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-white/60" />
                      <span className="font-display text-lg">3-5 mins</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="sticky bottom-0 bg-ink-black/90 backdrop-blur-lg border-t border-white/10 pt-8 pb-8 -mx-8 px-8 lg:-mx-24 lg:px-24">
              <div className="flex items-center justify-between gap-8">
                <div className={`font-display text-4xl ${product.theme}`}>{product.price}</div>
                <button
                  type="button"
                  className="flex-1 py-5 bg-white text-ink-black font-sans tracking-[0.2em] hover:bg-fir-green hover:text-white transition-colors duration-500 text-sm uppercase"
                >
                  Add to Collection
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
