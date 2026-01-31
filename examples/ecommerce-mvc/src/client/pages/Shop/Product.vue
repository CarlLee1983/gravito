<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3'
import { ref } from 'vue'
import GImage from '../../components/GImage.vue'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

const props = defineProps<{
  product: any
  relatedProducts: any[]
  wishlistId: number | null
}>()

const quantity = ref(1)
const isAddingToCart = ref(false)
// Local state to track wishlist status immediately
const currentWishlistId = ref(props.wishlistId)
const isInWishlist = computed(() => !!currentWishlistId.value)

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

const toggleWishlist = async () => {
  if (currentWishlistId.value) {
    // Remove from wishlist
    router.delete(`/account/wishlist/${currentWishlistId.value}`, {
      preserveScroll: true,
      onSuccess: () => {
        currentWishlistId.value = null
      },
    })
  } else {
    // Add to wishlist
    router.post(
      '/account/wishlist',
      { product_id: props.product.id },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          // We need to get the new wishlist ID.
          // Since standard Inertia reload might be tricky if we don't pass it back in props instantly,
          // simpler is to just reload the page props or trust the reload.
          // Ideally, the controller store response should handle this, but Inertia form submission follows redirects.
          // let's just create a full reload or assume success and wait for reactive update if we used a form.
          // For now, let's force a partial reload to get updated props
          router.reload({
            only: ['wishlistId'],
            onSuccess: () => {
              // Update local state from new props if needed, but the watcher/computed handles it if structured right.
              // Actually, router.post automatically reloads props.
              // But we need to update currentWishlistId from the new prop value.
            },
          })
        },
      }
    )
  }
}

// Watch for prop changes to update local state (in case of reloads)
import { computed, watch } from 'vue'

watch(
  () => props.wishlistId,
  (newId) => {
    currentWishlistId.value = newId
  }
)

const discountPercent = () => {
  if (!props.product.compare_at_price) return 0
  return Math.round((1 - props.product.price / props.product.compare_at_price) * 100)
}
</script>

