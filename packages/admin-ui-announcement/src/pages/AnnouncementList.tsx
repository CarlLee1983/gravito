import { useAdmin } from '@gravito/admin-shell-react'
import { type ClassValue, clsx } from 'clsx'
import { Clock, Edit2, Eye, Hammer, Megaphone, Plus, Search, Trash2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function AnnouncementList() {
  const { sdk } = useAdmin()
  const [items, setItems] = useState<any[]>([])
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await sdk.api.get<any[]>('/announcements')
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
          <h1 className="text-2xl font-bold text-slate-900">網站公告管理</h1>
          <p className="text-slate-500 text-sm">管理全站橫幅、彈窗與活動通知</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
        >
          <Plus size={18} /> 新增公告
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="搜尋公告標題..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
            <tr>
              <th className="px-6 py-4">公告標題</th>
              <th className="px-6 py-4">類型</th>
              <th className="px-6 py-4">有效期</th>
              <th className="px-6 py-4">狀態</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center border',
                        item.type === 'PROMOTION'
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : item.type === 'MAINTENANCE'
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                      )}
                    >
                      {item.type === 'PROMOTION' ? (
                        <Zap size={18} />
                      ) : item.type === 'MAINTENANCE' ? (
                        <Hammer size={18} />
                      ) : (
                        <Megaphone size={18} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{item.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ID: {item.id} · Priority: {item.priority}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-slate-600">{item.type}</span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-300" />
                    {item.startsAt} {item.endsAt && `~ ${item.endsAt}`}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-tight',
                      item.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    )}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
