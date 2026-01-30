<script setup lang="ts">
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'
import GImage from '../../components/GImage.vue'

defineOptions({ layout: Layout })

const props = defineProps<{
  cart: {
    items: any[]
    subtotal: number
    shipping: number
    total: number
  }
}>()

const form = ref({
  name: '',
  phone: '',
  address: '',
  city: '',
  postal_code: '',
  notes: '',
})
const isLoading = ref(false)
const error = ref('')

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const submit = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await fetch('/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': decodeURIComponent(
          document.cookie
            .split('; ')
            .find((row) => row.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] || ''
        ),
      },
      body: JSON.stringify({
        shipping_address: {
          name: form.value.name,
          phone: form.value.phone,
          address: form.value.address,
          city: form.value.city,
          postal_code: form.value.postal_code,
        },
        notes: form.value.notes,
      }),
    })
    const data = await response.json()

    if (data.redirect_url) {
      // Redirect to the Order Detail page
      router.visit(data.redirect_url)
    } else if (data.error) {
      error.value = data.error
    }
  } catch (e: any) {
    error.value = e.message || '發生錯誤，請稍後再試'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Head title="結帳" />

  <div class="container py-8">
    <h1 class="heading-1 mb-8">結帳</h1>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Checkout Form -->
      <div class="lg:col-span-2">
        <form @submit.prevent="submit" class="card p-6 space-y-6">
          <h2 class="heading-3">配送資訊</h2>

          <div v-if="error" class="bg-red-100 text-red-700 p-4 rounded-lg">
            {{ error }}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="label" for="name">收件人姓名</label>
              <input id="name" v-model="form.name" type="text" class="input" required />
            </div>
            <div class="form-group">
              <label class="label" for="phone">電話</label>
              <input id="phone" v-model="form.phone" type="tel" class="input" required />
            </div>
          </div>

          <div class="form-group">
            <label class="label" for="address">地址</label>
            <input id="address" v-model="form.address" type="text" class="input" required />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="label" for="city">城市</label>
              <input id="city" v-model="form.city" type="text" class="input" required />
            </div>
            <div class="form-group">
              <label class="label" for="postal_code">郵遞區號</label>
              <input id="postal_code" v-model="form.postal_code" type="text" class="input" required />
            </div>
          </div>

          <div class="form-group">
            <label class="label" for="notes">備註 (選填)</label>
            <textarea id="notes" v-model="form.notes" class="input" rows="3"></textarea>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="btn btn-primary btn-lg w-full"
          >
            <span v-if="isLoading" class="spinner"></span>
            <span class="i-heroicons-credit-card"></span>
            前往付款
          </button>

          <p class="text-sm text-gray-500 text-center">
            點擊按鈕後將跳轉至 Stripe 安全付款頁面
          </p>
        </form>
      </div>

      <!-- Order Summary -->
      <div class="lg:col-span-1">
        <div class="card p-6 sticky top-24">
          <h2 class="heading-3 mb-4">訂單摘要</h2>
          
          <div class="space-y-4 mb-6">
            <div v-for="item in cart.items" :key="item.id" class="flex gap-3">
              <div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <GImage
                  v-if="item.product?.image_url"
                  :src="item.product.image_url"
                  :alt="item.product?.name"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="flex-1">
                <p class="font-medium text-sm line-clamp-2">{{ item.product?.name }}</p>
                <p class="text-gray-500 text-sm">x{{ item.quantity }}</p>
              </div>
              <p class="font-medium price text-sm">{{ formatPrice(item.line_total) }}</p>
            </div>
          </div>

          <hr class="border-gray-200 dark:border-gray-700 mb-4">

          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">小計</span>
              <span class="price">{{ formatPrice(cart.subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">運費</span>
              <span>{{ formatPrice(cart.shipping) }}</span>
            </div>
            <hr class="border-gray-200 dark:border-gray-700 my-2">
            <div class="flex justify-between text-lg font-bold">
              <span>總計</span>
              <span class="text-primary price">{{ formatPrice(cart.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
