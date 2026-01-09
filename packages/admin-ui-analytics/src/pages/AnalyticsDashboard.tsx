import { useAdmin } from '@gravito/admin-shell-react'
import { type ClassValue, clsx } from 'clsx'
import { Download, Filter, MoreHorizontal, Plus, TrendingUp } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 框體核心：Widget 註冊結構
 */
export interface AnalyticsWidget {
  id: string
  title: string
  size: 'sm' | 'md' | 'lg' | 'full'
  component: React.ComponentType<{ period: string }>
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState('7d')
  const [widgets, setWidgets] = useState<AnalyticsWidget[]>([])

  useEffect(() => {
    // 預設載入內建 Widget
    setWidgets([
      { id: 'order-volume', title: '訂單走勢', size: 'md', component: OrderVolumeWidget },
      { id: 'revenue-share', title: '營收佔比', size: 'sm', component: MockPieWidget },
      { id: 'active-users', title: '活躍用戶', size: 'sm', component: MockCounterWidget },
    ])
  }, [])

  return (
    <div className="space-y-8">
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">數據指標中心</h1>
          <p className="text-slate-500 text-sm">監控您的業務增長與表現</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            {['24h', '7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                  period === p
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Filter size={18} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
          >
            <Download size={16} /> 匯出報告
          </button>
        </div>
      </div>

      {/* 分析框體 (Widget Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={cn(
              'bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col',
              widget.size === 'sm'
                ? 'lg:col-span-3'
                : widget.size === 'md'
                  ? 'lg:col-span-6'
                  : widget.size === 'lg'
                    ? 'lg:col-span-9'
                    : 'lg:col-span-12'
            )}
          >
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">{widget.title}</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="flex-1 p-6">
              <widget.component period={period} />
            </div>
          </div>
        ))}

        {/* 擴充按鈕 (讓開發者感覺這裡是可以加東西的) */}
        <button
          type="button"
          className="lg:col-span-3 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 p-8 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all group bg-slate-50/50"
        >
          <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-indigo-200 transition-colors">
            <Plus size={24} />
          </div>
          <span className="text-sm font-bold">新增自定義指標</span>
        </button>
      </div>
    </div>
  )
}

/**
 * 內建 Widget 實作範例：訂單走勢
 */
function OrderVolumeWidget({ period }: { period: string }) {
  const { sdk } = useAdmin()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await sdk.api.get<any>('/analytics/query', {
          params: { metric: 'order_volume', period },
        })
        setData(res.data)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [sdk, period])

  if (loading) {
    return <div className="h-48 w-full bg-slate-50 animate-pulse rounded-2xl" />
  }

  return (
    <div className="space-y-4">
      <div className="h-48 flex items-end justify-between gap-2">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div
              className="w-full bg-indigo-500/10 group-hover:bg-indigo-500 transition-all rounded-t-lg relative"
              style={{ height: `${(item.value / 300) * 100}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.value} 筆訂單
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockPieWidget() {
  return (
    <div className="flex flex-col items-center justify-center h-48 space-y-4">
      <div className="w-32 h-32 rounded-full border-[12px] border-indigo-500 border-t-emerald-400 border-r-amber-400" />
      <div className="flex gap-3 text-[10px] font-bold text-slate-500">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500" /> 直接
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" /> 廣告
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400" /> 社群
        </span>
      </div>
    </div>
  )
}

function MockCounterWidget() {
  return (
    <div className="flex flex-col justify-center h-48">
      <div className="text-4xl font-black text-slate-900">1,284</div>
      <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs mt-2">
        <TrendingUp size={14} /> +12.5%
      </div>
      <p className="text-slate-400 text-[10px] mt-4 font-medium uppercase tracking-widest">
        較上一個週期增加 142 人
      </p>
    </div>
  )
}
