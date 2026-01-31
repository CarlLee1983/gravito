<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import AdminLayout from '../../../components/AdminLayout.vue'

defineOptions({ layout: AdminLayout })

const props = defineProps<{
  order: any
  user: any
  statusOptions: string[]
}>()

const selectedStatus = ref(props.order.status)
const isUpdating = ref(false)

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

const updateStatus = async () => {
  if (selectedStatus.value === props.order.status) {
    return
  }
  isUpdating.value = true
  try {
    await fetch(`/admin/orders/${props.order.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: selectedStatus.value }),
    })
    router.reload()
  } finally {
    isUpdating.value = false
  }
}
</script>

<template>
  <Head :title="`訂單 ${order.order_number}`" />

  <div>
    <div class="flex items-center gap-4 mb-6">
      <Link href="/admin/orders" class="btn btn-ghost">
        <span class="i-heroicons-arrow-left"></span>
        返回
      </Link>
      <h1 class="heading-1">訂單詳情</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Order Info -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Order Summary -->
        <div class="card p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <p class="text-sm text-gray-500">訂單編號</p>
              <p class="font-mono font-bold text-lg">{{ order.order_number }}</p>
            </div>
            <div class="flex items-center gap-2">
              <select v-model="selectedStatus" class="input w-32 text-sm">
                <option v-for="status in statusOptions" :key="status" :value="status">
                  {{ statusLabels[status] }}
                </option>
              </select>
              <button
                @click="updateStatus"
                :disabled="isUpdating || selectedStatus === order.status"
                class="btn btn-sm btn-primary"
              >
                更新
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-500">建立時間</p>
              <p>{{ new Date(order.created_at).toLocaleString('zh-TW') }}</p>
            </div>
            <div>
              <p class="text-gray-500">Stripe Session</p>
              <p class="font-mono text-xs truncate">{{ order.stripe_session_id || '-' }}</p>
            </div>
          </div>
        </div>

        <!-- Order Items -->
        <div class="card p-6">
          <h2 class="heading-3 mb-4">訂單商品</h2>
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-2">商品</th>
                <th class="text-right py-2">單價</th>
                <th class="text-right py-2">數量</th>
                <th class="text-right py-2">小計</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in order.items" :key="item.product_id" class="border-b border-gray-100 dark:border-gray-700">
                <td class="py-3">{{ item.product_name }}</td>
                <td class="py-3 text-right price">{{ formatPrice(item.price) }}</td>
                <td class="py-3 text-right">{{ item.quantity }}</td>
                <td class="py-3 text-right price font-medium">{{ formatPrice(item.line_total) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="py-2 text-right text-gray-500">小計</td>
                <td class="py-2 text-right price">{{ formatPrice(order.subtotal) }}</td>
              </tr>
              <tr>
                <td colspan="3" class="py-2 text-right text-gray-500">運費</td>
                <td class="py-2 text-right">{{ formatPrice(order.shipping) }}</td>
              </tr>
              <tr class="font-bold text-lg">
                <td colspan="3" class="py-2 text-right">總計</td>
                <td class="py-2 text-right text-primary price">{{ order.formatted_total }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Customer & Address -->
      <div class="space-y-6">
        <!-- Customer -->
        <div class="card p-6">
          <h2 class="heading-3 mb-4">顧客資訊</h2>
          <div class="space-y-2 text-sm">
            <p><strong>姓名：</strong>{{ user.name }}</p>
            <p><strong>Email：</strong>{{ user.email }}</p>
          </div>
        </div>

        <!-- Shipping Address -->
        <div class="card p-6">
          <h2 class="heading-3 mb-4">配送地址</h2>
          <div v-if="order.shipping_address" class="space-y-1 text-sm">
            <p>{{ order.shipping_address.name }}</p>
            <p>{{ order.shipping_address.phone }}</p>
            <p>{{ order.shipping_address.postal_code }} {{ order.shipping_address.city }}</p>
            <p>{{ order.shipping_address.address }}</p>
          </div>
          <p v-else class="text-gray-500">無配送資訊</p>
        </div>

        <!-- Notes -->
        <div v-if="order.notes" class="card p-6">
          <h2 class="heading-3 mb-4">備註</h2>
          <p class="text-sm">{{ order.notes }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
