import { Head, Link } from '@inertiajs/react'
import { ChevronRight, Database, Layers, Lock, Shield, Zap } from 'lucide-react'
import { DocsLayout } from '../components/DocsLayout'

const getPatterns = (lang: 'en' | 'zh-TW') => {
  const isZh = lang === 'zh-TW'
  return [
    {
      id: 'PTN_01',
      title: isZh ? '管道代理 (Pipeline Proxy)' : 'The Pipeline Proxy',
      desc: isZh ? '使用零複製緩衝傳遞來鏈接超低延遲處理程序。' : 'Chain ultra-low latency handlers with zero-copy buffer passing.',
      icon: Zap,
      code: 'app.get("/*", proxy.pipe("upstream.node"))',
    },
    {
      id: 'PTN_02',
      title: isZh ? 'AOT 驗證器' : 'AOT Validator',
      desc: isZh ? '將 Schema 檢查編譯到路由表中，實現 O(1) 等級的驗證。' : 'Compile schema checks into the routing table for O(1) validation.',
      icon: Shield,
      code: 'app.post("/data", { schema }, handler)',
    },
    {
      id: 'PTN_03',
      title: isZh ? '原子化 CRUD' : 'Atomic CRUD',
      desc: isZh ? '透過 Atlas ORM 整合高度優化的資料庫操作。' : 'Highly optimized database operations with Atlas ORM integration.',
      icon: Database,
      code: 'const user = await User.find(id)',
    },
    {
      id: 'PTN_04',
      title: isZh ? '邊緣防護' : 'Edge Guard',
      desc: isZh ? '在指令層級運行的安全中介軟體。' : 'Security middleware executing at the instruction level.',
      icon: Lock,
      code: 'app.use(sentinel.shield())',
    },
  ]
}

export default function Patterns({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) {
  const isZh = lang === 'zh-TW'
  const items = getPatterns(lang)

  return (
    <DocsLayout currentId="patterns">
      <Head title={`${isZh ? '架構模式' : 'Architecture Patterns'} | Photon Engine`} />

      <div className="mb-20">
        <h1 className="text-5xl md:text-7xl font-black text-p-txt uppercase tracking-tighter mb-8 leading-[0.95]">
          {isZh ? '建築' : 'Architectural'}
          <br />
          <span className="text-photon-gold">{isZh ? '模式' : 'Patterns'}</span>
        </h1>
        <p className="text-xl text-s-txt font-light max-w-2xl leading-relaxed">
          {isZh ? '構建隱形、高效能協調層的成熟結構。' : 'Proven structures for building invisible, high-performance orchestration layers.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
        {items.map((item) => (
          <div
            key={item.id}
            className="group p-10 bg-s-bg border border-s-brd hover:border-photon-gold/30 transition-all"
          >
            <div className="flex justify-between items-start mb-10">
              <div className="w-12 h-12 border border-s-brd flex items-center justify-center bg-surf-bg group-hover:border-photon-gold/20 transition-colors">
                <item.icon
                  size={20}
                  className="text-m-txt group-hover:text-photon-gold transition-colors"
                />
              </div>
              <span className="text-[9px] font-technical text-m-txt uppercase">
                Pattern_{item.id}
              </span>
            </div>
            <h3 className="text-2xl font-black text-p-txt uppercase tracking-tight mb-4">
              {item.title}
            </h3>
            <p className="text-s-txt text-sm leading-relaxed mb-8">{item.desc}</p>
            <div className="p-4 bg-surf-bg border border-s-brd rounded font-mono text-[10px] text-photon-gold/80">
              <code>{item.code}</code>
            </div>
          </div>
        ))}
      </div>

      <div className="p-12 border border-s-brd bg-s-bg relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-p-txt">
          <Layers size={200} strokeWidth={0.5} />
        </div>
        <h2 className="text-3xl font-black text-p-txt uppercase tracking-tighter mb-6 relative z-10">
          {isZh ? '部署您的' : 'Deploy Your'} <span className="text-photon-gold">{isZh ? '藍圖' : 'Blueprint'}</span>
        </h2>
        <p className="text-s-txt max-w-xl mb-10 relative z-10">
          {isZh ? 'Photon 模式旨在可組合化。混合搭配這些建築區塊，打造終極協調核心。' : 'Photon patterns are designed to be composable. Mix and match these architectural blocks to create the ultimate orchestration kernel.'}
        </p>
        <Link
          href={`/docs/intro?lang=${lang}`}
          className="inline-flex items-center gap-3 px-8 py-4 bg-surf-bg border border-s-brd text-[11px] font-technical text-p-txt uppercase tracking-widest hover:border-photon-gold transition-all relative z-10"
        >
          {isZh ? '探索實現' : 'Explore Implementation'} <ChevronRight size={14} />
        </Link>
      </div>
    </DocsLayout>
  )
}
