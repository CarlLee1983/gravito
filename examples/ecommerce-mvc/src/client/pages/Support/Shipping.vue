<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <Layout>
    <Head :title="t('shipping.title')" />
    
    <div class="bg-white dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            {{ t('shipping.title') }}
          </h1>
          <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
            {{ t('shipping.subtitle') }}
          </p>
        </div>

        <div class="prose prose-lg dark:prose-invert mx-auto">
          <!-- Shipping Methods -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 mb-8 shadow-sm">
            <h2 class="flex items-center text-2xl font-bold mb-6 text-gray-900 dark:text-white mt-0">
              <span class="i-heroicons-truck text-primary mr-3 text-3xl"></span>
              {{ t('shipping.methods_title') }}
            </h2>
            
            <div class="grid md:grid-cols-2 gap-6">
              <div class="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-100 dark:border-gray-600">
                <h3 class="font-bold text-lg mb-2 text-gray-900 dark:text-white">{{ t('shipping.home_delivery') }}</h3>
                <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">{{ t('shipping.home_delivery_desc') }}</p>
                <div class="flex justify-between items-center border-t border-gray-100 dark:border-gray-600 pt-4">
                  <span class="font-medium text-gray-500 dark:text-gray-400">{{ t('common.price') }}</span>
                  <span class="text-lg font-bold text-primary">NT$ 100</span>
                </div>
              </div>

              <div class="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-100 dark:border-gray-600">
                <h3 class="font-bold text-lg mb-2 text-gray-900 dark:text-white">{{ t('shipping.store_pickup') }}</h3>
                <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">{{ t('shipping.store_pickup_desc') }}</p>
                <div class="flex justify-between items-center border-t border-gray-100 dark:border-gray-600 pt-4">
                  <span class="font-medium text-gray-500 dark:text-gray-400">{{ t('common.price') }}</span>
                  <span class="text-lg font-bold text-primary">NT$ 60</span>
                </div>
              </div>
            </div>

            <div class="mt-6 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg flex items-start">
              <span class="i-heroicons-information-circle text-blue-500 text-xl mt-0.5 mr-3 flex-shrink-0"></span>
              <p class="text-sm text-blue-700 dark:text-blue-200 m-0">
                <strong>{{ t('shipping.free_shipping_title') }}</strong> {{ t('shipping.free_shipping_desc') }}
              </p>
            </div>
          </div>

          <!-- Processing Time -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{{ t('shipping.processing_title') }}</h2>
            <ul class="space-y-4 text-gray-600 dark:text-gray-300">
              <li class="flex items-start">
                <span class="i-heroicons-check-circle text-green-500 mt-1 mr-3 flex-shrink-0"></span>
                <span><strong>{{ t('shipping.stock_item') }}</strong> {{ t('shipping.stock_item_desc') }}</span>
              </li>
              <li class="flex items-start">
                <span class="i-heroicons-clock text-orange-500 mt-1 mr-3 flex-shrink-0"></span>
                <span><strong>{{ t('shipping.preorder_item') }}</strong> {{ t('shipping.preorder_item_desc') }}</span>
              </li>
              <li class="flex items-start">
                <span class="i-heroicons-calendar text-primary mt-1 mr-3 flex-shrink-0"></span>
                <span><strong>{{ t('shipping.timeline_title') }}</strong> {{ t('shipping.timeline_desc') }}</span>
              </li>
            </ul>
          </div>

          <!-- International Shipping -->
          <div>
            <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{{ t('shipping.international_title') }}</h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              {{ t('shipping.international_desc1') }}
            </p>
            <p class="text-gray-600 dark:text-gray-300">
              {{ t('shipping.international_desc2') }}
            </p>
          </div>

          <div class="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
              {{ t('shipping.disclaimer') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
