import { useAdmin } from '@gravito/admin-shell-react'
import { type ClassValue, clsx } from 'clsx'
import { Calendar, MoreVertical, Plus, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function AdList() {
  const { sdk } = useAdmin()
  const [items, setItems] = useState<any[]>([])
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await sdk.api.get<any[]>('/ads')
        setItems(data)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [sdk])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">站內廣告管理</h1>
          <p className="text-slate-500 text-sm">投放素材、設定版位與追蹤點擊表現</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            管理版位
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus size={18} /> 新增廣告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all"
          >
            {/* 素材預覽 */}
            <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm">
                {item.slotSlug}
              </div>
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  className="p-1.5 bg-white/90 backdrop-blur-md rounded-lg text-slate-600 hover:text-indigo-600 shadow-sm"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 leading-snug">{item.title}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                    <Target size={10} /> {item.targetUrl}
                  </div>
                </div>
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    item.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  )}
                />
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    投送權重
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${(item.weight / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-700">{item.weight}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    有效期
                  </span>
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                    <Calendar size={12} className="text-slate-300" />~ {item.endsAt.split('-')[1]}/
                    {item.endsAt.split('-')[2]}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 空位引導 */}
        <button
          type="button"
          className="border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 p-8 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all group bg-slate-50/30 aspect-[16/9] lg:aspect-auto"
        >
          <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-indigo-200 transition-colors">
            <Plus size={24} />
          </div>
          <span className="text-sm font-bold">在此版位投放新素材</span>
        </button>
      </div>
    </div>
  )
}
