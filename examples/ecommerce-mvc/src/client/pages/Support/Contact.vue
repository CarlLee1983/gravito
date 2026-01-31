<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3'
import Layout from '../../components/Layout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const form = useForm({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const submit = () => {
  // Demo submission - in a real app this would post to a controller
  alert(`${t('contact.thank_you')}\n\n${t('contact.demo_notice')}`)
  form.reset()
}
</script>

<template>
  <Layout>
    <Head :title="t('contact.title')" />
    
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            {{ t('contact.title') }}
          </h1>
          <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
            {{ t('contact.subtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Contact Info -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 flex flex-col justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ t('contact.info_title') }}</h2>
              <div class="space-y-6">
                <div class="flex items-start">
                  <span class="i-heroicons-envelope text-primary text-2xl mt-1 mr-4"></span>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">Email</h3>
                    <p class="text-gray-500 dark:text-gray-400">support@gravito.dev</p>
                    <p class="text-xs text-gray-400 mt-1">{{ t('contact.email_desc') }}</p>
                  </div>
                </div>
                
                <div class="flex items-start">
                  <span class="i-heroicons-phone text-primary text-2xl mt-1 mr-4"></span>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">{{ t('contact.phone_title') }}</h3>
                    <p class="text-gray-500 dark:text-gray-400">+886 2 2345 6789</p>
                    <p class="text-xs text-gray-400 mt-1">{{ t('contact.phone_desc') }}</p>
                  </div>
                </div>

                <div class="flex items-start">
                  <span class="i-heroicons-map-pin text-primary text-2xl mt-1 mr-4"></span>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">{{ t('contact.address_title') }}</h3>
                    <p class="text-gray-500 dark:text-gray-400">{{ t('contact.address_value') }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-12">
              <h3 class="font-medium text-gray-900 dark:text-white mb-4">{{ t('contact.follow_us') }}</h3>
              <div class="flex space-x-4">
                <a href="#" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors">
                  <span class="i-simple-icons-facebook text-xl"></span>
                </a>
                <a href="#" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors">
                  <span class="i-simple-icons-instagram text-xl"></span>
                </a>
                <a href="#" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors">
                  <span class="i-simple-icons-twitter text-xl"></span>
                </a>
              </div>
            </div>
          </div>

          <!-- Contact Form -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ t('contact.form_title') }}</h2>
            <form @submit.prevent="submit" class="space-y-6">
              <div>
                <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('auth.name') }}</label>
                <input
                  type="text"
                  id="name"
                  v-model="form.name"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                  :placeholder="t('contact.placeholder_name')"
                >
              </div>

              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('auth.email') }}</label>
                <input
                  type="email"
                  id="email"
                  v-model="form.email"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                  :placeholder="t('contact.placeholder_email')"
                >
              </div>

              <div>
                <label for="subject" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('common.search') }}</label>
                <select
                  id="subject"
                  v-model="form.subject"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                >
                  <option value="" disabled>{{ t('contact.placeholder_subject') }}</option>
                  <option value="order">{{ t('contact.subject_order') }}</option>
                  <option value="product">{{ t('contact.subject_product') }}</option>
                  <option value="return">{{ t('contact.subject_order') }}</option>
                  <option value="other">{{ t('contact.subject_other') }}</option>
                </select>
              </div>

              <div>
                <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('contact.form_title') }}</label>
                <textarea
                  id="message"
                  v-model="form.message"
                  rows="4"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                  :placeholder="t('contact.placeholder_message')"
                ></textarea>
              </div>

              <div>
                <button
                  type="submit"
                  :disabled="form.processing"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                >
                  {{ t('common.send') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
