<script setup lang="ts">
import Layout from '../../components/Layout.vue'
import { Head } from '@inertiajs/vue3'
</script>

<template>
  <Layout>
    <Head title="運送政策" />
    
    <div class="bg-white dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            運送政策
          </h1>
          <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
            了解我們的配送方式、運費計算及預計送達時間。
          </p>
        </div>

        <div class="prose prose-lg dark:prose-invert mx-auto">
          <!-- Shipping Methods -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 mb-8 shadow-sm">
            <h2 class="flex items-center text-2xl font-bold mb-6 text-gray-900 dark:text-white mt-0">
              <span class="i-heroicons-truck text-primary mr-3 text-3xl"></span>
              配送方式與運費
            </h2>
            
            <div class="grid md:grid-cols-2 gap-6">
              <div class="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-100 dark:border-gray-600">
                <h3 class="font-bold text-lg mb-2 text-gray-900 dark:text-white">宅配到府</h3>
                <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">由專業物流公司配送，快速安全。</p>
                <div class="flex justify-between items-center border-t border-gray-100 dark:border-gray-600 pt-4">
                  <span class="font-medium text-gray-500 dark:text-gray-400">運費</span>
                  <span class="text-lg font-bold text-primary">NT$ 100</span>
                </div>
              </div>

              <div class="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-100 dark:border-gray-600">
                <h3 class="font-bold text-lg mb-2 text-gray-900 dark:text-white">超商取貨</h3>
                <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">7-11 / 全家 / 萊爾富，24hr 隨時取。</p>
                <div class="flex justify-between items-center border-t border-gray-100 dark:border-gray-600 pt-4">
                  <span class="font-medium text-gray-500 dark:text-gray-400">運費</span>
                  <span class="text-lg font-bold text-primary">NT$ 60</span>
                </div>
              </div>
            </div>

            <div class="mt-6 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg flex items-start">
              <span class="i-heroicons-information-circle text-blue-500 text-xl mt-0.5 mr-3 flex-shrink-0"></span>
              <p class="text-sm text-blue-700 dark:text-blue-200 m-0">
                <strong>免運優惠：</strong> 全館單筆消費滿 <strong>NT$ 1,000</strong> 即可享有免運費服務（包含宅配與超商取貨）。
              </p>
            </div>
          </div>

          <!-- Processing Time -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">出貨時間</h2>
            <ul class="space-y-4 text-gray-600 dark:text-gray-300">
              <li class="flex items-start">
                <span class="i-heroicons-check-circle text-green-500 mt-1 mr-3 flex-shrink-0"></span>
                <span><strong>現貨商品：</strong> 完成付款後，約 1-2 個工作天內出貨（不含週六日及國定假日）。</span>
              </li>
              <li class="flex items-start">
                <span class="i-heroicons-clock text-orange-500 mt-1 mr-3 flex-shrink-0"></span>
                <span><strong>預購商品：</strong> 需等待追貨，約 7-14 個工作天出貨。若遇原廠缺貨，將另行通知。</span>
              </li>
              <li class="flex items-start">
                <span class="i-heroicons-calendar text-primary mt-1 mr-3 flex-shrink-0"></span>
                <span><strong>配送時程：</strong> 出貨後，宅配約 1-2 天送達；超商取貨約 2-3 天送達指定門市。</span>
              </li>
            </ul>
          </div>

          <!-- International Shipping -->
          <div>
            <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">國際運送</h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              我們目前提供部分亞洲地區的國際配送服務（香港、澳門、新加坡、馬來西亞）。
            </p>
            <p class="text-gray-600 dark:text-gray-300">
              國際運費將根據包裹重量與目的地計算，結帳時系統會自動顯示。請注意，國際包裹可能會產生關稅，此費用需由收件人自行負擔。
            </p>
          </div>

          <div class="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
              * Gravito Shop 保留隨時修改運送政策的權利，如有變動將於網站公告，恕不另行通知。
            </p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
