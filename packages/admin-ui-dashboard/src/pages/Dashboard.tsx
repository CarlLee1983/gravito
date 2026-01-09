import { useAdmin } from '@gravito/admin-shell-react'
import {
  ArrowUpRight,
  BarChart3,
  Clock,
  Package,
  ShoppingCart,
  Ticket,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export function Dashboard() {
  const { sdk } = useAdmin()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await sdk.api.get<any>('/dashboard/stats')
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [sdk])

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">營運總覽</h1>
        <p className="text-slate-500">歡迎回來，這是您今日的商店數據摘要</p>
      </div>

      {/* 數據指標卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="今日營收"
          value={`$${stats.todayRevenue.toLocaleString()}`}
          trend={`+${stats.revenueTrend}%`}
          icon={<TrendingUp className="text-emerald-600" />}
          color="bg-emerald-50"
        />
        <StatCard
          title="待處理訂單"
          value={stats.pendingOrders}
          icon={<ShoppingCart className="text-amber-600" />}
          color="bg-amber-50"
        />
        <StatCard
          title="庫存預警"
          value={stats.lowStockItems}
          icon={<Package className="text-rose-600" />}
          color="bg-rose-50"
          isWarning={stats.lowStockItems > 0}
        />
        <StatCard
          title="活躍優惠券"
          value={stats.activeCoupons}
          icon={<Ticket className="text-indigo-600" />}
          color="bg-indigo-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：銷售趨勢 (模擬圖表) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-600" />
              最近 7 日銷售趨勢
            </h2>
            <select className="text-sm border-none bg-slate-50 rounded-lg px-2 py-1 outline-none text-slate-500">
              <option>本週</option>
              <option>上週</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-around gap-2 px-2">
            {[40, 70, 55, 90, 65, 80, 100].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className="w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-all rounded-t-lg relative"
                  style={{ height: `${h}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    ${(h * 500).toLocaleString()}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Day {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右側：最近活動 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Clock size={20} className="text-indigo-600" />
            最近系統動態
          </h2>
          <div className="space-y-5">
            <ActivityItem
              time="10 分鐘前"
              title="新訂單 #ORD-9921"
              desc="客戶 Carl 已完成支付 $1,250"
              icon={<div className="w-2 h-2 rounded-full bg-emerald-500" />}
            />
            <ActivityItem
              time="45 分鐘前"
              title="商品庫存告急"
              desc="iPhone 16 Pro 剩餘 2 件"
              icon={<div className="w-2 h-2 rounded-full bg-rose-500" />}
            />
            <ActivityItem
              time="2 小時前"
              title="新會員註冊"
              desc="Alice 加入了會員系統"
              icon={<div className="w-2 h-2 rounded-full bg-indigo-500" />}
            />
            <ActivityItem
              time="Yesterday"
              title="優惠券已過期"
              desc="XMAS2024 活動已結束"
              icon={<div className="w-2 h-2 rounded-full bg-slate-300" />}
            />
          </div>
          <button
            type="button"
            className="w-full mt-6 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            查看完整日誌
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, trend, icon, color, isWarning }: any) {
  return (
    <div
      className={`p-6 bg-white rounded-2xl border ${isWarning ? 'border-rose-200 ring-4 ring-rose-50' : 'border-slate-200'} shadow-sm group hover:shadow-md transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center text-emerald-600 text-xs font-bold gap-0.5 bg-emerald-50 px-2 py-1 rounded-lg">
            {trend}
            <ArrowUpRight size={14} />
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-slate-500 text-sm font-medium">{title}</div>
        <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      </div>
    </div>
  )
}

function ActivityItem({ time, title, desc, icon }: any) {
  return (
    <div className="flex gap-4">
      <div className="mt-1.5">{icon}</div>
      <div>
        <div className="text-sm font-bold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
        <div className="text-[10px] text-slate-400 mt-1 font-medium">{time}</div>
      </div>
    </div>
  )
}
