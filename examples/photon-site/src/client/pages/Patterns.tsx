import { StaticLink } from '@gravito/freeze-react'
import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import {
  Activity,
  Boxes,
  ChevronRight,
  Code,
  Cpu,
  Database,
  GitBranch,
  Lock,
  Network,
  Shield,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react'
import { DocsLayout } from '../components/DocsLayout'

const getPatterns = (lang: 'en' | 'zh-TW') => {
  const isZh = lang === 'zh-TW'
  return [
    {
      id: 'PTN_01',
      title: isZh ? '管道代理' : 'Pipeline Proxy',
      desc: isZh
        ? '使用零複製緩衝傳遞來鏈接超低延遲處理程序，實現無縫的請求轉發和負載均衡。'
        : 'Chain ultra-low latency handlers with zero-copy buffer passing for seamless request forwarding and load balancing.',
      icon: Zap,
      code: 'app.get("/*", proxy.pipe("upstream.node"))',
      category: isZh ? '效能優化' : 'Performance',
      metrics: { label: 'Latency', value: '0.012ms' },
      benefits: isZh
        ? ['零複製傳輸', '超低延遲', '自動負載均衡']
        : ['Zero-copy transfer', 'Ultra-low latency', 'Auto load balancing'],
    },
    {
      id: 'PTN_02',
      title: isZh ? 'AOT 驗證器' : 'AOT Validator',
      desc: isZh
        ? '將 Schema 檢查編譯到路由表中，實現 O(1) 等級的驗證。在編譯時優化，運行時零開銷。'
        : 'Compile schema checks into the routing table for O(1) validation. Optimized at compile-time, zero overhead at runtime.',
      icon: Shield,
      code: 'app.post("/data", { schema }, handler)',
      category: isZh ? '型別安全' : 'Type Safety',
      metrics: { label: 'Overhead', value: '0.00ns' },
      benefits: isZh
        ? ['O(1) 驗證', '編譯時優化', '零運行時開銷']
        : ['O(1) validation', 'Compile-time optimization', 'Zero runtime overhead'],
    },
    {
      id: 'PTN_03',
      title: isZh ? '原子化 CRUD' : 'Atomic CRUD',
      desc: isZh
        ? '透過 Atlas ORM 整合高度優化的資料庫操作。支援事務、關聯查詢和自動型別推論。'
        : 'Highly optimized database operations with Atlas ORM integration. Supports transactions, relationships, and automatic type inference.',
      icon: Database,
      code: 'const user = await User.find(id)',
      category: isZh ? '資料持久化' : 'Data Persistence',
      metrics: { label: 'Type Safety', value: '100% Strict' },
      benefits: isZh
        ? ['Active Record 模式', '自動型別推論', '事務支援']
        : ['Active Record pattern', 'Auto type inference', 'Transaction support'],
    },
    {
      id: 'PTN_04',
      title: isZh ? '邊緣防護' : 'Edge Guard',
      desc: isZh
        ? '在指令層級運行的安全中介軟體。提供身份驗證、授權和速率限制，保護應用程式邊界。'
        : 'Security middleware executing at the instruction level. Provides authentication, authorization, and rate limiting to protect application boundaries.',
      icon: Lock,
      code: 'app.use(sentinel.shield())',
      category: isZh ? '安全性' : 'Security',
      metrics: { label: 'Auth Check', value: '0.005ms' },
      benefits: isZh
        ? ['指令層級執行', '多重防護', '零配置']
        : ['Instruction-level execution', 'Multi-layer protection', 'Zero configuration'],
    },
    {
      id: 'PTN_05',
      title: isZh ? '資源路由' : 'Resource Routes',
      desc: isZh
        ? '使用單行程式碼定義完整的 RESTful API。自動生成標準 CRUD 路由，遵循 REST 最佳實踐。'
        : 'Define complete RESTful APIs with a single line of code. Automatically generates standard CRUD routes following REST best practices.',
      icon: Network,
      code: 'routes.resource("photos", PhotoController)',
      category: isZh ? 'API 設計' : 'API Design',
      metrics: { label: 'Endpoints', value: '8 Native' },
      benefits: isZh
        ? ['RESTful 標準', '自動路由生成', '可組合配置']
        : ['RESTful standard', 'Auto route generation', 'Composable configuration'],
    },
    {
      id: 'PTN_06',
      title: isZh ? '上下文回收' : 'Context Recycling',
      desc: isZh
        ? '重用請求上下文物件，減少記憶體分配。透過物件池模式實現零垃圾回收壓力。'
        : 'Reuse request context objects to minimize memory allocation. Achieves zero GC pressure through object pooling patterns.',
      icon: Boxes,
      code: 'const ctx = contextPool.acquire()',
      category: isZh ? '記憶體優化' : 'Memory',
      metrics: { label: 'Allocations', value: 'Zero' },
      benefits: isZh
        ? ['零 GC 壓力', '物件池模式', '高效能']
        : ['Zero GC pressure', 'Object pooling', 'High performance'],
    },
    {
      id: 'PTN_07',
      title: isZh ? '路由模型綁定' : 'Route Model Binding',
      desc: isZh
        ? '自動將路由參數綁定到資料庫模型。自動處理 404 錯誤，簡化控制器邏輯。'
        : 'Automatically bind route parameters to database models. Handles 404 errors automatically, simplifying controller logic.',
      icon: GitBranch,
      code: 'routes.model("user", User)',
      category: isZh ? '開發者體驗' : 'Developer Experience',
      metrics: { label: 'DX Score', value: 'Absolute' },
      benefits: isZh
        ? ['自動模型注入', '自動 404 處理', '減少樣板程式碼']
        : ['Auto model injection', 'Auto 404 handling', 'Less boilerplate'],
    },
    {
      id: 'PTN_08',
      title: isZh ? '指令層級優化' : 'Instruction-Level Optimization',
      desc: isZh
        ? '在編譯時分析處理器函數，選擇最佳執行路徑。根據靜態分析結果優化上下文類型和記憶體分配。'
        : 'Analyze handler functions at compile-time to select optimal execution paths. Optimizes context types and memory allocation based on static analysis.',
      icon: Cpu,
      code: '// Automatic optimization based on handler analysis',
      category: isZh ? '編譯時優化' : 'Compile-Time',
      metrics: { label: 'JIT Warmup', value: '2ms' },
      benefits: isZh
        ? ['靜態分析', '自動優化', '零運行時開銷']
        : ['Static analysis', 'Auto optimization', 'Zero runtime overhead'],
    },
  ]
}

export default function Patterns({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) {
  const isZh = lang === 'zh-TW'
  const items = getPatterns(lang as 'en' | 'zh-TW')

  return (
    <DocsLayout currentId="patterns">
      <Head title={`${isZh ? '架構模式' : 'Architecture Patterns'} | Photon Engine`} />

      <div className="mb-24 relative">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-photon-gold/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3 mb-8">
          <div className="px-3 py-1 bg-photon-gold/10 border border-photon-gold/20 rounded-full text-[10px] text-photon-gold font-technical tracking-[0.2em] uppercase">
            Architect_Blueprint_v2.0
          </div>
          <div className="w-1.5 h-1.5 bg-photon-gold rounded-full animate-pulse" />
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-p-txt uppercase tracking-tighter mb-10 leading-[0.9] drop-shadow-sm">
          {isZh ? '架構師' : 'Architectural'}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-photon-gold to-yellow-600">
            {isZh ? '模式' : 'Patterns'}
          </span>
        </h1>
        <p className="text-xl text-s-txt font-light max-w-3xl leading-relaxed opacity-80 border-l-2 border-photon-gold/20 pl-8 ml-1">
          {isZh
            ? '構建隱形、高效能協調層的成熟結構。這些模式代表了幾百萬次請求壓力測試後的最佳實踐。'
            : 'Proven structures for building invisible, high-performance orchestration layers. Tested across millions of requests.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-32">
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="group relative p-10 bg-s-bg border border-s-brd hover:border-photon-gold/40 hover:shadow-[0_25px_60px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-photon-gold/5 blur-[60px] group-hover:bg-photon-gold/10 transition-colors pointer-events-none" />

            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className="w-16 h-16 border border-s-brd flex items-center justify-center bg-surf-bg group-hover:border-photon-gold/40 group-hover:bg-photon-gold/5 transition-all duration-300">
                <item.icon
                  size={28}
                  strokeWidth={1.5}
                  className="text-photon-gold/80 group-hover:text-photon-gold group-hover:scale-110 transition-all duration-300"
                />
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <span className="text-[10px] font-technical text-m-txt uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 transition-opacity">
                  {item.id}
                </span>
                <span className="text-[10px] font-technical text-photon-gold border border-photon-gold/20 bg-photon-gold/5 px-3 py-1 rounded-sm uppercase tracking-widest">
                  {item.category}
                </span>
              </div>
            </div>

            <h3 className="text-3xl font-black text-p-txt uppercase tracking-tight mb-4 group-hover:text-photon-gold transition-colors duration-300 relative z-10">
              {item.title}
            </h3>
            <p className="text-s-txt text-base leading-relaxed mb-8 opacity-80 group-hover:opacity-100 transition-opacity h-12 overflow-hidden">
              {item.desc}
            </p>

            <div className="relative z-10">
              <div className="flex flex-wrap gap-2.5 mb-8">
                {item.benefits.map((benefit, bIdx) => (
                  <span
                    key={bIdx}
                    className="text-[10px] font-technical text-photon-gold/80 uppercase px-3 py-1.5 bg-surf-bg border border-s-brd rounded-xs group-hover:border-photon-gold/20 transition-colors"
                  >
                    {benefit}
                  </span>
                ))}
              </div>

              <div className="relative group/code">
                <div className="absolute -top-6 right-2 text-[9px] font-technical text-m-txt opacity-40 uppercase tracking-widest">
                  {isZh ? '示例_代碼' : 'EXAMPLE_CODE'}
                </div>
                <div className="p-6 bg-[#0F0F10] border border-s-brd group-hover:border-photon-gold/30 transition-all duration-300 rounded-sm font-technical text-xs leading-relaxed text-blue-400 overflow-x-auto shadow-inner">
                  <div className="flex items-center gap-3 mb-2 opacity-30">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-orange-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  </div>
                  <code className="block whitespace-pre text-indigo-300">{item.code}</code>
                </div>
              </div>

              {item.metrics && (
                <div className="mt-8 flex items-center justify-between p-4 bg-surf-bg border border-s-brd rounded-sm">
                  <div className="text-[10px] font-technical text-m-txt uppercase tracking-[0.2em]">
                    {item.metrics.label}
                  </div>
                  <div className="text-lg font-technical font-black text-photon-gold">
                    {item.metrics.value}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-12 md:p-16 border border-s-brd bg-s-bg relative overflow-hidden group hover:border-photon-gold/40 transition-all duration-700 shadow-xl"
        >
          <div className="absolute -top-10 -right-10 p-10 opacity-5 pointer-events-none text-p-txt rotate-12 transition-transform duration-1000 group-hover:rotate-0">
            <Code size={250} strokeWidth={0.5} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-1 px-4 bg-photon-gold mb-10" />
            <h2 className="text-4xl md:text-5xl font-black text-p-txt uppercase tracking-tighter mb-8 leading-[0.9]">
              {isZh ? '組合式' : 'Composable'}{' '}
              <span className="text-photon-gold block mt-2">
                {isZh ? '架構體系' : 'System_Design'}
              </span>
            </h2>
            <p className="text-lg text-s-txt leading-relaxed mb-12 opacity-80 font-light">
              {isZh
                ? 'Photon 模式旨在可組合化。混合搭配這些建築區塊，打造終極協調核心。每個模式都是獨立的，可以根據需求自由組合。'
                : 'Photon patterns are designed to be composable. Mix and match these architectural blocks to create the ultimate orchestration kernel.'}
            </p>
            <div className="mt-auto">
              <StaticLink
                href={`/docs/routing?lang=${lang}`}
                className="inline-flex items-center gap-4 px-8 py-4 bg-surf-bg border border-s-brd text-[11px] font-technical text-p-txt uppercase tracking-[0.3em] font-black hover:bg-photon-gold hover:text-black hover:border-photon-gold transition-all"
              >
                {isZh ? '探索路由協定' : 'Explore Routing Protocol'} <ChevronRight size={14} />
              </StaticLink>

              ...

              <StaticLink
                href={`/docs/performance?lang=${lang}`}
                className="inline-flex items-center gap-4 px-8 py-4 bg-surf-bg border border-s-brd text-[11px] font-technical text-p-txt uppercase tracking-[0.3em] font-black hover:bg-photon-gold hover:text-black hover:border-photon-gold transition-all"
              >
                {isZh ? '閱讀效能指標' : 'Review Performance Metrics'} <ChevronRight size={14} />
              </StaticLink>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-10 py-16 border-y border-s-brd mt-20 mb-32 group">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-photon-gold/5 flex items-center justify-center rounded-sm">
            <Workflow size={40} className="text-photon-gold opacity-60" />
          </div>
          <div>
            <div className="text-[10px] font-technical text-m-txt uppercase tracking-widest mb-1">
              {isZh ? '系統架構' : 'SYSTEM_RELIABILITY'}
            </div>
            <div className="text-2xl font-black text-p-txt uppercase tracking-tight">
              {isZh ? '高可用性叢集' : 'High_Availability_Cluster'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-6 py-2 bg-surf-bg border border-s-brd rounded-full text-[10px] font-technical text-photon-gold uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={10} />
            {isZh ? '生產就緒' : 'PRODUCTION_READY'}
          </div>
          <div className="px-6 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-technical text-green-500 uppercase tracking-widest">
            v2.0_STABLE
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}
