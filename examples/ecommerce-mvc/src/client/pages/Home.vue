<script setup lang="ts">
import Layout from '../components/Layout.vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

defineOptions({ layout: Layout })

defineProps<{
  featuredProducts: any[]
  latestProducts: any[]
  categories: any[]
  latestNews?: any[]
}>()

const formatPrice = (price: number) => `NT$ ${(price / 100).toLocaleString()}`
</script>

<template>
  <Head :title="t('home.title')" />

  <!-- Hero Section -->
  <section class="relative bg-dark-bg text-white overflow-hidden py-24 sm:py-32 isolate">
    <!-- Abstract Background Pattern -->
    <div class="absolute inset-0 -z-10 opacity-40">
        <svg class="h-full w-full text-primary-900/50" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
        </svg>
    </div>
    <div class="absolute inset-0 bg-gradient-to-br from-dark-bg via-dark-surface to-primary-900/40 -z-10"></div>
    <div class="absolute inset-0 bg-grid-white/[0.03] bg-[length:40px_40px] -z-10"></div>
    <div class="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-primary-500/20 rounded-full blur-[100px] -z-10 animate-pulse"></div>
    <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-secondary-500/10 rounded-full blur-[100px] -z-10"></div>

    <div class="container relative z-20 text-center max-w-5xl mx-auto px-4">
      <Link 
        href="/pages/news" 
        class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium mb-8 backdrop-blur-md animate-fade-in-up hover:bg-white/10 hover:border-white/20 transition-all group shadow-lg shadow-black/20"
      >
        <span class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-500"></span>
        </span>
        {{ t('home.hero_badge') }}
        <span class="i-heroicons-chevron-right text-xs opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"></span>
      </Link>

      <h1 class="heading-1 mb-6 gradient-text bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400 drop-shadow-sm">
        <template v-if="t('home.hero_title').includes('，')">
          {{ t('home.hero_title').split('，')[0] }}，<br class="hidden md:block" />{{ t('home.hero_title').split('，')[1] }}
        </template>
        <template v-else>
          {{ t('home.hero_title') }}
        </template>
      </h1>

      <p class="text-xl md:text-2xl mb-12 text-gray-300/90 font-light max-w-3xl mx-auto leading-relaxed">
        {{ t('home.hero_subtitle') }}
      </p>

      <div class="flex flex-col sm:flex-row gap-5 justify-center items-center">
        <Link href="/products" class="btn btn-lg btn-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 px-10">
          {{ t('home.start_shopping') }}
          <span class="i-heroicons-shopping-bag ml-2 text-xl"></span>
        </Link>
        <Link href="/pages/news" class="btn btn-lg bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md">
          {{ t('home.learn_more') }}
          <span class="i-heroicons-arrow-right ml-2 text-sm group-hover:translate-x-1 transition-transform"></span>
        </Link>
      </div>
    </div>
  </section>

  <!-- Latest News Highlight -->
  <section v-if="latestNews && latestNews.length > 0" class="relative -mt-8 z-30">
    <div class="container px-4 sm:px-6">
      <div class="bg-white dark:bg-dark-surface/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/5 border border-gray-100 dark:border-white/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-5 w-full md:w-auto">
          <div class="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary/20">
            <span class="i-heroicons-megaphone text-2xl md:text-3xl"></span>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full uppercase tracking-wider">{{ t('news.categories.promotion') }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Just Now</span>
            </div>
            <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white line-clamp-1">{{ latestNews[0].title }}</h3>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <p class="hidden lg:block text-gray-600 dark:text-gray-400 text-sm max-w-md line-clamp-2">
            {{ latestNews[0].excerpt }}
          </p>
          <Link href="/pages/news" class="btn btn-outline text-sm hover:bg-primary hover:border-primary hover:text-white dark:border-gray-600 dark:text-gray-300 w-full sm:w-auto whitespace-nowrap">
            {{ t('news.read_more') }}
          </Link>
        </div>
      </div>
    </div>
  </section>

  <!-- Categories -->
  <section class="section bg-gray-50 dark:bg-dark-bg">
    <div class="container">
      <div class="text-center mb-12">
        <h2 class="heading-2 mb-3">{{ t('home.categories') }}</h2>
        <p class="text-body max-w-2xl mx-auto">Browse our diverse collection of high-quality products.</p>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <a
          v-for="category in categories"
          :key="category.id"
          :href="`/category/${category.slug}`"
          class="group relative overflow-hidden rounded-2xl bg-white dark:bg-dark-surface shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 block aspect-[4/5]"
        >
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-10 opacity-60 group-hover:opacity-80 transition-opacity"></div>
          
          <div class="h-full w-full overflow-hidden">
            <GImage 
              v-if="category.image_url" 
              :src="category.image_url" 
              :alt="category.name"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div v-else class="w-full h-full bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 flex items-center justify-center">
              <span class="i-heroicons-tag text-5xl"></span>
            </div>
          </div>
          
          <div class="absolute bottom-0 left-0 right-0 p-5 z-20 text-white transform transition-transform duration-300">
            <h3 class="font-display font-bold text-xl mb-1 group-hover:text-primary-300 transition-colors">{{ category.name }}</h3>
            <p class="text-sm text-gray-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              {{ t('home.items_count', { count: category.product_count || 0 }) }}
              <span class="i-heroicons-arrow-right text-xs"></span>
            </p>
          </div>
        </a>
      </div>
    </div>
  </section>

  <!-- Featured Products -->
  <section v-if="featuredProducts.length > 0" id="featured" class="section bg-white dark:bg-dark-surface relative overflow-hidden">
    <!-- Decorative blobs -->
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
    
    <div class="container">
      <div class="flex items-end justify-between mb-10">
        <div>
          <h2 class="heading-2 mb-2">{{ t('home.featured_products') }}</h2>
          <p class="text-body">Hand-picked selections just for you.</p>
        </div>
        <Link href="/products" class="hidden sm:flex items-center gap-1 text-primary hover:text-primary-700 font-medium transition-colors group">
          {{ t('home.view_all') }} 
          <span class="i-heroicons-arrow-right group-hover:translate-x-1 transition-transform"></span>
        </Link>
      </div>

      <div class="product-grid">
        <a
          v-for="product in featuredProducts"
          :key="product.id"
          :href="`/products/${product.slug}`"
          class="card card-hover group"
        >
          <div class="aspect-[4/5] bg-gray-50 dark:bg-gray-800 overflow-hidden relative">
            <div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button class="w-8 h-8 rounded-full bg-white dark:bg-gray-700 text-gray-500 hover:text-red-500 shadow-md flex items-center justify-center transition-colors">
                <span class="i-heroicons-heart text-lg"></span>
              </button>
            </div>
            
            <GImage
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              class="product-card-image h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <span class="i-heroicons-photo text-4xl"></span>
            </div>
            
            <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center">
              <button class="btn btn-sm bg-white text-gray-900 font-bold shadow-lg hover:bg-primary hover:text-white w-full">
                Add to Cart
              </button>
            </div>
          </div>
          <div class="card-body">
            <p class="text-xs font-semibold text-primary uppercase tracking-wide mb-1">{{ product.category_name }}</p>
            <h3 class="font-display font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">{{ product.name }}</h3>
            <div class="flex items-center justify-between mt-3">
              <div class="flex flex-col">
                <span class="text-lg font-bold text-gray-900 dark:text-white">{{ formatPrice(product.price) }}</span>
                <span v-if="product.compare_at_price" class="text-sm text-gray-400 line-through">
                  {{ formatPrice(product.compare_at_price) }}
                </span>
              </div>
              <div class="flex gap-1">
                <span v-for="i in 5" :key="i" class="i-heroicons-star text-yellow-400 text-xs"></span>
              </div>
            </div>
          </div>
        </a>
      </div>
      
      <div class="mt-8 text-center sm:hidden">
        <Link href="/products" class="btn btn-outline w-full justify-center">{{ t('home.view_all') }}</Link>
      </div>
    </div>
  </section>

  <!-- Latest Products -->
  <section class="section bg-gray-50 dark:bg-dark-bg">
    <div class="container">
      <div class="flex items-center justify-between mb-10">
        <h2 class="heading-2">{{ t('home.latest_products') }}</h2>
        <Link href="/products" class="hidden sm:flex items-center gap-1 text-primary hover:text-primary-700 font-medium transition-colors group">
          {{ t('home.view_all') }} 
          <span class="i-heroicons-arrow-right group-hover:translate-x-1 transition-transform"></span>
        </Link>
      </div>
      
      <div class="product-grid">
        <a
          v-for="product in latestProducts"
          :key="product.id"
          :href="`/products/${product.slug}`"
          class="card card-hover group bg-white dark:bg-dark-surface"
        >
          <div class="aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden relative">
            <GImage
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              class="product-card-image h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <span class="i-heroicons-photo text-4xl"></span>
            </div>
          </div>
          <div class="p-5">
            <p class="text-xs text-gray-500 mb-1">{{ product.category_name }}</p>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3 line-clamp-1 group-hover:text-primary transition-colors">{{ product.name }}</h3>
            <span class="text-lg font-bold text-primary">{{ formatPrice(product.price) }}</span>
          </div>
        </a>
      </div>
      
      <div class="mt-8 text-center sm:hidden">
        <Link href="/products" class="btn btn-outline w-full justify-center">{{ t('home.view_all') }}</Link>
      </div>
    </div>
  </section>
</template>
