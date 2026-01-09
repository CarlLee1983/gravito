import { useAdmin } from '@gravito/admin-shell-react'
import { type ClassValue, clsx } from 'clsx'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  Layers,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function NewsList() {
  const { sdk } = useAdmin()
  const [items, setItems] = useState<any[]>([])
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await sdk.api.get<any[]>('/news')
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
          <h1 className="text-2xl font-bold text-slate-900">最新消息管理</h1>
          <p className="text-slate-500 text-sm">發布企業動態、產品更新與技術文章</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg transition-all"
        >
          <Plus size={18} /> 撰寫文章
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="搜尋文章..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none">
            <option>所有類別</option>
            <option>產品更新</option>
            <option>品牌活動</option>
          </select>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
            <tr>
              <th className="px-6 py-4">文章標題</th>
              <th className="px-6 py-4">分類</th>
              <th className="px-6 py-4">發布時間</th>
              <th className="px-6 py-4">狀態</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">/{item.slug}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-slate-300" />
                    <span className="text-xs font-medium text-slate-600">{item.category}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-300" />
                    {item.publishedAt || '--'}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter',
                      item.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    )}
                  >
                    {item.status === 'PUBLISHED' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="編輯"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="預覽"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="刪除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
