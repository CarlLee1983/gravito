import { useAdmin } from '@gravito/admin-shell-react'
import { Calendar, ChevronRight, CreditCard, Filter, Search, Truck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export function OrderList() {
  const { sdk } = useAdmin()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      // 指向剛才建立的 commerce 衛星路由
      const data = await sdk.api.get<any[]>('/commerce/orders')
      setOrders(data)
    } catch (err) {
      console.error('Failed to fetch orders', err)
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const getStatusBadge = (status: string, type: 'payment' | 'shipping') => {
    if (type === 'payment') {
      return status === 'PAID'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : 'bg-slate-100 text-slate-500 border-slate-200'
    }
    // 物流狀態
    switch (status) {
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-700 border-blue-100'
      case 'DELIVERED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100'
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-100'
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">銷售訂單管理</h1>
          <p className="text-slate-500">處理全站訂單、金流狀態與追蹤發貨進度</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Calendar size={18} />
            匯出對帳單
          </button>
        </div>
      </div>

      {/* 搜尋與篩選 */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜尋訂單編號、姓名或手機..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all"
          />
        </div>
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-600 flex items-center gap-2"
        >
          <Filter size={18} />
          進階篩選
        </button>
      </div>

      {/* 訂單表格 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-widest font-bold text-slate-400">
            <tr>
              <th className="px-6 py-4">訂單編號 / 客戶</th>
              <th className="px-6 py-4">總額</th>
              <th className="px-6 py-4">支付狀態</th>
              <th className="px-6 py-4">配送狀態</th>
              <th className="px-6 py-4">下單時間</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-10 bg-white" />
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                  目前無訂單資料
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {order.id}
                      </div>
                      <div className="text-xs text-slate-400">{order.customerName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    ${order.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${getStatusBadge(order.paymentStatus, 'payment')}`}
                    >
                      <CreditCard size={10} />
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${getStatusBadge(order.shippingStatus, 'shipping')}`}
                    >
                      <Truck size={10} />
                      {order.shippingStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
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