<template>
  <Head :title="product.name" />

  <div class="container py-12">
    <!-- Breadcrumb -->
    <nav class="flex items-center text-sm text-gray-500 mb-8 bg-white dark:bg-dark-surface py-3 px-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 w-fit">
      <a href="/" class="hover:text-primary transition-colors flex items-center gap-1">
        <span class="i-heroicons-home text-base"></span>
        首頁
      </a>
      <span class="i-heroicons-chevron-right text-gray-300 mx-2 text-xs"></span>
      <a href="/products" class="hover:text-primary transition-colors">商品</a>
      <template v-if="product.category_name">
        <span class="i-heroicons-chevron-right text-gray-300 mx-2 text-xs"></span>
        <a v-if="product.category_slug" :href="`/category/${product.category_slug}`" class="hover:text-primary transition-colors">
          {{ product.category_name }}
        </a>
      </template>
      <span class="i-heroicons-chevron-right text-gray-300 mx-2 text-xs"></span>
      <span class="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">{{ product.name }}</span>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
      <!-- Product Image -->
      <div class="group relative rounded-3xl overflow-hidden bg-white dark:bg-dark-surface shadow-2xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-white/5">
        <div class="aspect-square relative overflow-hidden">
          <GImage
            v-if="product.image_url"
            :src="product.image_url"
            :alt="product.name"
            class="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800">
            <span class="i-heroicons-photo text-9xl opacity-50"></span>
          </div>
        </div>
        
        <!-- Discount Badge -->
        <div v-if="product.compare_at_price" class="absolute top-6 left-6 z-10">
          <span class="badge bg-red-500 text-white px-4 py-1.5 text-sm font-bold shadow-lg shadow-red-500/30 rounded-full backdrop-blur-md">
            -{{ discountPercent() }}% OFF
          </span>
        </div>

        <div class="absolute top-6 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
             <button class="w-10 h-10 rounded-full bg-white dark:bg-gray-800 text-gray-400 hover:text-primary shadow-lg flex items-center justify-center transition-all hover:scale-110">
                <span class="i-heroicons-arrows-pointing-out text-xl"></span>
             </button>
        </div>
      </div>

      <!-- Product Info -->
      <div class="flex flex-col h-full justify-center">
        <h1 class="heading-1 mb-4 text-4xl lg:text-5xl">{{ product.name }}</h1>
        
        <div class="flex items-end gap-4 mb-8">
          <span class="text-4xl font-bold text-primary tracking-tight">{{ formatPrice(product.price) }}</span>
          <span v-if="product.compare_at_price" class="text-xl text-gray-400 line-through decoration-2 decoration-gray-300 mb-1.5">
            {{ formatPrice(product.compare_at_price) }}
          </span>
        </div>

        <!-- Stock Status -->
        <div class="mb-8">
          <span v-if="product.stock > 10" class="inline-flex items-center gap-1.5 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-100 dark:border-green-900/30">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            庫存充足
          </span>
          <span v-else-if="product.stock > 0" class="inline-flex items-center gap-1.5 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-medium border border-yellow-100 dark:border-yellow-900/30">
            <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
            僅剩 {{ product.stock }} 件
          </span>
          <span v-else class="inline-flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-1 rounded-full text-sm font-medium border border-red-100 dark:border-red-900/30">
             <span class="w-2 h-2 rounded-full bg-red-500"></span>
             缺貨中
          </span>
        </div>

        <!-- Description -->
        <div v-if="product.description" class="prose prose-lg dark:prose-invert mb-10 text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>{{ product.description }}</p>
        </div>

        <div class="border-t border-gray-100 dark:border-gray-800 my-8"></div>

        <!-- Add to Cart -->
        <div class="flex flex-col sm:flex-row gap-5">
          <div class="flex items-center bg-gray-50 dark:bg-dark-surfaceHighlight rounded-xl border border-gray-200 dark:border-gray-700 w-fit sm:w-auto">
            <button
              @click="quantity = Math.max(1, quantity - 1)"
              class="p-4 hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-gray-500"
              :disabled="quantity <= 1"
            >
              <span class="i-heroicons-minus text-lg"></span>
            </button>
            <input
              v-model="quantity"
              type="number"
              min="1"
              :max="product.stock"
              class="w-16 text-center border-0 focus:ring-0 bg-transparent text-lg font-bold text-gray-900 dark:text-white p-0"
            />
            <button
              @click="quantity = Math.min(product.stock, quantity + 1)"
              class="p-4 hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-gray-500"
              :disabled="quantity >= product.stock"
            >
              <span class="i-heroicons-plus text-lg"></span>
            </button>
          </div>

          <div class="flex flex-1 gap-3">
            <button
              @click="addToCart"
              :disabled="product.stock === 0 || isAddingToCart"
              class="btn btn-primary btn-lg flex-1 shadow-xl shadow-primary/20 hover:shadow-primary/40 text-lg"
            >
              <span v-if="isAddingToCart" class="i-heroicons-arrow-path animate-spin mr-2"></span>
              <span v-else class="i-heroicons-shopping-bag text-2xl mr-2"></span>
              {{ product.stock === 0 ? '缺貨中' : '加入購物車' }}
            </button>
            
            <button 
               @click="toggleWishlist" 
               class="btn btn-outline btn-lg w-16 flex items-center justify-center !px-0 border-gray-200 dark:border-gray-700 hover:border-red-500 hover:text-red-500 dark:hover:border-red-500"
               :class="{ '!text-red-500 !border-red-200 !bg-red-50 dark:!bg-red-900/20 dark:!border-red-900': isInWishlist }"
            >
               <span :class="isInWishlist ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'" class="text-2xl transition-transform active:scale-90"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Products -->
    <section v-if="relatedProducts.length > 0" class="mt-24 border-t border-gray-100 dark:border-gray-800 pt-16">
      <div class="flex items-center justify-between mb-10">
        <h2 class="heading-2">相關商品</h2>
        <a href="/products" class="text-primary hover:text-primary-600 font-medium flex items-center gap-1">
          更多商品 <span class="i-heroicons-arrow-right text-sm"></span>
        </a>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <a
          v-for="item in relatedProducts"
          :key="item.id"
          :href="`/products/${item.slug}`"
          class="card card-hover group"
        >
          <div class="aspect-[4/5] bg-gray-50 dark:bg-gray-800 overflow-hidden relative">
            <GImage
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.name"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <span class="i-heroicons-photo text-4xl opacity-50"></span>
            </div>
            
             <div class="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button class="btn btn-sm bg-white/90 backdrop-blur text-gray-900 w-full shadow-lg font-bold hover:bg-primary hover:text-white">Quick View</button>
             </div>
          </div>
          <div class="p-5">
            <h3 class="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">{{ item.name }}</h3>
            <span class="text-lg font-bold text-primary">{{ formatPrice(item.price) }}</span>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>
