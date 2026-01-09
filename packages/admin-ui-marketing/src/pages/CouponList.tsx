import { useAdmin } from '@gravito/admin-shell-react'
import { Clock, Edit2, Plus, Search, Tag, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export function CouponList() {
  const { sdk } = useAdmin()
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sdk.api.get<any[]>('/marketing/coupons')
      setCoupons(data)
    } catch (err) {
      console.error('Failed to fetch coupons', err)
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">優惠券管理</h1>
          <p className="text-slate-500">建立折扣代碼、設定使用門檻與追蹤領取狀況</p>
        </div>
        <button
          type="button"
          className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
        >
          <Plus size={18} />
          建立優惠券
        </button>
      </div>

      {/* 搜尋 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="搜尋折扣代碼或名稱..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-white transition-all"
        />
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-widest font-bold text-slate-400">
            <tr>
              <th className="px-6 py-4">折扣詳情</th>
              <th className="px-6 py-4">折扣類型</th>
              <th className="px-6 py-4">使用門檻</th>
              <th className="px-6 py-4">已用次數 / 上限</th>
              <th className="px-6 py-4">有效期限</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [1, 2].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-10 bg-white" />
                </tr>
              ))
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                  尚未建立優惠券
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 border border-rose-100">
                        <Tag size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-mono tracking-wider">
                          {coupon.code}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{coupon.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">
                      {coupon.type === 'PERCENTAGE'
                        ? `${coupon.value}% OFF`
                        : `折抵 $${coupon.value}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-600">
                      {coupon.minPurchase > 0 ? `低消 $${coupon.minPurchase}` : '無門檻'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users size={12} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{coupon.usedCount}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-sm text-slate-400">{coupon.usageLimit || '∞'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <Clock size={10} /> {new Date(coupon.startsAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold">
                        <Clock size={10} /> {new Date(coupon.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
