<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'

defineOptions({ layout: Layout })

defineProps<{
  wishlists: any[]
}>()

const formatPrice = (price: string) => price

const remove = (id: number) => {
  if (confirm('確定要從收藏清單移除嗎？')) {
    router.delete(`/account/wishlist/${id}`)
  }
}
</script>

<template>
  <Head title="收藏清單" />

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
                <a href="/account/orders" class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-shopping-bag text-xl"></span> 訂單紀錄
                </a>
                <span class="flex items-center gap-3 px-4 py-3 text-primary bg-primary-50 dark:bg-primary-900/20 rounded-xl font-medium transition-colors">
                  <span class="i-heroicons-heart text-xl"></span> 收藏清單
                </span>
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
                    <span class="i-heroicons-heart text-primary text-xl block"></span>
                  </span>
                  收藏清單
                </h1>
            </div>

            <div v-if="wishlists.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="item in wishlists"
                :key="item.id"
                class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group relative"
              >
                <!-- Remove Button -->
                <button 
                    @click.prevent="remove(item.id)"
                    class="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-900/80 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10 backdrop-blur-sm shadow-sm"
                >
                    <span class="i-heroicons-trash text-lg block"></span>
                </button>

                <Link :href="`/products/${item.product.slug}`" class="block h-full flex flex-col">
                    <GImage
                        v-if="item.product.image_url"
                        :src="item.product.image_url"
                        :alt="item.product.name"
                        wrapperClass="rounded-xl mb-4"
                        class="group-hover:scale-105 transition-transform duration-500"
                    />
                    <div v-else class="aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-4 relative flex items-center justify-center text-gray-400">
                        <span class="i-heroicons-photo text-4xl"></span>
                    </div>
                    
                    <div class="flex-1 flex flex-col">
                        <h3 class="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">{{ item.product.name }}</h3>
                        <p class="text-primary font-bold mt-auto">{{ item.product.formatted_price }}</p>
                    </div>
                </Link>
                
                <button class="w-full mt-4 btn btn-outline btn-sm rounded-xl hover:bg-primary hover:border-primary hover:text-white group/btn">
                    <span class="i-heroicons-shopping-cart mr-2 group-hover/btn:animate-bounce"></span> 加入購物車
                </button>
              </div>
            </div>

            <div v-else class="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <div class="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span class="i-heroicons-heart text-3xl text-gray-300 dark:text-gray-500"></span>
              </div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-2">您的收藏清單是空的</h2>
              <p class="text-gray-500 dark:text-gray-400 mb-6 text-sm">看到喜歡的商品，別忘了按愛心收藏喔！</p>
              <Link href="/products" class="btn btn-primary px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40">
                 去逛逛
              </Link>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
