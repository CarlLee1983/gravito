<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import Layout from '../../components/Layout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const steps = computed(() => [
  {
    title: t('returns.step1_title'),
    description: t('returns.step1_desc'),
    icon: 'i-heroicons-chat-bubble-left-right',
  },
  {
    title: t('returns.step2_title'),
    description: t('returns.step2_desc'),
    icon: 'i-heroicons-clipboard-document-check',
  },
  {
    title: t('returns.step3_title'),
    description: t('returns.step3_desc'),
    icon: 'i-heroicons-gift',
  },
  {
    title: t('returns.step4_title'),
    description: t('returns.step4_desc'),
    icon: 'i-heroicons-currency-dollar',
  },
])
</script>

<template>
  <Layout>
    <Head :title="t('returns.title')" />
    
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-16">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            {{ t('returns.title') }}
          </h1>
          <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
            {{ t('returns.subtitle') }}
          </p>
        </div>

        <!-- 7-Day Guarantee Banner -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-16 text-center transform hover:-translate-y-1 transition-transform duration-300">
          <div class="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <span class="i-heroicons-shield-check text-4xl text-primary"></span>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ t('returns.guarantee_title') }}</h2>
          <p class="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {{ t('returns.guarantee_desc') }}
            <br>
            <span class="text-xs text-gray-500 mt-2 block">{{ t('returns.guarantee_note') }}</span>
          </p>
        </div>

        <!-- Return Process Steps -->
        <div class="mb-16">
          <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-10">{{ t('returns.process_title') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div v-for="(step, index) in steps" :key="index" class="relative">
              <!-- Connector Line -->
              <div v-if="index < steps.length - 1" class="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200 dark:bg-gray-700"></div>
              
              <div class="relative flex flex-col items-center text-center z-10">
                <div class="w-16 h-16 bg-white dark:bg-gray-700 border-2 border-primary rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <span :class="step.icon" class="text-2xl text-primary"></span>
                </div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">{{ step.title }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{{ step.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Policy Details -->
        <div class="grid md:grid-cols-2 gap-8">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <span class="i-heroicons-x-circle text-red-500 mr-2"></span>
              {{ t('returns.invalid_title') }}
            </h3>
            <ul class="space-y-3 text-gray-600 dark:text-gray-300 text-sm">
              <li>• {{ t('returns.invalid_item1') }}</li>
              <li>• {{ t('returns.invalid_item2') }}</li>
              <li>• {{ t('returns.invalid_item3') }}</li>
              <li>• {{ t('returns.invalid_item4') }}</li>
              <li>• {{ t('returns.invalid_item5') }}</li>
            </ul>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <span class="i-heroicons-banknotes text-green-500 mr-2"></span>
              {{ t('returns.refund_title') }}
            </h3>
            <ul class="space-y-3 text-gray-600 dark:text-gray-300 text-sm">
              <li>
                <strong>{{ t('returns.credit_card') }}</strong>
                <span class="block text-gray-500 mt-1">{{ t('returns.credit_card_desc') }}</span>
              </li>
              <li>
                <strong>{{ t('returns.atm') }}</strong>
                <span class="block text-gray-500 mt-1">{{ t('returns.atm_desc') }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-12 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            {{ t('returns.still_questions') }}
          </p>
          <a
            href="/pages/contact"
            class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            {{ t('returns.contact_center') }}
          </a>
        </div>
      </div>
    </div>
  </Layout>
</template>
