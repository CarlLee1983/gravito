import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

const CollectionTeaser = () => {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [50, -50])
  const scale = useTransform(scrollYProgress, [0, 1], [1.1, 1])

  return (
    <section
      ref={ref}
      className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-stone-100"
    >
      {/* Background Parallax */}
      <motion.div style={{ scale }} className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1571934811356-5cc55449d0f1?q=80&w=2000&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-ink-black/20" />
      </motion.div>

      {/* Content Card */}
      <div className="relative z-10 max-w-4xl mx-auto px-8 w-full">
        <div className="bg-paper-white/90 backdrop-blur-md p-12 md:p-24 shadow-2xl relative overflow-hidden group">
          {/* Decorative Border */}
          <div className="absolute top-4 left-4 right-4 bottom-4 border border-ink-black/10 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <span className="font-sans text-xs tracking-[0.3em] text-cinnabar uppercase mb-6 block">
                The Collection
              </span>
              <h2 className="text-5xl md:text-6xl font-display text-ink-black mb-8">
                山林間的
                <br />
                四季皆是詩
              </h2>
              <p className="font-body text-ink-black/60 leading-loose mb-12 text-justify">
                我們依循節氣採摘，將南投的風土封存於葉片之中。
                <br />
                從春茶的鮮爽到冬茶的甘冽，每一款都是大地的獻禮。
              </p>

              <Link to="/shop" className="inline-flex items-center gap-4 group/btn">
                <span className="font-display text-2xl text-ink-black border-b border-black/20 pb-1 group-hover/btn:border-cinnabar group-hover/btn:text-cinnabar transition-all duration-300">
                  進入韻味長廊
                </span>
                <ArrowRight className="w-6 h-6 text-ink-black group-hover/btn:text-cinnabar group-hover/btn:translate-x-2 transition-all duration-300" />
              </Link>
            </div>

            {/* Vertical Text Decor */}
            <div className="hidden md:block h-64 border-l border-ink-black/10 pl-12">
              <motion.div
                style={{ y }}
                className="writing-vertical-rl font-display text-4xl text-ink-black/20 select-none"
              >
                一期一會
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CollectionTeaser
