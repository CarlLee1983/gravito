import { useAdmin } from '@gravito/admin-shell-react'
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export function InvoiceList() {
  const { sdk } = useAdmin()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sdk.api.get<any[]>('/invoices')
      setInvoices(data)
    } catch (err) {
      console.error('Failed to fetch invoices', err)
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'RETURNED':
        return 'bg-amber-50 text-amber-700 border-amber-100'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">電子發票管理</h1>
          <p className="text-slate-500">監控系統自動開立紀錄、統編發票與作廢流程</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchInvoices}
            className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-all"
            title="刷新數據"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Download size={18} />
            匯出媒體申報檔
          </button>
        </div>
      </div>

      {/* 搜尋區 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="搜尋發票號碼、訂單編號或統編..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all"
        />
      </div>

      {/* 發票表格 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-widest font-bold text-slate-400">
            <tr>
              <th className="px-6 py-4">發票資訊</th>
              <th className="px-6 py-4">關聯訂單</th>
              <th className="px-6 py-4">含稅金額 / 稅額</th>
              <th className="px-6 py-4">狀態</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-10 bg-white" />
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                  無發票開立紀錄
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-slate-600">
                      ORD-{inv.orderId.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">
                      ${inv.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      稅額: ${inv.tax.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(inv.status)}`}
                    >
                      {inv.status === 'ISSUED' && <CheckCircle2 size={12} />}
                      {inv.status === 'CANCELLED' && <XCircle size={12} />}
                      {inv.status === 'RETURNED' && <Clock size={12} />}
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="查看明細"
                    >
                      <Eye size={18} />
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
