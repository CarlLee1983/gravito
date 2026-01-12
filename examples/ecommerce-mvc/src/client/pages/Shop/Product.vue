<script setup lang="ts">
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'
import GImage from '../../components/GImage.vue'

defineOptions({ layout: Layout })

const props = defineProps<{
  product: any
  relatedProducts: any[]
}>()

const quantity = ref(1)
const isAddingToCart = ref(false)

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`

const addToCart = async () => {
  isAddingToCart.value = true
  try {
    const response = await fetch('/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: props.product.id, quantity: quantity.value }),
    })
    const data = await response.json()
    if (data.success) {
      // Refresh page to update cart count
      router.reload({ only: ['cart'] })
    }
  } catch (error) {
    console.error('Error adding to cart:', error)
  } finally {
    isAddingToCart.value = false
  }
}

const discountPercent = () => {
  if (!props.product.compare_at_price) return 0
  return Math.round((1 - props.product.price / props.product.compare_at_price) * 100)
}
</script>

<template>
  <Head :title="product.name" />

  <div class="container py-8">
    <!-- Breadcrumb -->
    <nav class="text-sm text-gray-500 mb-6">
      <a href="/" class="hover:text-primary">首頁</a>
      <span class="mx-2">/</span>
      <a href="/products" class="hover:text-primary">商品</a>
      <span v-if="product.category_name" class="mx-2">/</span>
      <a v-if="product.category_slug" :href="`/category/${product.category_slug}`" class="hover:text-primary">
        {{ product.category_name }}
      </a>
      <span class="mx-2">/</span>
      <span class="text-gray-900 dark:text-white">{{ product.name }}</span>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <!-- Product Image -->
      <div class="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden relative">
        <GImage
          v-if="product.image_url"
          :src="product.image_url"
          :alt="product.name"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
          <span class="i-heroicons-photo text-8xl"></span>
        </div>
        
        <!-- Discount Badge -->
        <div v-if="product.compare_at_price" class="absolute top-4 left-4">
          <span class="badge bg-red-500 text-white px-3 py-1">-{{ discountPercent() }}%</span>
        </div>
      </div>

      <!-- Product Info -->
      <div>
        <h1 class="heading-1 mb-4">{{ product.name }}</h1>
        
        <div class="flex items-center gap-4 mb-6">
          <span class="text-3xl font-bold text-primary price">{{ formatPrice(product.price) }}</span>
          <span v-if="product.compare_at_price" class="text-xl price-old">
            {{ formatPrice(product.compare_at_price) }}
          </span>
        </div>

        <!-- Stock Status -->
        <div class="mb-6">
          <span v-if="product.stock > 10" class="badge badge-success">庫存充足</span>
          <span v-else-if="product.stock > 0" class="badge badge-warning">僅剩 {{ product.stock }} 件</span>
          <span v-else class="badge badge-danger">缺貨中</span>
        </div>

        <!-- Description -->
        <div v-if="product.description" class="prose dark:prose-invert mb-8">
          <p>{{ product.description }}</p>
        </div>

        <!-- Add to Cart -->
        <div class="flex items-center gap-4">
          <div class="flex items-center border border-gray-300 rounded-lg">
            <button
              @click="quantity = Math.max(1, quantity - 1)"
              class="p-3 hover:bg-gray-100 dark:hover:bg-gray-700"
              :disabled="quantity <= 1"
            >
              <span class="i-heroicons-minus"></span>
            </button>
            <input
              v-model="quantity"
              type="number"
              min="1"
              :max="product.stock"
              class="w-16 text-center border-0 focus:ring-0"
            />
            <button
              @click="quantity = Math.min(product.stock, quantity + 1)"
              class="p-3 hover:bg-gray-100 dark:hover:bg-gray-700"
              :disabled="quantity >= product.stock"
            >
              <span class="i-heroicons-plus"></span>
            </button>
          </div>

          <button
            @click="addToCart"
            :disabled="product.stock === 0 || isAddingToCart"
            class="btn btn-primary btn-lg flex-1"
          >
            <span v-if="isAddingToCart" class="spinner"></span>
            <span class="i-heroicons-shopping-cart"></span>
            {{ product.stock === 0 ? '缺貨中' : '加入購物車' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Related Products -->
    <section v-if="relatedProducts.length > 0" class="mt-16">
      <h2 class="heading-2 mb-8">相關商品</h2>
      <div class="product-grid">
        <a
          v-for="item in relatedProducts"
          :key="item.id"
          :href="`/products/${item.slug}`"
          class="card card-hover"
        >
          <div class="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <GImage
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.name"
            />
          </div>
          <div class="p-4">
            <h3 class="font-semibold mb-2 line-clamp-2">{{ item.name }}</h3>
            <span class="text-lg font-bold text-primary price">{{ formatPrice(item.price) }}</span>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>
