<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

interface NewsItem {
  id: number
  title: string
  date: string
  category: 'promotion' | 'new_arrival' | 'announcement'
  content: string
  image: string
}

defineProps<{
  item: NewsItem
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
    <Head :title="item.title" />
    
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-6 md:py-12 px-0 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-0">
        <!-- Breadcrumbs -->
        <nav class="flex mb-8 text-sm font-medium" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 md:space-x-3">
            <li class="inline-flex items-center">
              <Link href="/" class="text-gray-700 hover:text-primary dark:text-gray-400 dark:hover:text-white">
                {{ t('nav.home') }}
              </Link>
            </li>
            <li>
              <div class="flex items-center">
                <span class="i-heroicons-chevron-right mx-2 text-gray-400"></span>
                <Link href="/pages/news" class="text-gray-700 hover:text-primary dark:text-gray-400 dark:hover:text-white">
                  {{ t('news.title') }}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div class="flex items-center">
                <span class="i-heroicons-chevron-right mx-2 text-gray-400"></span>
                <span class="text-gray-500 dark:text-gray-400 line-clamp-1">
                  {{ item.title }}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <article class="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <!-- Featured Image -->
          <div class="relative">
            <GImage
              :src="item.image"
              :alt="item.title"
              aspectRatio="16/9"
              wrapperClass="sm:!aspect-auto sm:h-[400px]"
            />
            <div class="absolute top-4 left-4 md:top-6 md:left-6">
              <span :class="['px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-bold shadow-lg', getCategoryBadgeClass(item.category)]">
                {{ t(`news.categories.${item.category}`) }}
              </span>
            </div>
          </div>

          <!-- Content -->
          <div class="p-5 md:p-12">
            <div class="flex items-center text-gray-500 dark:text-gray-400 mb-4 md:mb-6 font-medium text-sm md:text-base">
              <span class="i-heroicons-calendar mr-2 text-primary text-lg md:text-xl"></span>
              {{ item.date }}
            </div>
            
            <h1 class="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-6 md:mb-8 leading-tight">
              {{ item.title }}
            </h1>

            <div class="prose prose-sm md:prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {{ item.content }}
            </div>

            <div class="mt-10 md:mt-16 pt-6 md:pt-8 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-6">
               <Link 
                href="/pages/news" 
                class="inline-flex items-center font-bold text-primary hover:text-primary-dark transition-all group w-full sm:w-auto justify-center sm:justify-start"
              >
                <span class="i-heroicons-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></span>
                {{ t('news.back_to_news') }}
              </Link>

              <div class="flex gap-4">
                <button class="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-primary hover:text-white transition-colors">
                  <span class="i-heroicons-share text-xl"></span>
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </Layout>
</template>
