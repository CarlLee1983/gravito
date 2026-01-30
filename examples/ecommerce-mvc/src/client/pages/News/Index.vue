<script setup lang="ts">
import Layout from '../../components/Layout.vue'
import { Head, Link } from '@inertiajs/vue3'
import { useI18n } from '../../composables/useI18n'
import GImage from '../../components/GImage.vue'

const { t } = useI18n()

interface NewsItem {
  id: number
  title: string
  date: string
  category: 'promotion' | 'new_arrival' | 'announcement'
  excerpt: string
  image: string
}

defineProps<{
  news: NewsItem[]
}>()

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'promotion':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'new_arrival':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'announcement':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
  }
}
</script>

<template>
  <Layout>
    <Head :title="t('news.title')" />
    
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-6 md:py-12 px-0 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-0">
        <!-- Header -->
        <div class="text-center mb-10 md:mb-16">
          <h1 class="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 md:mb-4">
            {{ t('news.title') }}
          </h1>
          <p class="text-base md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto px-2">
            {{ t('news.subtitle') }}
          </p>
        </div>

        <!-- News Grid -->
        <div v-if="news.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div 
            v-for="item in news" 
            :key="item.id"
            class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 group"
          >
            <!-- Image Spacer / Placeholder -->
            <div class="relative">
               <GImage
                 v-if="item.image"
                 :src="item.image"
                 :alt="item.title"
                 aspectRatio="16/9"
                 class="group-hover:scale-105 transition-transform duration-500"
               />
               <div v-else class="aspect-video bg-gray-200 dark:bg-gray-700 w-full h-full flex items-center justify-center text-gray-400">
                 <span class="i-heroicons-photo text-4xl"></span>
               </div>
               <div class="absolute top-4 left-4">
                 <span :class="['px-3 py-1 rounded-full text-xs font-semibold shadow-sm', getCategoryBadgeClass(item.category)]">
                   {{ t(`news.categories.${item.category}`) }}
                 </span>
               </div>
            </div>

            <!-- Content -->
            <div class="p-6">
              <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span class="i-heroicons-calendar mr-2 text-primary"></span>
                {{ item.date }}
              </div>
              <Link :href="`/pages/news/${item.id}`">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary transition-colors cursor-pointer">
                  {{ item.title }}
                </h2>
              </Link>
              <p class="text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
                {{ item.excerpt }}
              </p>
              
              <Link 
                :href="`/pages/news/${item.id}`" 
                class="inline-flex items-center font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                {{ t('news.read_more') }}
                <span class="i-heroicons-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></span>
              </Link>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
           <span class="i-heroicons-newspaper-20-solid text-6xl text-gray-300 dark:text-gray-600 mb-4"></span>
           <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('news.no_news') }}</h3>
        </div>
      </div>
    </div>
  </Layout>
</template>
