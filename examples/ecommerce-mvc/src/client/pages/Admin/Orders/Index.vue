<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import AdminLayout from '../../../components/AdminLayout.vue'

defineOptions({ layout: AdminLayout })

defineProps<{
  orders: any[]
  filters: { status: string }
  statusOptions: string[]
  pagination: { page: number; total: number; totalPages: number }
}>()

const statusFilter = ref('')

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

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

const filterByStatus = () => {
  router.get('/admin/orders', { status: statusFilter.value }, { preserveState: true })
}
</script>

<template>
  <Head title="訂單管理" />

  <div>
    <h1 class="heading-1 mb-6">訂單管理</h1>

    <!-- Filters -->
    <div class="card p-4 mb-6">
      <form @submit.prevent="filterByStatus" class="flex gap-4">
        <select v-model="statusFilter" class="input w-48">
          <option value="">全部狀態</option>
          <option v-for="status in statusOptions" :key="status" :value="status">
            {{ statusLabels[status] }}
          </option>
        </select>
        <button type="submit" class="btn btn-primary">篩選</button>
      </form>
    </div>

    <!-- Orders Table -->
    <div class="card overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-sm font-medium">訂單編號</th>
            <th class="px-6 py-3 text-left text-sm font-medium">顧客</th>
            <th class="px-6 py-3 text-left text-sm font-medium">金額</th>
            <th class="px-6 py-3 text-left text-sm font-medium">狀態</th>
            <th class="px-6 py-3 text-left text-sm font-medium">日期</th>
            <th class="px-6 py-3 text-right text-sm font-medium">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td class="px-6 py-4 font-mono text-sm">{{ order.order_number }}</td>
            <td class="px-6 py-4">
              <p class="font-medium">{{ order.user_name }}</p>
              <p class="text-sm text-gray-500">{{ order.user_email }}</p>
            </td>
            <td class="px-6 py-4 font-bold price">{{ order.formatted_total }}</td>
            <td class="px-6 py-4">
              <span :class="['badge', statusColors[order.status]]">{{ statusLabels[order.status] }}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ new Date(order.created_at).toLocaleDateString('zh-TW') }}
            </td>
            <td class="px-6 py-4 text-right">
              <Link :href="`/admin/orders/${order.id}`" class="btn btn-sm btn-ghost">查看</Link>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="orders.length === 0" class="p-8 text-center text-gray-500">尚無訂單</div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
      <Link
        v-for="p in pagination.totalPages"
        :key="p"
        :href="`/admin/orders?page=${p}&status=${filters.status}`"
        :class="['btn btn-sm', p === pagination.page ? 'btn-primary' : 'btn-ghost']"
      >
        {{ p }}
      </Link>
    </div>
  </div>
</template>
