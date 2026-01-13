<script setup lang="ts">
import Layout from '../../components/Layout.vue'
import { ref, computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const faqs = computed(() => [
  {
    question: t('faq.q1'),
    answer: t('faq.a1')
  },
  {
    question: t('faq.q2'),
    answer: t('faq.a2')
  },
  {
    question: t('faq.q3'),
    answer: t('faq.a3')
  },
  {
    question: t('faq.q4'),
    answer: t('faq.a4')
  },
  {
    question: t('faq.q5'),
    answer: t('faq.a5')
  },
  {
    question: t('faq.q6'),
    answer: t('faq.a6')
  }
])

const activeIndex = ref<number | null>(0)

const toggle = (index: number) => {
  activeIndex.value = activeIndex.value === index ? null : index
}
</script>

<template>
  <Layout>
    <Head :title="t('faq.title')" />
    
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            {{ t('faq.title') }}
          </h1>
          <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
            {{ t('faq.subtitle') }}
          </p>
        </div>

        <dl class="space-y-6 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="(faq, index) in faqs" :key="index" class="pt-6">
            <dt class="text-lg">
              <button
                type="button"
                class="text-left w-full flex justify-between items-start text-gray-400 focus:outline-none focus:text-gray-900 dark:focus:text-white"
                @click="toggle(index)"
              >
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ faq.question }}
                </span>
                <span class="ml-6 h-7 flex items-center">
                  <span
                    class="transform transition-transform duration-200 i-heroicons-chevron-down text-xl"
                    :class="{ '-rotate-180': activeIndex === index }"
                  ></span>
                </span>
              </button>
            </dt>
            <transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-out"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <dd v-show="activeIndex === index" class="mt-2 pr-12">
                <p class="text-base text-gray-500 dark:text-gray-300 leading-relaxed">
                  {{ faq.answer }}
                </p>
              </dd>
            </transition>
          </div>
        </dl>
        
        <div class="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ t('faq.no_answer') }}
          </h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {{ t('faq.contact_team') }}
          </p>
          <div class="mt-6">
            <a
              href="/pages/contact"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {{ t('footer.contact_us') }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
