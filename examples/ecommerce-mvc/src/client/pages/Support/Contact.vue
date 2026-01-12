<script setup lang="ts">
import Layout from '../../components/Layout.vue'
import { Head, useForm } from '@inertiajs/vue3'

const form = useForm({
  name: '',
  email: '',
  subject: '',
  message: ''
})

const submit = () => {
  // Demo submission - in a real app this would post to a controller
  alert('感謝您的來訊！我們會儘快回覆您。\n\n(此為示範頁面，實際上未發送郵件)')
  form.reset()
}
</script>

<template>
  <Layout>
    <Head title="聯絡我們" />
    
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            聯絡我們
          </h1>
          <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
            有任何問題或建議？歡迎隨時與我們聯繫。
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Contact Info -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 flex flex-col justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">聯絡資訊</h2>
              <div class="space-y-6">
                <div class="flex items-start">
                  <span class="i-heroicons-envelope text-primary text-2xl mt-1 mr-4"></span>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">Email</h3>
                    <p class="text-gray-500 dark:text-gray-400">support@gravito.dev</p>
                    <p class="text-xs text-gray-400 mt-1">一般於 24 小時內回覆</p>
                  </div>
                </div>
                
                <div class="flex items-start">
                  <span class="i-heroicons-phone text-primary text-2xl mt-1 mr-4"></span>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">客服專線</h3>
                    <p class="text-gray-500 dark:text-gray-400">+886 2 2345 6789</p>
                    <p class="text-xs text-gray-400 mt-1">週一至週五 09:00 - 18:00</p>
                  </div>
                </div>

                <div class="flex items-start">
                  <span class="i-heroicons-map-pin text-primary text-2xl mt-1 mr-4"></span>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">公司地址</h3>
                    <p class="text-gray-500 dark:text-gray-400">台北市信義區信義路五段7號 (台北101大樓)</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-12">
              <h3 class="font-medium text-gray-900 dark:text-white mb-4">追蹤我們</h3>
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
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">傳送訊息</h2>
            <form @submit.prevent="submit" class="space-y-6">
              <div>
                <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">姓名</label>
                <input
                  type="text"
                  id="name"
                  v-model="form.name"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                  placeholder="您的姓名"
                >
              </div>

              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  id="email"
                  v-model="form.email"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                  placeholder="name@example.com"
                >
              </div>

              <div>
                <label for="subject" class="block text-sm font-medium text-gray-700 dark:text-gray-300">主旨</label>
                <select
                  id="subject"
                  v-model="form.subject"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                >
                  <option value="" disabled>請選擇主旨</option>
                  <option value="order">訂單問題</option>
                  <option value="product">商品諮詢</option>
                  <option value="return">退換貨申請</option>
                  <option value="other">其他建議</option>
                </select>
              </div>

              <div>
                <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300">訊息內容</label>
                <textarea
                  id="message"
                  v-model="form.message"
                  rows="4"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                  placeholder="請詳細描述您的問題..."
                ></textarea>
              </div>

              <div>
                <button
                  type="submit"
                  :disabled="form.processing"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                >
                  送出訊息
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
