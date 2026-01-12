<script setup lang="ts">
import Layout from '../../components/Layout.vue'
import { Head } from '@inertiajs/vue3'

const steps = [
  {
    title: '聯繫客服',
    description: '請在收到商品 7 日內，透過客服信件或聯絡表單提出申請，請註明訂單編號與退貨原因。',
    icon: 'i-heroicons-chat-bubble-left-right'
  },
  {
    title: '確認退貨',
    description: '客服人員確認您的退貨申請後，將提供一組退貨代碼或安排物流收件。',
    icon: 'i-heroicons-clipboard-document-check'
  },
  {
    title: '包裝商品',
    description: '請將商品保持全新未拆封狀態，連同發票及贈品完整包裝。',
    icon: 'i-heroicons-gift'
  },
  {
    title: '退款完成',
    description: '收到退貨商品並檢查無誤後，我們將於 7-10 個工作天內完成退款。',
    icon: 'i-heroicons-currency-dollar'
  }
]
</script>

<template>
  <Layout>
    <Head title="退換貨政策" />
    
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-16">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            退換貨政策
          </h1>
          <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
            購物無負擔，我們提供完善的售後保障。
          </p>
        </div>

        <!-- 7-Day Guarantee Banner -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-16 text-center transform hover:-translate-y-1 transition-transform duration-300">
          <div class="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <span class="i-heroicons-shield-check text-4xl text-primary"></span>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">7 日鑑賞期保證</h2>
          <p class="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Gravito Shop 提供 7 日鑑賞期。若您對商品不滿意，可在收到商品後 7 天內申請退貨，無需負擔任何費用。
            <br>
            <span class="text-xs text-gray-500 mt-2 block">(*鑑賞期非試用期，退回商品必須是全新狀態且包裝完整。)</span>
          </p>
        </div>

        <!-- Return Process Steps -->
        <div class="mb-16">
          <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-10">退貨流程</h2>
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
              無法辦理退貨的情況
            </h3>
            <ul class="space-y-3 text-gray-600 dark:text-gray-300 text-sm">
              <li>• 超過 7 天鑑賞期。</li>
              <li>• 商品已拆封使用（瑕疵品除外）。</li>
              <li>• 人為造成之髒污、毀損。</li>
              <li>• 發票、配件、贈品不齊全。</li>
              <li>• 貼身衣物（如內衣褲、襪子）基於衛生考量恕不退換。</li>
            </ul>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <span class="i-heroicons-banknotes text-green-500 mr-2"></span>
              退款說明
            </h3>
            <ul class="space-y-3 text-gray-600 dark:text-gray-300 text-sm">
              <li>
                <strong>信用卡付款：</strong>
                <span class="block text-gray-500 mt-1">直接刷退至原信用卡帳單，實際入帳時間依各發卡銀行規定。</span>
              </li>
              <li>
                <strong>ATM / 超商付款：</strong>
                <span class="block text-gray-500 mt-1">請提供退款帳戶資訊，款項將於 7-10 個工作天匯入指定帳戶。</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-12 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            還有其他問題嗎？
          </p>
          <a
            href="/pages/contact"
            class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            聯繫客服中心
          </a>
        </div>
      </div>
    </div>
  </Layout>
</template>
