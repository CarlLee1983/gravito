<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

defineProps<{
  orders: any[]
  pagination: { page: number; total: number; totalPages: number }
}>()

const statusLabels: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  processing: '處理中',
  shipped: '已出貨',
  delivered: '已送達',
  cancelled: '已取消',
  refunded: '已退款',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
}
</script>

<template>
  <Head title="訂單紀錄" />

  <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-10">
    <div class="container max-w-5xl">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Sidebar Navigation -->
        <div class="md:col-span-1 space-y-4">
           <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24">
              <nav class="space-y-1">
                <a href="/account/profile" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-user text-xl"></span> 基本資料
                </a>
                <span class="flex items-center gap-3 px-4 py-3 text-primary bg-primary-50 dark:bg-primary-900/20 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-shopping-bag text-xl"></span> 訂單紀錄
                </span>
                <a href="/account/wishlist" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-heart text-xl"></span> 收藏清單
                </a>
                <a href="/account/addresses" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-map-pin text-xl"></span> 收件地址
                </a>
              </nav>
           </div>
        </div>

        <!-- Main Content -->
        <div class="md:col-span-2">
           <div class="flex items-center justify-between mb-6">
                <h1 class="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                  <span class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <span class="i-heroicons-shopping-bag text-primary text-xl block"></span>
                  </span>
                  訂單紀錄
                </h1>
                
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex">
                   <button class="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white shadow-sm">全部</button>
                   <button class="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">處理中</button>
                   <button class="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">已完成</button>
                </div>
            </div>

            <div v-if="orders.length > 0" class="space-y-4">
              <Link
                v-for="order in orders"
                :key="order.id"
                :href="`/account/orders/${order.id}`"
                class="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 block relative overflow-hidden"
              >
                <!-- Hover Highlight -->
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <!-- Left: Order Info -->
                  <div class="space-y-1">
                    <div class="flex items-center gap-3">
                         <span class="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            #{{ order.order_number }}
                         </span>
                         <span class="text-xs text-gray-400">
                             {{ new Date(order.created_at).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }) }}
                         </span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{{ order.items_count || 1 }} 件商品</span>
                        <span>·</span>
                        <span class="font-bold text-gray-900 dark:text-white price">{{ order.formatted_total }}</span>
                    </div>
                  </div>

                  <!-- Right: Status & Action -->
                  <div class="flex items-center justify-between sm:justify-end gap-4">
                     <span 
                         class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
                         :class="[
                             statusColors[order.status] || 'bg-gray-50 border-gray-200 text-gray-600',
                             order.status === 'paid' ? 'border-green-200 dark:border-green-900' : 
                             order.status === 'pending' ? 'border-yellow-200 dark:border-yellow-900' : 'border-transparent'
                         ]"
                     >
                        <span class="w-1.5 h-1.5 rounded-full mr-2" :class="{
                            'bg-green-500': order.status === 'paid',
                            'bg-yellow-500': order.status === 'pending',
                            'bg-blue-500': order.status === 'processing',
                            'bg-gray-500': !['paid', 'pending', 'processing'].includes(order.status)
                        }"></span>
                        {{ order.status_label }}
                     </span>
                     
                     <span class="i-heroicons-chevron-right text-gray-400 group-hover:text-primary transition-colors"></span>
                  </div>
                </div>
              </Link>
            </div>

            <div v-else class="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <div class="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span class="i-heroicons-shopping-bag text-3xl text-gray-300 dark:text-gray-500"></span>
              </div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-2">尚無訂單紀錄</h2>
              <p class="text-gray-500 dark:text-gray-400 mb-6 text-sm">看起來你還沒買過任何東西，快去逛逛吧！</p>
              <Link href="/products" class="btn btn-primary px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40">
                 探索商品
              </Link>
            </div>

            <!-- Pagination -->
            <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-8">
              <Link
                v-for="p in pagination.totalPages"
                :key="p"
                :href="`/account/orders?page=${p}`"
                :class="[
                    'w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all',
                    p === pagination.page 
                        ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                ]"
              >
                {{ p }}
              </Link>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
