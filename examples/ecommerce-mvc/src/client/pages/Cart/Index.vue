<script setup lang="ts">
import { ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'
import GImage from '../../components/GImage.vue'

defineOptions({ layout: Layout })

const props = defineProps<{
  cart: {
    id: number
    items: any[]
    item_count: number
    subtotal: number
  }
}>()

const isUpdating = ref<number | null>(null)

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const updateQuantity = async (itemId: number, quantity: number) => {
  isUpdating.value = itemId
  try {
    await fetch(`/cart/update/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    })
    router.reload()
  } finally {
    isUpdating.value = null
  }
}

const removeItem = async (itemId: number) => {
  isUpdating.value = itemId
  try {
    await fetch(`/cart/remove/${itemId}`, { method: 'DELETE' })
    router.reload()
  } finally {
    isUpdating.value = null
  }
}

const clearCart = async () => {
  if (!confirm('確定要清空購物車嗎？')) return
  await fetch('/cart/clear', { method: 'DELETE' })
  router.reload()
}
</script>

<template>
  <Head title="購物車" />

  <div class="container py-8">
    <h1 class="heading-1 mb-8">購物車</h1>

    <template v-if="cart.items.length > 0">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Cart Items -->
        <div class="lg:col-span-2 space-y-4">
          <div
            v-for="item in cart.items"
            :key="item.id"
            class="card p-4 flex gap-4"
          >
            <!-- Product Image -->
            <div class="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
              <GImage
                v-if="item.product?.image_url"
                :src="item.product.image_url"
                :alt="item.product?.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <span class="i-heroicons-photo text-2xl"></span>
              </div>
            </div>

            <!-- Product Info -->
            <div class="flex-1">
              <Link
                :href="`/products/${item.product?.slug}`"
                class="font-semibold hover:text-primary"
              >
                {{ item.product?.name }}
              </Link>
              <p class="text-primary font-bold price mt-1">{{ formatPrice(item.price) }}</p>
            </div>

            <!-- Quantity -->
            <div class="flex items-center gap-2">
              <button
                @click="updateQuantity(item.id, item.quantity - 1)"
                :disabled="isUpdating === item.id || item.quantity <= 1"
                class="p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <span class="i-heroicons-minus text-sm"></span>
              </button>
              <span class="w-8 text-center">{{ item.quantity }}</span>
              <button
                @click="updateQuantity(item.id, item.quantity + 1)"
                :disabled="isUpdating === item.id || item.quantity >= (item.product?.stock || 99)"
                class="p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <span class="i-heroicons-plus text-sm"></span>
              </button>
            </div>

            <!-- Line Total & Remove -->
            <div class="text-right">
              <p class="font-bold price">{{ formatPrice(item.line_total) }}</p>
              <button
                @click="removeItem(item.id)"
                :disabled="isUpdating === item.id"
                class="text-red-500 text-sm mt-2 hover:underline"
              >
                移除
              </button>
            </div>
          </div>

          <button
            @click="clearCart"
            class="btn btn-ghost text-red-500"
          >
            清空購物車
          </button>
        </div>

        <!-- Order Summary -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-24">
            <h2 class="heading-3 mb-4">訂單摘要</h2>
            
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">小計 ({{ cart.item_count }} 件)</span>
                <span class="font-medium price">{{ formatPrice(cart.subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">運費</span>
                <span class="font-medium">NT$ 60</span>
              </div>
              <hr class="border-gray-200 dark:border-gray-700">
              <div class="flex justify-between text-lg font-bold">
                <span>總計</span>
                <span class="text-primary price">{{ formatPrice(cart.subtotal + 6000) }}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              class="btn btn-primary w-full mt-6"
            >
              前往結帳
              <span class="i-heroicons-arrow-right"></span>
            </Link>

            <Link
              href="/products"
              class="btn btn-ghost w-full mt-2"
            >
              繼續購物
            </Link>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty Cart -->
    <template v-else>
      <div class="text-center py-16">
        <span class="i-heroicons-shopping-cart text-6xl text-gray-300 mx-auto mb-4"></span>
        <h2 class="heading-2 mb-2">購物車是空的</h2>
        <p class="text-gray-500 mb-6">快去逛逛吧！</p>
        <Link href="/products" class="btn btn-primary">
          探索商品
        </Link>
      </div>
    </template>
  </div>
</template>
