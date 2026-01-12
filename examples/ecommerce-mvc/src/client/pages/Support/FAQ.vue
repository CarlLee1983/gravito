<script setup lang="ts">
import Layout from '../../components/Layout.vue'
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'

const faqs = [
  {
    question: '請問運費如何計算？',
    answer: '我們的運費標準如下：全館消費滿 NT$1,000 即享免運優惠。未滿 NT$1,000 之訂單，宅配運費為 NT$100，超商取貨運費為 NT$60。'
  },
  {
    question: '下單後多久會出貨？',
    answer: '現貨商品將於下單後 1-2 個工作天內出貨。預購商品則需等待 7-14 個工作天（不含假日）。出貨後，宅配約 1-2 天送達，超商取貨約 2-3 天送達。'
  },
  {
    question: '可以更改訂單內容或取消訂單嗎？',
    answer: '若訂單狀態為「處理中」，您可以聯繫客服協助修改或取消。若訂單顯示「已出貨」，則無法進行修改。請在收到商品後辦理退換貨程序。'
  },
  {
    question: '收到商品有瑕疵怎麼辦？',
    answer: '非常抱歉！若您收到瑕疵或錯誤商品，請於 7 日鑑賞期內聯繫我們，並提供照片或影片。我們將會由專人為您安排免費退換貨服務。'
  },
  {
    question: '提供哪些付款方式？',
    answer: '我們目前接受信用卡（Visa, MasterCard, JCB）、LINE Pay、街口支付以及 ATM 轉帳。所有交易皆透過加密連線進行，確保您的資訊安全。'
  },
  {
    question: '是否有實體店面？',
    answer: '目前我們專注於線上銷售，以提供最優惠的價格給顧客。未來若有開設實體店面或快閃店的計畫，將會第一時間在官網與社群媒體公告。'
  }
]

const activeIndex = ref<number | null>(0)

const toggle = (index: number) => {
  activeIndex.value = activeIndex.value === index ? null : index
}
</script>

<template>
  <Layout>
    <Head title="常見問題" />
    
    <div class="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            常見問題
          </h1>
          <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
            這裡整理了顧客最常詢問的問題，希望能協助您解決疑惑。
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
            找不到您要的答案嗎？
          </h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            請隨時聯繫我們的客戶服務團隊，我們將竭誠為您服務。
          </p>
          <div class="mt-6">
            <a
              href="/pages/contact"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              聯絡我們
            </a>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
