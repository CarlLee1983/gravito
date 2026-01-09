import { useAdmin } from '@gravito/admin-shell-react'
import { AlertTriangle, Edit2, ExternalLink, Package, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export function ProductList() {
  const { sdk } = useAdmin()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sdk.api.get<any[]>('/catalog/products')
      setProducts(data)
    } catch (err) {
      console.error('Failed to fetch products', err)
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 text-balance">商品目錄管理</h1>
          <p className="text-slate-500">維護全店商品、價格、規格與庫存狀態</p>
        </div>
        <button
          type="button"
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={18} />
          上架新商品
        </button>
      </div>

      {/* 快捷篩選區 */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜尋商品名稱、SKU 或編號..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all"
          />
        </div>
        <select className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white font-medium text-slate-600">
          <option>所有分類</option>
          <option>電子產品</option>
          <option>服飾配件</option>
        </select>
        <select className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white font-medium text-slate-600">
          <option>所有狀態</option>
          <option>販售中</option>
          <option>已下架</option>
          <option>庫存告急</option>
        </select>
      </div>

      {/* 商品表格 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-widest font-bold text-slate-400">
            <tr>
              <th className="px-6 py-4">商品資訊</th>
              <th className="px-6 py-4">價格</th>
              <th className="px-6 py-4">庫存</th>
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
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                  尚未建立任何商品
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden">
                        <Package size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {product.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">
                          ID: {product.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">
                      ${product.price.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${product.stock < 10 ? 'text-rose-600' : 'text-slate-600'}`}
                      >
                        {product.stock}
                      </span>
                      {product.stock < 10 && (
                        <AlertTriangle size={12} className="text-rose-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        product.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {product.status === 'active' ? '販售中' : '已下架'}
                    </span>
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
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        <ExternalLink size={16} />
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
