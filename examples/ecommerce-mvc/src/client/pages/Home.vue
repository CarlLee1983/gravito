<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import Layout from '../components/Layout.vue'
import GImage from '../components/GImage.vue'
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
  <!-- Hero Section -->
  <section class="relative bg-gray-900 text-white overflow-hidden py-24 sm:py-32">
    <!-- Abstract Background Pattern -->
    <div class="absolute inset-0 z-0 opacity-30">
        <svg class="h-full w-full text-primary-900" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
        </svg>
    </div>
    <div class="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-0"></div>
    <div class="absolute inset-0 bg-grid-white/[0.05] bg-[length:32px_32px] z-10"></div>
    <div class="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-primary-500/30 rounded-full blur-3xl z-0"></div>
    <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-secondary-500/20 rounded-full blur-3xl z-0"></div>

    <div class="container relative z-20 text-center max-w-4xl mx-auto px-4">
      <Link 
        href="/pages/news" 
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-6 backdrop-blur-sm animate-fade-in-up hover:bg-white/20 transition-colors group"
      >
        <span class="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
        {{ t('home.hero_badge') }}
        <span class="i-heroicons-chevron-right text-xs opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"></span>
      </Link>
      <h1 class="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight gradient-text bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 font-display">
        <template v-if="t('home.hero_title').includes('，')">
          {{ t('home.hero_title').split('，')[0] }}，<br class="hidden md:block" />{{ t('home.hero_title').split('，')[1] }}
        </template>
        <template v-else>
          {{ t('home.hero_title') }}
        </template>
      </h1>
      <p class="text-xl md:text-2xl mb-10 text-gray-300 font-light max-w-2xl mx-auto">
        {{ t('home.hero_subtitle') }}
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link href="/products" class="btn btn-lg bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-xl shadow-white/10 border-0 font-bold px-8">
          {{ t('home.start_shopping') }}
          <span class="i-heroicons-shopping-bag ml-2 text-xl"></span>
        </Link>
        <Link href="/pages/news" class="btn btn-lg bg-gray-800/50 text-white border border-gray-700 hover:bg-gray-800 hover:border-gray-600 backdrop-blur-sm">
          {{ t('home.learn_more') }}
          <span class="i-heroicons-newspaper ml-2"></span>
        </Link>
      </div>
    </div>
  </section>

  <!-- Latest News Highlight -->
  <section v-if="latestNews && latestNews.length > 0" class="bg-primary-50 dark:bg-gray-800/50 py-10 border-b border-gray-100 dark:border-gray-700">
    <div class="container">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
            <span class="i-heroicons-megaphone text-2xl"></span>
          </div>
          <div>
            <span class="text-xs font-bold text-primary uppercase tracking-wider">{{ t('news.categories.promotion') }}</span>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ latestNews[0].title }}</h3>
          </div>
        </div>
        <div class="flex items-center gap-6">
          <p class="hidden lg:block text-gray-600 dark:text-gray-400 text-sm max-w-md">
            {{ latestNews[0].excerpt }}
          </p>
          <Link href="/pages/news" class="btn btn-sm bg-white dark:bg-gray-800 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all whitespace-nowrap">
            {{ t('news.read_more') }}
          </Link>
        </div>
      </div>
    </div>
  </section>

  <!-- Categories -->
  <section class="section bg-white dark:bg-gray-800">
    <div class="container">
      <h2 class="heading-2 text-center mb-8">{{ t('home.categories') }}</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <a
          v-for="category in categories"
          :key="category.id"
          :href="`/category/${category.slug}`"
          class="card card-hover overflow-hidden text-center group"
        >
          <div class="h-40 overflow-hidden">
            <GImage 
              v-if="category.image_url" 
              :src="category.image_url" 
              :alt="category.name"
              class="group-hover:scale-110"
            />
            <div v-else class="w-full h-full bg-primary-100 text-primary flex items-center justify-center">
              <span class="i-heroicons-tag text-4xl"></span>
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-semibold">{{ category.name }}</h3>
            <p class="text-sm text-gray-500">{{ t('home.items_count', { count: category.product_count || 0 }) }}</p>
          </div>
        </a>
      </div>
    </div>
  </section>

  <!-- Featured Products -->
  <section v-if="featuredProducts.length > 0" id="featured" class="section">
    <div class="container">
      <h2 class="heading-2 text-center mb-8">{{ t('home.featured_products') }}</h2>
      <div class="product-grid">
        <a
          v-for="product in featuredProducts"
          :key="product.id"
          :href="`/products/${product.slug}`"
          class="card card-hover product-card"
        >
          <div class="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <GImage
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              class="product-card-image"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              <span class="i-heroicons-photo text-4xl"></span>
            </div>
          </div>
          <div class="p-4">
            <p class="text-sm text-gray-500 mb-1">{{ product.category_name }}</p>
            <h3 class="font-semibold mb-2 line-clamp-2">{{ product.name }}</h3>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-primary price">{{ formatPrice(product.price) }}</span>
              <span v-if="product.compare_at_price" class="text-sm price-old">
                {{ formatPrice(product.compare_at_price) }}
              </span>
            </div>
          </div>
        </a>
      </div>
    </div>
  </section>

  <!-- Latest Products -->
  <section class="section bg-gray-50 dark:bg-gray-800">
    <div class="container">
      <div class="flex items-center justify-between mb-8">
        <h2 class="heading-2">{{ t('home.latest_products') }}</h2>
        <Link href="/products" class="text-primary hover:underline">{{ t('home.view_all') }} →</Link>
      </div>
      <div class="product-grid">
        <a
          v-for="product in latestProducts"
          :key="product.id"
          :href="`/products/${product.slug}`"
          class="card card-hover product-card bg-white dark:bg-gray-700"
        >
          <div class="aspect-square bg-gray-100 dark:bg-gray-600 overflow-hidden">
            <GImage
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              class="product-card-image"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              <span class="i-heroicons-photo text-4xl"></span>
            </div>
          </div>
          <div class="p-4">
            <p class="text-sm text-gray-500 mb-1">{{ product.category_name }}</p>
            <h3 class="font-semibold mb-2 line-clamp-2">{{ product.name }}</h3>
            <span class="text-lg font-bold text-primary price">{{ formatPrice(product.price) }}</span>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
